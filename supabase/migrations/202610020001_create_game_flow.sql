-- Supabase 是遊戲流程時間的唯一來源；瀏覽器只顯示 phase，不負責推進 phase。
create extension if not exists pg_cron;

create table if not exists public.game_flow_settings (
  phase text primary key,
  duration interval not null check (duration > interval '0 seconds')
);

alter table public.game_flow_settings enable row level security;

insert into public.game_flow_settings (phase, duration)
values
  ('entry_banner', interval '3.6 seconds'),
  -- StartChallenge 會先播放我的玩家卡片，再於 0.8 秒後播放對手卡片；
  -- 對手卡片約在第 1.4 秒完成顯示，之後再完整停留 3 秒才進入下一階段。
  ('start_challenge', interval '4.4 seconds'),
  ('round_intro', interval '2 seconds'),
  ('question_preview', interval '3 seconds'),
  ('answer_preparing', interval '5 seconds'),
  ('answering', interval '11 seconds'),
  ('answer_reveal', interval '5 seconds'),
  ('round_result', interval '3 seconds')
on conflict (phase) do update set duration = excluded.duration;

alter table public.matches
  add column if not exists current_round smallint not null default 1,
  add column if not exists phase text not null default 'entry_banner',
  add column if not exists phase_started_at timestamptz not null default statement_timestamp(),
  add column if not exists phase_deadline_at timestamptz not null default statement_timestamp(),
  add column if not exists flow_completed_at timestamptz,
  add column if not exists stats_applied_at timestamptz;

alter table public.matches drop constraint if exists matches_phase_check;
alter table public.matches add constraint matches_phase_check check (
  phase in (
    'entry_banner',
    'start_challenge',
    'round_intro',
    'question_preview',
    'answer_preparing',
    'answering',
    'answer_reveal',
    'round_result',
    'game_result'
  )
);

alter table public.matches drop constraint if exists matches_current_round_check;
alter table public.matches
  add constraint matches_current_round_check check (current_round between 1 and 5);

alter table public.rounds drop constraint if exists rounds_match_user_round_unique;
alter table public.rounds
  add constraint rounds_match_user_round_unique unique (match_id, user_id, round);

create or replace function public.game_phase_duration(target_phase text)
returns interval
language sql
stable
security definer
set search_path = ''
as $$
  select duration
  from public.game_flow_settings
  where phase = target_phase;
$$;

create or replace function public.initialize_match_flow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.current_round := 1;
  new.phase := 'entry_banner';
  new.phase_started_at := statement_timestamp();
  new.phase_deadline_at := new.phase_started_at + public.game_phase_duration(new.phase);
  new.flow_completed_at := null;
  new.stats_applied_at := null;
  return new;
end;
$$;

drop trigger if exists initialize_match_flow_trigger on public.matches;
create trigger initialize_match_flow_trigger
before insert on public.matches
for each row execute function public.initialize_match_flow();

