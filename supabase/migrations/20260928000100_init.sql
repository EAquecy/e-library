-- Lectern e-library: core schema
-- Roles: student, lecturer. One school. Mock payments for now.

create extension if not exists pgcrypto;

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student','lecturer')),
  student_id text,
  department text,
  bio text,
  session_rate numeric(10,2) not null default 50 check (session_rate >= 0),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, student_id, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when new.raw_user_meta_data->>'role' = 'lecturer' then 'lecturer' else 'student' end,
    nullif(new.raw_user_meta_data->>'student_id', ''),
    nullif(new.raw_user_meta_data->>'department', '')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Books ----------
create table public.books (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  course_code text,
  kind text not null default 'book' check (kind in ('book','handout')),
  cover_path text,
  file_path text not null,
  page_count int,
  buy_price numeric(10,2) check (buy_price is null or buy_price >= 0),
  rent_price numeric(10,2) check (rent_price is null or rent_price >= 0),
  rent_days int not null default 14 check (rent_days between 1 and 365),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  check (buy_price is not null or rent_price is not null)
);
create index on public.books (lecturer_id);

-- ---------- Entitlements (purchases + rentals) ----------
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('purchase','rental')),
  amount numeric(10,2) not null,
  payment_ref text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.entitlements (student_id, book_id);

-- ---------- Reading progress + bookmarks ----------
create table public.reading_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  current_page int not null default 1 check (current_page >= 1),
  updated_at timestamptz not null default now(),
  primary key (student_id, book_id)
);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  page int not null check (page >= 1),
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, book_id, page)
);

-- ---------- Discussions ----------
create table public.discussions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  lecturer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  page int,
  visibility text not null default 'public' check (visibility in ('public','private')),
  status text not null default 'pending' check (status in ('pending','approved','declined','closed')),
  created_at timestamptz not null default now()
);
create index on public.discussions (book_id);
create index on public.discussions (lecturer_id, status);

create table public.discussion_messages (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index on public.discussion_messages (discussion_id, created_at);

-- ---------- One-on-one consultations ----------
create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  lecturer_id uuid not null references public.profiles(id) on delete cascade,
  proposed_at timestamptz not null,
  duration_minutes int not null default 30 check (duration_minutes in (30,60)),
  fee numeric(10,2) not null,
  status text not null default 'requested' check (status in ('requested','confirmed','declined','completed','cancelled')),
  paid boolean not null default false,
  payment_ref text,
  meeting_link text,
  lecturer_note text,
  created_at timestamptz not null default now()
);
create index on public.consultations (lecturer_id, status);
create index on public.consultations (student_id);

-- ---------- Helpers ----------
create or replace function public.has_book_access(p_book uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from books b where b.id = p_book and b.lecturer_id = auth.uid())
      or exists (
        select 1 from entitlements e
        where e.book_id = p_book and e.student_id = auth.uid()
          and (e.kind = 'purchase' or e.expires_at > now())
      );
$$;

create or replace function public.can_see_discussion(p_disc uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from discussions d
    where d.id = p_disc and (
      d.student_id = auth.uid() or d.lecturer_id = auth.uid()
      or (d.visibility = 'public' and d.status in ('approved','closed') and public.has_book_access(d.book_id))
    )
  );
$$;

-- ---------- Mock payments ----------
create or replace function public.mock_checkout(p_book uuid, p_kind text)
returns public.entitlements language plpgsql security definer set search_path = public as $$
declare b books; e entitlements; price numeric; exp timestamptz; existing_exp timestamptz;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if (select role from profiles where id = auth.uid()) <> 'student' then
    raise exception 'Only students can buy or rent';
  end if;
  select * into b from books where id = p_book and published;
  if not found then raise exception 'Book not found'; end if;

  if p_kind = 'purchase' then
    if b.buy_price is null then raise exception 'This title is not for sale'; end if;
    if exists (select 1 from entitlements where book_id = p_book and student_id = auth.uid() and kind = 'purchase') then
      raise exception 'You already own this title';
    end if;
    price := b.buy_price; exp := null;
  elsif p_kind = 'rental' then
    if b.rent_price is null then raise exception 'This title is not for rent'; end if;
    if exists (select 1 from entitlements where book_id = p_book and student_id = auth.uid() and kind = 'purchase') then
      raise exception 'You already own this title';
    end if;
    -- Extending an active rental stacks on top of its current expiry
    select max(expires_at) into existing_exp from entitlements
      where book_id = p_book and student_id = auth.uid() and kind = 'rental' and expires_at > now();
    price := b.rent_price;
    exp := coalesce(existing_exp, now()) + make_interval(days => b.rent_days);
  else
    raise exception 'Invalid kind';
  end if;

  insert into entitlements (book_id, student_id, kind, amount, payment_ref, expires_at)
  values (p_book, auth.uid(), p_kind, price, 'MOCK-' || upper(substr(md5(random()::text), 1, 10)), exp)
  returning * into e;
  return e;
