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

alter table public.rsvp_submissions enable row level security;