create or replace function public.ensure_match_rounds(
  target_match_id uuid,
  target_round smallint,
  round_started_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_match public.matches%rowtype;
begin
  select * into target_match
  from public.matches
  where match_id = target_match_id;

  if not found then return; end if;

  -- 真人與模擬對戰都需要玩家自己的 Round，讓逾時時能由後端提交空答案。
  insert into public.rounds (
    round_id, match_id, user_id, quiz_set_id, quiz_id, round, input,
    score, bonus, time_taken_ms, submitted_at, created_at
  )
  select
    gen_random_uuid(), target_match.match_id, target_match.player_one_id,
    target_match.quiz_set_id, quizzes.quiz_id, target_round, '',
    0, 0, 0, null, round_started_at
  from (
    select quiz_id
    from public.quizzes
    where quiz_set_id = target_match.quiz_set_id
    order by "order" asc
    offset (target_round - 1)
    limit 1
  ) as quizzes
  on conflict (match_id, user_id, round) do nothing;

  -- 真人雙方共用相同回合時間；AI／Phantom 的對手資料仍由既有模擬流程提供。
  if target_match.opponent_type = 'human' then
    insert into public.rounds (
      round_id, match_id, user_id, quiz_set_id, quiz_id, round, input,
      score, bonus, time_taken_ms, submitted_at, created_at
    )
    select
      gen_random_uuid(), target_match.match_id, target_match.player_two_id,
      target_match.quiz_set_id, quizzes.quiz_id, target_round, '',
      0, 0, 0, null, round_started_at
    from (
      select quiz_id
      from public.quizzes
      where quiz_set_id = target_match.quiz_set_id
      order by "order" asc
      offset (target_round - 1)
      limit 1
    ) as quizzes
    on conflict (match_id, user_id, round) do nothing;
  end if;
end;
$$;

create or replace function public.advance_match_flow(target_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_match public.matches%rowtype;
  next_phase text;
  next_started_at timestamptz;
  player_one_score bigint;
  player_two_score bigint;
begin
  select * into current_match
  from public.matches
  where match_id = target_match_id
  for update;

  if not found or current_match.phase = 'game_result' or current_match.status = 'abandoned' then
    return;
  end if;

  -- 一次補齊所有已過期階段；長時間沒有瀏覽器在線也能直接推進至正確時間點。
  while current_match.phase_deadline_at <= statement_timestamp() loop
    next_started_at := current_match.phase_deadline_at;

    case current_match.phase
      when 'entry_banner' then
        next_phase := 'start_challenge';

      when 'start_challenge' then
        perform public.ensure_match_rounds(target_match_id, 1::smallint, next_started_at);
        next_phase := 'round_intro';

      when 'round_intro' then
        next_phase := 'question_preview';

      when 'question_preview' then
        next_phase := 'answer_preparing';

      when 'answer_preparing' then
        next_phase := 'answering';

      when 'answering' then
        update public.rounds
        set input = '',
            score = 0,
            bonus = 0,
            time_taken_ms = 10000,
            submitted_at = current_match.phase_deadline_at
        where match_id = target_match_id
          and round = current_match.current_round
          and submitted_at is null;
        next_phase := 'answer_reveal';

      when 'answer_reveal' then
        next_phase := 'round_result';

      when 'round_result' then
        if current_match.current_round < 5 then
          perform public.ensure_match_rounds(
            target_match_id,
            (current_match.current_round + 1)::smallint,
            next_started_at
          );

          update public.matches
          set current_round = current_round + 1,
              phase = 'round_intro',
              phase_started_at = next_started_at,
              phase_deadline_at = next_started_at + public.game_phase_duration('round_intro')
          where match_id = target_match_id
          returning * into current_match;
          continue;
        end if;

        select coalesce(sum(score + bonus), 0) into player_one_score
        from public.rounds
        where match_id = target_match_id and user_id = current_match.player_one_id;

        select coalesce(sum(score + bonus), 0) into player_two_score
        from public.rounds
        where match_id = target_match_id and user_id = current_match.player_two_id;

        -- 戰績和 Match 完成在同一 transaction；stats_applied_at 避免排程重試時重複累加。
        if current_match.stats_applied_at is null then
          update public.users
          set win_count = win_count + case when player_one_score > player_two_score then 1 else 0 end,
              loss_count = loss_count + case when player_one_score < player_two_score then 1 else 0 end,
              total_matches = total_matches + 1
          where user_id = current_match.player_one_id;

          if current_match.opponent_type = 'human' then
            update public.users
            set win_count = win_count + case when player_two_score > player_one_score then 1 else 0 end,
                loss_count = loss_count + case when player_two_score < player_one_score then 1 else 0 end,
                total_matches = total_matches + 1
            where user_id = current_match.player_two_id;
          end if;
        end if;

        update public.matches
        set phase = 'game_result',
            phase_started_at = next_started_at,
            phase_deadline_at = next_started_at,
            flow_completed_at = next_started_at,
            stats_applied_at = coalesce(stats_applied_at, next_started_at),
            status = 'completed',
            winner_id = case
              when player_one_score > player_two_score then player_one_id
              when player_two_score > player_one_score then player_two_id
              else null
            end,
            is_player_one_complete = true,
            is_player_two_complete = true
        where match_id = target_match_id
        returning * into current_match;
        return;

      else
        return;
    end case;

    update public.matches
    set status = 'in_progress',
        phase = next_phase,
        phase_started_at = next_started_at,
        phase_deadline_at = next_started_at + public.game_phase_duration(next_phase)
    where match_id = target_match_id
    returning * into current_match;
  end loop;
end;
$$;

-- Game 完成 render 後只呼叫一次；以資料庫當下時間開始完整 10 秒作答。
-- 若瀏覽器沒有執行此 RPC，Cron 仍會在 answer_preparing 到期後自動推進。
create or replace function public.start_answering_after_render(target_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_match public.matches%rowtype;
begin
  select * into current_match
  from public.matches
  where match_id = target_match_id
  for update;

  if not found then
    return null;
  end if;

  if current_match.phase = 'answer_preparing' then
    update public.matches
    set status = 'in_progress',
        phase = 'answering',
        phase_started_at = statement_timestamp(),
        phase_deadline_at = statement_timestamp() + public.game_phase_duration('answering')
    where match_id = target_match_id
    returning * into current_match;
  end if;

  return current_match;
end;
$$;

create or replace function public.advance_due_matches()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  due_match record;
begin
  for due_match in
    select match_id
    from public.matches
    where status in ('matched', 'in_progress')
      and phase <> 'game_result'
      and phase_deadline_at <= statement_timestamp()
  loop
    perform public.advance_match_flow(due_match.match_id);
  end loop;
end;
$$;

-- 前端 anon client 只能讀取 Match，不允許直接推進後端狀態機。
revoke execute on function public.game_phase_duration(text) from public, anon, authenticated;
revoke execute on function public.initialize_match_flow() from public, anon, authenticated;
revoke execute on function public.ensure_match_rounds(uuid, smallint, timestamptz)
from public, anon, authenticated;
revoke execute on function public.advance_match_flow(uuid) from public, anon, authenticated;
revoke execute on function public.advance_due_matches() from public, anon, authenticated;
revoke execute on function public.start_answering_after_render(uuid) from public;
grant execute on function public.start_answering_after_render(uuid) to anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'advance-lightning-matches';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$$;

select cron.schedule(
  'advance-lightning-matches',
  '1 second',
  $$ select public.advance_due_matches(); $$
);

-- 執行完整 migration 後直接列出各階段設定，方便確認 Supabase 已套用最新時間。
select phase, duration
from public.game_flow_settings
order by phase;
