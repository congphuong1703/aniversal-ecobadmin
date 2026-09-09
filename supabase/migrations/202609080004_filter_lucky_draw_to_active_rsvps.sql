create or replace function public.draw_next_lucky_prize()
returns public.lucky_draw_results
language plpgsql
security definer
set search_path = public
as $$
declare
  next_rank smallint;
  selected_number smallint;
  inserted_result public.lucky_draw_results;
begin
  perform pg_advisory_xact_lock(hashtextextended('lucky-draw-next-prize', 0));

  select candidate.rank::smallint
    into next_rank
    from generate_series(1, 5) as candidate(rank)
   where not exists (
           select 1
             from public.lucky_draw_results as result
            where result.prize_rank = candidate.rank
         )
   order by random()
   limit 1;

  if next_rank is null then
    raise exception 'ALL_PRIZES_DRAWN' using errcode = 'P0001';
  end if;

  with latest_rsvp as (
    select distinct on (guest_id)
           guest_id,
           attending
      from public.rsvp_submissions
     order by guest_id, created_at desc, id desc
  )
  select owned.number
    into selected_number
    from (
      select u.number::smallint as number,
             count(distinct assignment.guest_id)::integer as owner_count
        from public.lucky_number_assignments as assignment
        join latest_rsvp
          on latest_rsvp.guest_id = assignment.guest_id
         and latest_rsvp.attending = true
        cross join lateral unnest(assignment.numbers) as u(number)
       group by u.number
    ) as owned
   where not exists (
           select 1
             from public.lucky_draw_results as result
            where result.winning_number = owned.number
         )
     and case
           when next_rank = 1 then owned.owner_count = 1
           else owned.owner_count <= next_rank
         end
   order by random()
   limit 1;

  if selected_number is null then
    raise exception 'NO_ELIGIBLE_LUCKY_NUMBER' using errcode = 'P0001';
  end if;

  insert into public.lucky_draw_results (prize_rank, winning_number)
  values (next_rank, selected_number)
  returning * into inserted_result;

  return inserted_result;
end;
$$;

revoke execute on function public.draw_next_lucky_prize() from public, anon, authenticated;
grant execute on function public.draw_next_lucky_prize() to service_role;
