-- MVP convenience: accounts are usable immediately after sign-up (no email round trip).
-- Remove this trigger when real email verification is wanted.
create or replace function public.autoconfirm_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end $$;

create trigger autoconfirm_before_insert
  before insert on auth.users
  for each row execute function public.autoconfirm_user();
