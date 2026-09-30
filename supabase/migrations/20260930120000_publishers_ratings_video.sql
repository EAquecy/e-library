-- Adds:
--  1. A "publisher" role (journals/research publications), alongside student/lecturer.
--  2. A "publication" book kind, plus optional citation-style fields.
--  3. A "subject" tag on books, for browse filtering.
--  4. Student ratings/reviews on books.
--  5. Optional video-link attachments on discussion messages.

-- ---------- 1. Publisher role ----------
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student','lecturer','publisher'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, student_id, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case
      when new.raw_user_meta_data->>'role' = 'lecturer' then 'lecturer'
      when new.raw_user_meta_data->>'role' = 'publisher' then 'publisher'
      else 'student'
    end,
    nullif(new.raw_user_meta_data->>'student_id', ''),
    nullif(new.raw_user_meta_data->>'department', '')
  );
  return new;
end $$;

-- ---------- 2 & 3. Publication kind + citation fields + subject tag ----------
alter table public.books drop constraint books_kind_check;
alter table public.books add constraint books_kind_check check (kind in ('book','handout','publication'));

alter table public.books add column subject text;
alter table public.books add column authors text;
alter table public.books add column journal_name text;
alter table public.books add column published_year int;
alter table public.books add column doi text;

-- Publishers (like lecturers) can add/edit/delete their own titles. Update
-- and delete policies already key off lecturer_id ownership only, so only
-- the insert policy's role check needs widening.
drop policy "lecturers add own books" on public.books;
create policy "lecturers add own books" on public.books
  for insert to authenticated
  with check (lecturer_id = auth.uid() and (select role from public.profiles where id = auth.uid()) in ('lecturer','publisher'));

-- ---------- 4. Book ratings ----------
create table public.book_ratings (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, student_id)
);
create index on public.book_ratings (book_id);

alter table public.book_ratings enable row level security;

create policy "ratings are publicly readable" on public.book_ratings
  for select to authenticated using (true);

create or replace function public.rate_book(p_book uuid, p_rating int, p_review text)
returns public.book_ratings language plpgsql security definer set search_path = public as $$
declare r book_ratings;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;
  if not public.has_book_access(p_book) then raise exception 'Buy or rent this title to rate it'; end if;

  insert into book_ratings (book_id, student_id, rating, review)
  values (p_book, auth.uid(), p_rating, nullif(trim(p_review), ''))
  on conflict (book_id, student_id) do update
    set rating = excluded.rating, review = excluded.review, updated_at = now()
  returning * into r;
  return r;
end $$;

revoke execute on function public.rate_book(uuid, int, text) from public, anon;
grant execute on function public.rate_book(uuid, int, text) to authenticated;

-- ---------- 5. Video-link replies in discussions ----------
alter table public.discussion_messages add column video_url text;
