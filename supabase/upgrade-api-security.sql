-- API security baseline: distributed, privacy-preserving rate limits and
-- explicit Data API privileges. Apply after the existing upgrade scripts.
create table if not exists public.api_rate_limits (
  rate_key text primary key check (length(rate_key) = 64),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from anon, authenticated;

create or replace function public.check_api_rate_limit(
  rate_key_arg text,
  limit_arg integer,
  window_seconds_arg integer
) returns jsonb language plpgsql security definer set search_path = public as $$
declare current_count integer; window_start timestamptz;
begin
  if rate_key_arg !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid rate limit key' using errcode = '22023';
  end if;
  if limit_arg < 1 or limit_arg > 10000 or window_seconds_arg < 1 or window_seconds_arg > 86400 then
    raise exception 'invalid rate limit configuration' using errcode = '22023';
  end if;

  insert into public.api_rate_limits as target (rate_key, window_started_at, request_count, updated_at)
  values (rate_key_arg, now(), 1, now())
  on conflict (rate_key) do update set
    window_started_at = case
      when target.window_started_at + make_interval(secs => window_seconds_arg) <= now() then now()
      else target.window_started_at
    end,
    request_count = case
      when target.window_started_at + make_interval(secs => window_seconds_arg) <= now() then 1
      else target.request_count + 1
    end,
    updated_at = now()
  returning request_count, window_started_at into current_count, window_start;

  return jsonb_build_object(
    'allowed', current_count <= limit_arg,
    'remaining', greatest(limit_arg - current_count, 0),
    'resetAt', window_start + make_interval(secs => window_seconds_arg)
  );
end $$;

revoke all on function public.check_api_rate_limit(text, integer, integer) from public;
grant execute on function public.check_api_rate_limit(text, integer, integer) to anon, authenticated;

-- Existing RLS policies remain enabled on application tables. Do not FORCE RLS
-- until all legacy security-definer RPCs have been verified against it.

notify pgrst, 'reload schema';
