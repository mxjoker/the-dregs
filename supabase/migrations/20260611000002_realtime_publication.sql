-- Realtime was silently dead for chat: the messages/matches tables were
-- never added to the supabase_realtime publication, so postgres_changes
-- subscriptions connected but received no events (senders only saw their
-- own messages via optimistic updates).

do $$
begin
  begin
    alter publication supabase_realtime add table messages;
  exception when duplicate_object then
    null; -- already in publication
  end;
  begin
    alter publication supabase_realtime add table matches;
  exception when duplicate_object then
    null;
  end;
end $$;

-- Realtime payloads for RLS-checked subscribers need full row data.
alter table messages replica identity full;
alter table matches replica identity full;
