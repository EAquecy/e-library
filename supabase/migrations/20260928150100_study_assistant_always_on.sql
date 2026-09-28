-- Study assistant is available on every title, not a per-lecturer toggle.
alter table public.books alter column ai_enabled set default true;
update public.books set ai_enabled = true;

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
  if not public.has_book_access(p_book) then raise exception 'Buy or rent this title to use the study assistant'; end if;
  if p_page_from < 1 or p_page_to < p_page_from then raise exception 'Invalid page range'; end if;

  insert into ai_usage (book_id, student_id, kind, scope, page_from, page_to, question, amount, payment_ref)
  values (p_book, auth.uid(), p_kind, p_scope, p_page_from, p_page_to, nullif(trim(p_question), ''), b.ai_price,
          'MOCK-' || upper(substr(md5(random()::text), 1, 10)))
  returning * into u;
  return u;
end $$;
