-- Study Assistant: lecturer-toggled AI summaries / practice questions / topics / Q&A
-- on the reading page. Paid per generation (mocked), like checkout.

alter table public.books
  add column ai_enabled boolean not null default false,
  add column ai_price numeric(10,2) not null default 5 check (ai_price >= 0);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('summary','questions','topics','chat')),
  scope text not null check (scope in ('page','book')),
  page_from int not null check (page_from >= 1),
  page_to int not null check (page_to >= page_from),
  question text,
  output text,
  amount numeric(10,2) not null,
  payment_ref text not null,
  created_at timestamptz not null default now()
);
create index on public.ai_usage (student_id, book_id, created_at desc);

alter table public.ai_usage enable row level security;

create policy "own ai usage" on public.ai_usage
  for select to authenticated using (student_id = auth.uid());
-- the API route fills in `output` after calling the model, using the caller's own session
create policy "own ai usage fulfil" on public.ai_usage
  for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

-- Charges the student, validates access + that the lecturer enabled it, and
-- creates the row the API route will fill with the generated text.
create or replace function public.mock_pay_ai(
  p_book uuid, p_kind text, p_scope text, p_page_from int, p_page_to int, p_question text
)
returns public.ai_usage language plpgsql security definer set search_path = public as $$
declare b books; u ai_usage;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if (select role from profiles where id = auth.uid()) <> 'student' then
    raise exception 'Only students can use the study assistant';
  end if;
  if p_kind not in ('summary','questions','topics','chat') then raise exception 'Invalid kind'; end if;
  if p_scope not in ('page','book') then raise exception 'Invalid scope'; end if;
  if p_kind = 'chat' and coalesce(trim(p_question), '') = '' then raise exception 'Ask a question first'; end if;

  select * into b from books where id = p_book and published;
  if not found then raise exception 'Book not found'; end if;
  if not b.ai_enabled then raise exception 'The study assistant is not enabled for this title'; end if;
  if not public.has_book_access(p_book) then raise exception 'Buy or rent this title to use the study assistant'; end if;
  if p_page_from < 1 or p_page_to < p_page_from then raise exception 'Invalid page range'; end if;

  insert into ai_usage (book_id, student_id, kind, scope, page_from, page_to, question, amount, payment_ref)
  values (p_book, auth.uid(), p_kind, p_scope, p_page_from, p_page_to, nullif(trim(p_question), ''), b.ai_price,
          'MOCK-' || upper(substr(md5(random()::text), 1, 10)))
  returning * into u;
  return u;
end $$;

revoke execute on function public.mock_pay_ai(uuid, text, text, int, int, text) from public, anon;
grant execute on function public.mock_pay_ai(uuid, text, text, int, int, text) to authenticated;
