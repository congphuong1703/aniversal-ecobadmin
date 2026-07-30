create extension if not exists pgcrypto;

create table if not exists public.rsvp_submissions (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null,
  attending boolean not null,
  message text null check (message is null or char_length(message) <= 1000),
  client_submission_id uuid not null unique,
  created_at timestamptz not null default now()
);

create index if not exists rsvp_submissions_guest_created_idx
  on public.rsvp_submissions (guest_id, created_at desc);

create index if not exists rsvp_submissions_created_id_idx
  on public.rsvp_submissions (created_at desc, id desc);

alter table public.rsvp_submissions enable row level security;

create table if not exists public.rate_limit_buckets (
  bucket_hash text not null check (bucket_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (bucket_hash, window_started_at)
);

alter table public.rate_limit_buckets enable row level security;

revoke all on table public.rate_limit_buckets from public, anon, authenticated;
grant select, insert, update on table public.rate_limit_buckets to service_role;

create or replace function public.consume_rate_limit_bucket(
  p_bucket_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_bucket_hash !~ '^[0-9a-f]{64}$' or p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'Invalid rate-limit arguments';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  delete from public.rate_limit_buckets
  where bucket_hash = p_bucket_hash
    and window_started_at < v_window_started_at;

  insert into public.rate_limit_buckets (
    bucket_hash,
    window_started_at,
    request_count
  )
  values (p_bucket_hash, v_window_started_at, 1)
  on conflict (bucket_hash, window_started_at)
  do update set
    request_count = public.rate_limit_buckets.request_count + 1
  returning public.rate_limit_buckets.request_count into v_request_count;

  return query
  select
    v_request_count <= p_limit,
    case
      when v_request_count <= p_limit then 0
      else greatest(
        1,
        ceil(
          extract(
            epoch from (
              v_window_started_at
              + make_interval(secs => p_window_seconds)
              - v_now
            )
          )
        )::integer
      )
    end;
end;
$$;

revoke execute on function public.consume_rate_limit_bucket(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit_bucket(text, integer, integer) to service_role;
