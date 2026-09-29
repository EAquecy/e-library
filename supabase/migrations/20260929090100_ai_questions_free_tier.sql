-- Practice questions: a short free set (3 objective + 2 written, with answers)
-- every time; a bigger, different set costs the book's normal AI price.
alter table public.ai_usage add column tier text check (tier in ('free','more'));
update public.ai_usage set tier = 'more' where kind = 'questions';

create or replace function public.mock_pay_ai(
  p_book uuid, p_kind text, p_scope text, p_page_from int, p_page_to int, p_question text, p_tier text default null
)
returns public.ai_usage language plpgsql security definer set search_path = public as $$
declare b books; u ai_usage; v_amount numeric; v_ref text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if (select role from profiles where id = auth.uid()) <> 'student' then
    raise exception 'Only students can use the study assistant';
  end if;
  if p_kind not in ('summary','questions','topics','chat') then raise exception 'Invalid kind'; end if;
  if p_scope not in ('page','book') then raise exception 'Invalid scope'; end if;
  if p_kind = 'chat' and coalesce(trim(p_question), '') = '' then raise exception 'Ask a question first'; end if;
  if p_kind = 'questions' then
    if p_tier not in ('free','more') then raise exception 'Invalid tier'; end if;
  elsif p_tier is not null then
    raise exception 'Tier only applies to practice questions';
  end if;

  select * into b from books where id = p_book and published;
  if not found then raise exception 'Book not found'; end if;
  if not public.has_book_access(p_book) then raise exception 'Buy or rent this title to use the study assistant'; end if;
  if p_page_from < 1 or p_page_to < p_page_from then raise exception 'Invalid page range'; end if;

  if p_kind = 'questions' and p_tier = 'free' then
    v_amount := 0; v_ref := 'FREE';
  else
    v_amount := b.ai_price; v_ref := 'MOCK-' || upper(substr(md5(random()::text), 1, 10));
  end if;

  insert into ai_usage (book_id, student_id, kind, scope, page_from, page_to, question, tier, amount, payment_ref)
  values (p_book, auth.uid(), p_kind, p_scope, p_page_from, p_page_to, nullif(trim(p_question), ''), p_tier, v_amount, v_ref)
  returning * into u;
  return u;
end $$;

revoke execute on function public.mock_pay_ai(uuid, text, text, int, int, text) from public, anon, authenticated;
drop function if exists public.mock_pay_ai(uuid, text, text, int, int, text);
revoke execute on function public.mock_pay_ai(uuid, text, text, int, int, text, text) from public, anon;
grant execute on function public.mock_pay_ai(uuid, text, text, int, int, text, text) to authenticated;
