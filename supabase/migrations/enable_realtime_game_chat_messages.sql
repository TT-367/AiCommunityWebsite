do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'game_chat_messages'
    ) then
      execute 'alter publication supabase_realtime add table public.game_chat_messages';
    end if;
  end if;
end;
$$;

alter table public.game_chat_messages replica identity full;

