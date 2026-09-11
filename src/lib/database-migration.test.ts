// @vitest-environment node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

let migration = "";
let luckyNumberMigration = "";
let luckyDrawMigration = "";
let randomizedLuckyDrawMigration = "";
let activeRsvpLuckyDrawMigration = "";
let supplementalLuckyDrawMigration = "";

describe("Supabase migration", () => {
  beforeAll(async () => {
    migration = await readFile(
      fileURLToPath(
        new URL(
          "../../supabase/migrations/202607290001_create_rsvp_submissions.sql",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    luckyNumberMigration = await readFile(
      fileURLToPath(
        new URL(
          "../../supabase/migrations/202609080001_create_lucky_number_tables.sql",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    luckyDrawMigration = await readFile(
      fileURLToPath(
        new URL(
          "../../supabase/migrations/202609080002_add_atomic_lucky_draw_function.sql",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    randomizedLuckyDrawMigration = await readFile(
      fileURLToPath(
        new URL(
          "../../supabase/migrations/202609080003_randomize_lucky_prize_order.sql",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    activeRsvpLuckyDrawMigration = await readFile(
      fileURLToPath(
        new URL(
          "../../supabase/migrations/202609080004_filter_lucky_draw_to_active_rsvps.sql",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    supplementalLuckyDrawMigration = await readFile(
      fileURLToPath(
        new URL(
          "../../supabase/migrations/202609120001_add_supplemental_lucky_winners.sql",
          import.meta.url,
        ),
      ),
      "utf8",
    );
  });

  it("keeps the guest index and adds the global dashboard keyset index", () => {
    expect(migration).toMatch(
      /create index if not exists rsvp_submissions_guest_created_idx\s+on public\.rsvp_submissions \(guest_id, created_at desc\)/i,
    );
    expect(migration).toMatch(
      /create index if not exists rsvp_submissions_created_id_idx\s+on public\.rsvp_submissions \(created_at desc, id desc\)/i,
    );
  });

  it("defines an atomic hashed rate-limit bucket with locked-down RLS", () => {
    expect(migration).toMatch(
      /create table if not exists public\.rate_limit_buckets\s*\([\s\S]*bucket_hash text not null/i,
    );
    expect(migration).toMatch(
      /alter table public\.rate_limit_buckets enable row level security/i,
    );
    expect(migration).not.toMatch(/create policy[\s\S]*rate_limit_buckets/i);
    expect(migration).toMatch(
      /create or replace function public\.consume_rate_limit_bucket/i,
    );
    expect(migration).toMatch(
      /on conflict \(bucket_hash, window_started_at\)/i,
    );
    expect(migration).toMatch(/request_count = .*request_count \+ 1/i);
    expect(migration).toMatch(
      /revoke execute on function public\.consume_rate_limit_bucket\(text, integer, integer\) from public, anon, authenticated/i,
    );
    expect(migration).toMatch(
      /grant execute on function public\.consume_rate_limit_bucket\(text, integer, integer\) to service_role/i,
    );
  });

  it("requires lucky number assignments to use a one-based five-element vector", () => {
    expect(luckyNumberMigration).toMatch(
      /constraint lucky_number_assignments_array_shape check \(\s*array_ndims\(numbers\) = 1\s*and array_lower\(numbers, 1\) = 1\s*and array_upper\(numbers, 1\) = 5\s*\),/i,
    );
  });

  it("names the scalar output of the lucky draw number unnest", () => {
    expect(luckyDrawMigration).toMatch(
      /cross join lateral unnest\(assignment\.numbers\) as u\(number\)/i,
    );
    expect(luckyDrawMigration).toMatch(/select u\.number::smallint as number/i);
    expect(luckyDrawMigration).toMatch(/group by u\.number/i);
  });

  it("randomizes the next pending prize rank", () => {
    expect(randomizedLuckyDrawMigration).toMatch(
      /where not exists \([\s\S]*result\.prize_rank = candidate\.rank[\s\S]*order by random\(\)/i,
    );
    expect(randomizedLuckyDrawMigration).toMatch(
      /create or replace function public\.draw_next_lucky_prize\(\)/i,
    );
    expect(randomizedLuckyDrawMigration).toMatch(
      /grant execute on function public\.draw_next_lucky_prize\(\) to service_role/i,
    );
  });

  it("filters lucky draws to the latest attending RSVP per guest", () => {
    expect(activeRsvpLuckyDrawMigration).toMatch(
      /select distinct on \(guest_id\)[\s\S]*from public\.rsvp_submissions[\s\S]*order by guest_id, created_at desc, id desc/i,
    );
    expect(activeRsvpLuckyDrawMigration).toMatch(/latest_rsvp\.attending\s*=\s*true/i);
    expect(activeRsvpLuckyDrawMigration).toMatch(
      /from public\.lucky_number_assignments as assignment[\s\S]*join latest_rsvp/i,
    );
    expect(activeRsvpLuckyDrawMigration).toMatch(
      /pg_advisory_xact_lock\(hashtextextended\('lucky-draw-next-prize', 0\)\)/i,
    );
    expect(activeRsvpLuckyDrawMigration).toMatch(
      /revoke execute on function public\.draw_next_lucky_prize\(\) from public, anon, authenticated/i,
    );
    expect(activeRsvpLuckyDrawMigration).toMatch(
      /grant execute on function public\.draw_next_lucky_prize\(\) to service_role/i,
    );
    expect(activeRsvpLuckyDrawMigration).toMatch(
      /result\.winning_number = owned\.number/i,
    );
    expect(activeRsvpLuckyDrawMigration).toMatch(
      /when next_rank = 1 then owned\.owner_count = 1[\s\S]*else owned\.owner_count <= next_rank/i,
    );
    expect(activeRsvpLuckyDrawMigration).toMatch(
      /raise exception 'ALL_PRIZES_DRAWN'[\s\S]*raise exception 'NO_ELIGIBLE_LUCKY_NUMBER'/i,
    );
  });

  it("persists and fills supplemental lucky draw winners atomically", () => {
    expect(supplementalLuckyDrawMigration).toMatch(
      /add column if not exists supplemental_guest_ids text\[\] not null default '\{\}'::text\[\]/i,
    );
    expect(supplementalLuckyDrawMigration).toMatch(
      /select assignment\.guest_id[\s\S]*order by random\(\)[\s\S]*limit greatest\(next_rank/i,
    );
    expect(supplementalLuckyDrawMigration).toMatch(
      /raise exception 'INSUFFICIENT_PRIZE_WINNERS'/i,
    );
    expect(supplementalLuckyDrawMigration).toMatch(
      /insert into public\.lucky_draw_results\s*\(\s*prize_rank,\s*winning_number,\s*supplemental_guest_ids\s*\)/i,
    );
    expect(supplementalLuckyDrawMigration).toMatch(
      /revoke execute on function public\.draw_next_lucky_prize\(\) from public, anon, authenticated/i,
    );
    expect(supplementalLuckyDrawMigration).toMatch(
      /grant execute on function public\.draw_next_lucky_prize\(\) to service_role/i,
    );
  });
});
