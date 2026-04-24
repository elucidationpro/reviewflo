-- Drip pacing: queue/scheduling fields for review requests
-- Created: 2026-04-22

alter table review_requests
  add column if not exists scheduled_for timestamptz,
  add column if not exists queued_at timestamptz,
  add column if not exists send_status text default 'pending';

-- send_status: pending | scheduled | sent | failed
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_requests_send_status_check'
  ) then
    alter table review_requests
      add constraint review_requests_send_status_check
      check (send_status in ('pending', 'scheduled', 'sent', 'failed'));
  end if;
exception when others then
  null;
end $$;

create index if not exists idx_review_requests_send_status on review_requests(send_status);
create index if not exists idx_review_requests_scheduled_for on review_requests(scheduled_for);

