-- 구인 게시판: 진행중/완료 상태와 구인 마감일 (2026-11-06)
-- status: 'open'(진행중) | 'closed'(완료)
-- close_date: 구인 마감일(선택). 이 날짜까지 진행중이고, 다음 날 0시(한국 시간)에 자동으로 완료로 바뀝니다.

alter table public.jobs
  add column if not exists status text not null default 'open',
  add column if not exists close_date date;

do $$ begin
  alter table public.jobs add constraint jobs_status_check check (status in ('open', 'closed'));
exception when duplicate_object then null; end $$;

-- 마감일이 지난 진행중 글을 완료로 바꾸는 함수
create or replace function public.close_expired_jobs()
returns integer
language sql
security definer
set search_path = public
as $$
  with updated as (
    update public.jobs
       set status = 'closed'
     where status = 'open'
       and close_date is not null
       and close_date < (now() at time zone 'Asia/Seoul')::date
    returning 1
  )
  select count(*)::integer from updated;
$$;

revoke all on function public.close_expired_jobs() from public, anon, authenticated;

-- 매일 00:05(한국 시간, UTC 15:05)에 실행
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'close-expired-jobs';
select cron.schedule('close-expired-jobs', '5 15 * * *', $$select public.close_expired_jobs()$$);
