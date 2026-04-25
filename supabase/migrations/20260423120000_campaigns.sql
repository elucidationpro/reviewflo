-- Past Customer Outreach Campaigns: campaigns, campaign_contacts, unsubscribes
-- Created: 2026-04-23

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed')),
  total_contacts int not null default 0,
  send_window_days int not null default 30 check (send_window_days between 1 and 365),
  sends_per_day int not null default 7 check (sends_per_day between 1 and 10),
  message_template text not null,
  send_time text not null default '10:00',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_campaigns_business on campaigns(business_id);
create index if not exists idx_campaigns_status on campaigns(status);

create table if not exists campaign_contacts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'opened', 'clicked', 'unsubscribed', 'failed')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  tracking_token text unique,
  error_message text,
  created_at timestamptz not null default now(),
  constraint email_or_phone check (email is not null or phone is not null)
);

create index if not exists idx_campaign_contacts_campaign on campaign_contacts(campaign_id);
create index if not exists idx_campaign_contacts_pending_due
  on campaign_contacts(scheduled_for)
  where status = 'pending';
create index if not exists idx_campaign_contacts_business_email
  on campaign_contacts(business_id, email)
  where email is not null;
create index if not exists idx_campaign_contacts_business_phone
  on campaign_contacts(business_id, phone)
  where phone is not null;

create table if not exists unsubscribes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  constraint unsub_email_or_phone check (email is not null or phone is not null)
);

create unique index if not exists idx_unsub_business_email
  on unsubscribes(business_id, email)
  where email is not null;
create unique index if not exists idx_unsub_business_phone
  on unsubscribes(business_id, phone)
  where phone is not null;

-- RLS
alter table campaigns enable row level security;
alter table campaign_contacts enable row level security;
alter table unsubscribes enable row level security;

drop policy if exists "Owners manage own campaigns" on campaigns;
create policy "Owners manage own campaigns" on campaigns
  for all
  using (business_id in (select id from businesses where user_id = auth.uid()))
  with check (business_id in (select id from businesses where user_id = auth.uid()));

drop policy if exists "Service role full access campaigns" on campaigns;
create policy "Service role full access campaigns" on campaigns
  for all
  using (auth.role() = 'service_role');

drop policy if exists "Owners manage own campaign_contacts" on campaign_contacts;
create policy "Owners manage own campaign_contacts" on campaign_contacts
  for all
  using (business_id in (select id from businesses where user_id = auth.uid()))
  with check (business_id in (select id from businesses where user_id = auth.uid()));

drop policy if exists "Service role full access campaign_contacts" on campaign_contacts;
create policy "Service role full access campaign_contacts" on campaign_contacts
  for all
  using (auth.role() = 'service_role');

drop policy if exists "Owners read own unsubscribes" on unsubscribes;
create policy "Owners read own unsubscribes" on unsubscribes
  for select
  using (business_id in (select id from businesses where user_id = auth.uid()));

drop policy if exists "Service role full access unsubscribes" on unsubscribes;
create policy "Service role full access unsubscribes" on unsubscribes
  for all
  using (auth.role() = 'service_role');
