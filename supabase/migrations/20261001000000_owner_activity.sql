-- Lets a lecturer/publisher see who bought or rented their titles: email,
-- amount, kind and timestamps. Book ownership is checked inline (same
-- lecturer_id = auth.uid() pattern used everywhere else), and the function
-- reads auth.users directly since profiles doesn't store email.
create or replace function public.owner_activity(p_book uuid default null)
returns table (
  entitlement_id uuid,
  book_id uuid,
  book_title text,
  kind text,
  amount numeric,
  student_email text,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select e.id, e.book_id, b.title, e.kind, e.amount, u.email, e.created_at, e.expires_at
  from entitlements e
  join books b on b.id = e.book_id
  join auth.users u on u.id = e.student_id
  where b.lecturer_id = auth.uid()
    and (p_book is null or e.book_id = p_book)
  order by e.created_at desc;
$$;

revoke execute on function public.owner_activity(uuid) from public, anon;
grant execute on function public.owner_activity(uuid) to authenticated;
