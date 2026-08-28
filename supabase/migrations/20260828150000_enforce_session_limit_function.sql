-- Caps how many active sessions (devices) a single account can hold at once. Called right after
-- every successful login (see /api/auth/post-login-destination) with the just-created session's id
-- excluded from deletion, so the device that's logging in right now is never the one kicked. Any
-- OLDER session beyond the limit gets deleted from auth.sessions, which immediately invalidates
-- that device's refresh token — its next API call that needs a token refresh fails and it's signed
-- out. SECURITY DEFINER because auth.sessions isn't writable by the anon/authenticated roles the
-- app's normal Supabase client runs as.
create or replace function public.enforce_session_limit(p_user_id uuid, p_current_session_id uuid, p_max_sessions int default 2)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.sessions
  where user_id = p_user_id
    and id <> p_current_session_id
    and id in (
      select id from auth.sessions
      where user_id = p_user_id
        and id <> p_current_session_id
      order by created_at desc
      offset greatest(p_max_sessions - 1, 0)
    );
end;
$$;

revoke all on function public.enforce_session_limit(uuid, uuid, int) from public;
grant execute on function public.enforce_session_limit(uuid, uuid, int) to authenticated, service_role;
