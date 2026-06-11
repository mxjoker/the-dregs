-- ============================================================
-- Seed profile machinery
-- Fake profiles auto-like back (record_swipe's reciprocal check
-- then creates the match in the same request) and send one
-- canned in-character reply per match.
-- ============================================================

create table seed_profiles (
  profile_id   uuid primary key references profiles(id) on delete cascade,
  canned_reply text not null check (char_length(canned_reply) <= 200),
  created_at   timestamptz not null default now()
);

alter table seed_profiles enable row level security;
-- No policies on purpose: clients never touch this table; the
-- SECURITY DEFINER triggers below read it as table owner.

-- Reciprocal like from seed profiles.
-- SECURITY DEFINER: the seed's swipe row would fail swipes RLS
-- (swipes_insert requires swiper = current user) when the firing
-- insert comes from a client-role statement.
create or replace function trigger_seed_auto_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.action = 'like'
     and exists (select 1 from seed_profiles where profile_id = new.swiped_id) then
    insert into swipes (swiper_id, swiped_id, action)
    values (new.swiped_id, new.swiper_id, 'like')
    on conflict (swiper_id, swiped_id) do nothing;
  end if;
  return null;
end; $$;

create trigger swipes_seed_auto_like
  after insert or update of action on swipes
  for each row execute function trigger_seed_auto_like();

-- Keep matches.last_message_at current. Nothing updated it before,
-- so matches_with_context.days_since_last_message was always null.
create or replace function trigger_message_updates_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update matches set last_message_at = new.sent_at where id = new.match_id;
  return null;
end; $$;

create trigger messages_update_match_last_message
  after insert on messages
  for each row execute function trigger_message_updates_match();

-- One canned reply per match when a human messages a seed first.
-- sent_at uses clock_timestamp() so the reply orders strictly after
-- the triggering message (now() would tie within the transaction).
create or replace function trigger_seed_canned_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_other uuid;
  v_reply text;
begin
  select case when m.user_a_id = new.sender_id then m.user_b_id else m.user_a_id end
    into v_other
  from matches m
  where m.id = new.match_id
    and new.sender_id in (m.user_a_id, m.user_b_id);

  if v_other is null then
    return null;
  end if;

  -- never reply to a seed (also breaks trigger recursion)
  if exists (select 1 from seed_profiles where profile_id = new.sender_id) then
    return null;
  end if;

  select canned_reply into v_reply from seed_profiles where profile_id = v_other;
  if v_reply is null then
    return null;
  end if;

  -- reply once per match
  if exists (select 1 from messages
             where match_id = new.match_id and sender_id = v_other) then
    return null;
  end if;

  insert into messages (match_id, sender_id, body, message_type, sent_at)
  values (new.match_id, v_other, v_reply, 'text', clock_timestamp());
  return null;
end; $$;

create trigger messages_seed_canned_reply
  after insert on messages
  for each row
  when (new.message_type = 'text' and new.deleted_at is null)
  execute function trigger_seed_canned_reply();
