create table if not exists public.lucky_number_assignments (
  guest_id text primary key,
  numbers smallint[] not null,
  created_at timestamptz not null default now(),
  constraint lucky_number_assignments_five_numbers check (cardinality(numbers) = 5),
  constraint lucky_number_assignments_number_range check (
    numbers <@ array[
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
      20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
      30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
      40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
      50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
      60, 61, 62, 63, 64, 65, 66, 67, 68, 69,
      70, 71, 72, 73, 74, 75, 76, 77, 78, 79,
      80, 81, 82, 83, 84, 85, 86, 87, 88, 89,
      90, 91, 92, 93, 94, 95, 96, 97, 98, 99
    ]::smallint[]
    and array_position(numbers, null::smallint) is null
  ),
  constraint lucky_number_assignments_distinct_numbers check (
    numbers[1] <> numbers[2]
    and numbers[1] <> numbers[3]
    and numbers[1] <> numbers[4]
    and numbers[1] <> numbers[5]
    and numbers[2] <> numbers[3]
    and numbers[2] <> numbers[4]
    and numbers[2] <> numbers[5]
    and numbers[3] <> numbers[4]
    and numbers[3] <> numbers[5]
    and numbers[4] <> numbers[5]
  )
);

create index if not exists lucky_number_assignments_created_idx
  on public.lucky_number_assignments (created_at asc);

alter table public.lucky_number_assignments enable row level security;

revoke all on table public.lucky_number_assignments from public, anon, authenticated;
grant select, insert, update on table public.lucky_number_assignments to service_role;

create table if not exists public.lucky_draw_results (
  prize_rank smallint primary key,
  winning_number smallint not null,
  created_at timestamptz not null default now(),
  constraint lucky_draw_results_prize_rank check (prize_rank between 1 and 5),
  constraint lucky_draw_results_winning_number check (winning_number between 0 and 99),
  constraint lucky_draw_results_unique_winning_number unique (winning_number)
);

create index if not exists lucky_draw_results_created_idx
  on public.lucky_draw_results (created_at asc);

alter table public.lucky_draw_results enable row level security;

revoke all on table public.lucky_draw_results from public, anon, authenticated;
grant select, insert, update on table public.lucky_draw_results to service_role;