end $$;

-- ---------- Discussion workflow ----------
create or replace function public.open_discussion(p_book uuid, p_title text, p_page int, p_visibility text, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare d_id uuid; lect uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not public.has_book_access(p_book) then raise exception 'Buy or rent this title to open a discussion'; end if;
  select lecturer_id into lect from books where id = p_book;
  if lect = auth.uid() then raise exception 'Lecturers answer discussions, they do not open them'; end if;
  if p_visibility not in ('public','private') then raise exception 'Invalid visibility'; end if;
  insert into discussions (book_id, student_id, lecturer_id, title, page, visibility)
  values (p_book, auth.uid(), lect, left(p_title, 200), p_page, p_visibility)
  returning id into d_id;
  if coalesce(trim(p_body), '') <> '' then
    insert into discussion_messages (discussion_id, author_id, body) values (d_id, auth.uid(), p_body);
  end if;
  return d_id;
end $$;

create or replace function public.set_discussion_status(p_disc uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('approved','declined','closed') then raise exception 'Invalid status'; end if;
  update discussions set status = p_status where id = p_disc and lecturer_id = auth.uid();
  if not found then raise exception 'Not allowed'; end if;
end $$;

create or replace function public.set_discussion_visibility(p_disc uuid, p_visibility text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_visibility not in ('public','private') then raise exception 'Invalid visibility'; end if;
  update discussions set visibility = p_visibility where id = p_disc and student_id = auth.uid();
  if not found then raise exception 'Only the student who opened this discussion can change it'; end if;
end $$;

-- ---------- Consultation workflow ----------
create or replace function public.request_consultation(p_disc uuid, p_when timestamptz, p_minutes int)
returns uuid language plpgsql security definer set search_path = public as $$
declare d discussions; rate numeric; c_id uuid;
begin
  select * into d from discussions where id = p_disc and student_id = auth.uid();
  if not found then raise exception 'Not allowed'; end if;
  if d.visibility <> 'private' then raise exception 'Make the discussion private to book a one-on-one session'; end if;
  if d.status <> 'approved' then raise exception 'The lecturer must approve the discussion first'; end if;
  if p_when < now() then raise exception 'Pick a time in the future'; end if;
  if p_minutes not in (30,60) then raise exception 'Sessions are 30 or 60 minutes'; end if;
  select session_rate into rate from profiles where id = d.lecturer_id;
  insert into consultations (discussion_id, student_id, lecturer_id, proposed_at, duration_minutes, fee)
  values (p_disc, auth.uid(), d.lecturer_id, p_when, p_minutes, round(rate * p_minutes / 30.0, 2))
  returning id into c_id;
  return c_id;
end $$;

create or replace function public.respond_consultation(p_id uuid, p_status text, p_link text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('confirmed','declined','completed') then raise exception 'Invalid status'; end if;
  update consultations
     set status = p_status,
         meeting_link = coalesce(nullif(trim(p_link), ''), meeting_link),
         lecturer_note = coalesce(nullif(trim(p_note), ''), lecturer_note)
   where id = p_id and lecturer_id = auth.uid();
  if not found then raise exception 'Not allowed'; end if;
end $$;

create or replace function public.mock_pay_consultation(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update consultations
     set paid = true, payment_ref = 'MOCK-' || upper(substr(md5(random()::text), 1, 10))
   where id = p_id and student_id = auth.uid() and status = 'confirmed' and not paid;
  if not found then raise exception 'Nothing to pay'; end if;
end $$;

create or replace function public.cancel_consultation(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update consultations set status = 'cancelled'
   where id = p_id and student_id = auth.uid() and status in ('requested','confirmed') and not paid;
  if not found then raise exception 'Cannot cancel'; end if;
end $$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.entitlements enable row level security;
alter table public.reading_progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.discussions enable row level security;
alter table public.discussion_messages enable row level security;
alter table public.consultations enable row level security;

create policy "profiles readable by signed-in users" on public.profiles
  for select to authenticated using (true);
-- role is fixed at sign-up; users may edit other fields
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

create policy "published books are visible" on public.books
  for select to authenticated using (published or lecturer_id = auth.uid());
create policy "lecturers add own books" on public.books
  for insert to authenticated
  with check (lecturer_id = auth.uid() and (select role from public.profiles where id = auth.uid()) = 'lecturer');
create policy "lecturers edit own books" on public.books
  for update to authenticated using (lecturer_id = auth.uid()) with check (lecturer_id = auth.uid());
create policy "lecturers delete own books" on public.books
  for delete to authenticated using (lecturer_id = auth.uid());

create policy "see own or own-book entitlements" on public.entitlements
  for select to authenticated using (
    student_id = auth.uid()
    or exists (select 1 from public.books b where b.id = book_id and b.lecturer_id = auth.uid())
  );

create policy "own progress" on public.reading_progress
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid() and public.has_book_access(book_id));

create policy "own bookmarks" on public.bookmarks
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid() and public.has_book_access(book_id));

create policy "visible discussions" on public.discussions
  for select to authenticated using (public.can_see_discussion(id));

create policy "visible messages" on public.discussion_messages
  for select to authenticated using (public.can_see_discussion(discussion_id));
create policy "post in approved discussions" on public.discussion_messages
  for insert to authenticated with check (
    author_id = auth.uid()
    and public.can_see_discussion(discussion_id)
    and exists (select 1 from public.discussions d where d.id = discussion_id and d.status = 'approved')
  );

create policy "parties see consultations" on public.consultations
  for select to authenticated using (student_id = auth.uid() or lecturer_id = auth.uid());

-- ---------- Storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('books', 'books', false, 52428800, array['application/pdf']),
       ('covers', 'covers', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "lecturers upload to own folder (books)" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'books' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "lecturers manage own files (books)" on storage.objects
  for delete to authenticated
  using (bucket_id = 'books' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read book file with access" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'books' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.books b where b.file_path = name and public.has_book_access(b.id))
    )
  );

create policy "lecturers upload covers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "lecturers delete covers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Realtime for chat ----------
alter publication supabase_realtime add table public.discussion_messages;

-- Lock down function execution to signed-in users
revoke execute on function public.mock_checkout(uuid, text) from public, anon;
revoke execute on function public.open_discussion(uuid, text, int, text, text) from public, anon;
revoke execute on function public.set_discussion_status(uuid, text) from public, anon;
revoke execute on function public.set_discussion_visibility(uuid, text) from public, anon;
revoke execute on function public.request_consultation(uuid, timestamptz, int) from public, anon;
revoke execute on function public.respond_consultation(uuid, text, text, text) from public, anon;
revoke execute on function public.mock_pay_consultation(uuid) from public, anon;
revoke execute on function public.cancel_consultation(uuid) from public, anon;
grant execute on function public.mock_checkout(uuid, text) to authenticated;
grant execute on function public.open_discussion(uuid, text, int, text, text) to authenticated;
grant execute on function public.set_discussion_status(uuid, text) to authenticated;
grant execute on function public.set_discussion_visibility(uuid, text) to authenticated;
grant execute on function public.request_consultation(uuid, timestamptz, int) to authenticated;
grant execute on function public.respond_consultation(uuid, text, text, text) to authenticated;
grant execute on function public.mock_pay_consultation(uuid) to authenticated;
grant execute on function public.cancel_consultation(uuid) to authenticated;
