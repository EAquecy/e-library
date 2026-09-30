-- Students should be able to rate a title any time after buying or renting
-- it, even once a rental has expired — not gated on currently-active access
-- (unlike has_book_access, which the study assistant and reader use).
create or replace function public.rate_book(p_book uuid, p_rating int, p_review text)
returns public.book_ratings language plpgsql security definer set search_path = public as $$
declare r book_ratings;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;
  if not exists (
    select 1 from entitlements e where e.book_id = p_book and e.student_id = auth.uid()
  ) then
    raise exception 'Buy or rent this title to rate it';
  end if;

  insert into book_ratings (book_id, student_id, rating, review)
  values (p_book, auth.uid(), p_rating, nullif(trim(p_review), ''))
  on conflict (book_id, student_id) do update
    set rating = excluded.rating, review = excluded.review, updated_at = now()
  returning * into r;
  return r;
end $$;
