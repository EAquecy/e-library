-- Trigger functions are never called via the API; access helpers are for signed-in users only.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.autoconfirm_user() from public, anon, authenticated;
revoke execute on function public.has_book_access(uuid) from public, anon;
revoke execute on function public.can_see_discussion(uuid) from public, anon;
grant execute on function public.has_book_access(uuid) to authenticated;
grant execute on function public.can_see_discussion(uuid) to authenticated;
