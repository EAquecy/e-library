-- Generalize Practice Questions payment into numbered tiers:
-- tier 0 = free (always), tier 1 = first paid bundle (default GHS 29.99,
-- delivering two additional, distinct question sets in one payment).
-- Prices live in a jsonb map on the book so future tiers (2, 3, ...) can
-- be added later without another migration.

alter table public.books add column ai_question_tier_prices jsonb not null default '{"1": 29.99}'::jsonb;

alter table public.ai_usage add column tier_level int;
update public.ai_usage set tier_level = case tier when 'free' then 0 when 'more' then 1 else null end;
alter table public.ai_usage add constraint ai_usage_tier_level_check check (tier_level is null or tier_level >= 0);
alter table public.ai_usage drop column tier;

create or replace function public.mock_pay_ai(
  p_book uuid, p_kind text, p_scope text, p_page_from int, p_page_to int, p_question text, p_tier int default null
)
returns public.ai_usage language plpgsql security definer set search_path = public as $$
declare b books; u ai_usage; v_amount numeric; v_ref text; v_tier_price numeric;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if (select role from profiles where id = auth.uid()) <> 'student' then
    raise exception 'Only students can use the study assistant';
  end if;
  if p_kind not in ('summary','questions','topics','chat') then raise exception 'Invalid kind'; end if;
  if p_scope not in ('page','book') then raise exception 'Invalid scope'; end if;
  if p_kind = 'chat' and coalesce(trim(p_question), '') = '' then raise exception 'Ask a question first'; end if;
  if p_kind = 'questions' then
    if p_tier is null or p_tier < 0 then raise exception 'Invalid tier'; end if;
  elsif p_tier is not null then
    raise exception 'Tier only applies to practice questions';
  end if;

  select * into b from books where id = p_book and published;
  if not found then raise exception 'Book not found'; end if;
  if not public.has_book_access(p_book) then raise exception 'Buy or rent this title to use the study assistant'; end if;
  if p_page_from < 1 or p_page_to < p_page_from then raise exception 'Invalid page range'; end if;

  if p_kind = 'questions' and p_tier = 0 then
    v_amount := 0; v_ref := 'FREE';
  elsif p_kind = 'questions' then
    v_tier_price := (b.ai_question_tier_prices ->> p_tier::text)::numeric;
    if v_tier_price is null then raise exception 'This tier is not available for this book'; end if;
    v_amount := v_tier_price; v_ref := 'MOCK-' || upper(substr(md5(random()::text), 1, 10));
  else
    v_amount := b.ai_price; v_ref := 'MOCK-' || upper(substr(md5(random()::text), 1, 10));
  end if;

  insert into ai_usage (book_id, student_id, kind, scope, page_from, page_to, question, tier_level, amount, payment_ref)
  values (p_book, auth.uid(), p_kind, p_scope, p_page_from, p_page_to, nullif(trim(p_question), ''), p_tier, v_amount, v_ref)
  returning * into u;
  return u;
end $$;

revoke execute on function public.mock_pay_ai(uuid, text, text, int, int, text, text) from public, anon, authenticated;
drop function if exists public.mock_pay_ai(uuid, text, text, int, int, text, text);
revoke execute on function public.mock_pay_ai(uuid, text, text, int, int, text, int) from public, anon;
grant execute on function public.mock_pay_ai(uuid, text, text, int, int, text, int) to authenticated;
