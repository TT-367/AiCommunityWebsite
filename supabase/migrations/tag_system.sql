create table if not exists public.tags (
  slug text primary key,
  display_name text not null,
  group_key text,
  description text,
  icon_key text,
  weight integer not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists public.tag_aliases (
  alias text primary key,
  tag_slug text not null references public.tags(slug) on delete cascade
);

create index if not exists idx_tag_aliases_tag_slug on public.tag_aliases(tag_slug);

create table if not exists public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_slug text not null references public.tags(slug) on delete cascade,
  primary key (post_id, tag_slug)
);

create index if not exists idx_post_tags_tag_slug_post_id on public.post_tags(tag_slug, post_id);

create table if not exists public.game_tags (
  game_id text not null references public.games(id) on delete cascade,
  tag_slug text not null references public.tags(slug) on delete cascade,
  primary key (game_id, tag_slug)
);

create index if not exists idx_game_tags_tag_slug_game_id on public.game_tags(tag_slug, game_id);

alter table public.tags enable row level security;
alter table public.tag_aliases enable row level security;
alter table public.post_tags enable row level security;
alter table public.game_tags enable row level security;

drop policy if exists "tags_select" on public.tags;
create policy "tags_select" on public.tags
for select
to public
using (true);

drop policy if exists "tag_aliases_select" on public.tag_aliases;
create policy "tag_aliases_select" on public.tag_aliases
for select
to public
using (true);

drop policy if exists "post_tags_select" on public.post_tags;
create policy "post_tags_select" on public.post_tags
for select
to public
using (true);

drop policy if exists "game_tags_select" on public.game_tags;
create policy "game_tags_select" on public.game_tags
for select
to public
using (true);

drop policy if exists "tags_write_none" on public.tags;
create policy "tags_write_none" on public.tags
for all
to authenticated
using (false)
with check (false);

drop policy if exists "tag_aliases_write_none" on public.tag_aliases;
create policy "tag_aliases_write_none" on public.tag_aliases
for all
to authenticated
using (false)
with check (false);

drop policy if exists "post_tags_write_none" on public.post_tags;
create policy "post_tags_write_none" on public.post_tags
for all
to authenticated
using (false)
with check (false);

drop policy if exists "game_tags_write_none" on public.game_tags;
create policy "game_tags_write_none" on public.game_tags
for all
to authenticated
using (false)
with check (false);

grant select on public.tags to anon;
grant select on public.tag_aliases to anon;
grant select on public.post_tags to anon;
grant select on public.game_tags to anon;

grant all privileges on public.tags to authenticated;
grant all privileges on public.tag_aliases to authenticated;
grant all privileges on public.post_tags to authenticated;
grant all privileges on public.game_tags to authenticated;

create or replace function public.normalize_tag_alias(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(trim(coalesce(input, ''))), '[^a-z0-9/_-]+', '-', 'g')
$$;

create or replace function public.canonical_tag_slug(input text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n text;
  mapped text;
begin
  n := public.normalize_tag_alias(input);
  if n is null or n = '' then
    return null;
  end if;

  select t.slug into mapped
  from public.tag_aliases a
  join public.tags t on t.slug = a.tag_slug
  where a.alias = n
  limit 1;

  if mapped is not null then
    return mapped;
  end if;

  if exists(select 1 from public.tags where slug = n) then
    return n;
  end if;

  return null;
end;
$$;

create or replace function public.sync_post_tags(target_post_id uuid, raw_tags text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
  slug text;
begin
  delete from public.post_tags where post_id = target_post_id;
  if raw_tags is null then
    return;
  end if;
  foreach t in array raw_tags loop
    slug := public.canonical_tag_slug(t);
    if slug is null then
      continue;
    end if;
    insert into public.post_tags(post_id, tag_slug)
    values (target_post_id, slug)
    on conflict do nothing;
  end loop;
end;
$$;

create or replace function public.sync_game_tags(target_game_id text, raw_tags text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
  slug text;
begin
  delete from public.game_tags where game_id = target_game_id;
  if raw_tags is null then
    return;
  end if;
  foreach t in array raw_tags loop
    slug := public.canonical_tag_slug(t);
    if slug is null then
      continue;
    end if;
    insert into public.game_tags(game_id, tag_slug)
    values (target_game_id, slug)
    on conflict do nothing;
  end loop;
end;
$$;

create or replace function public.trg_posts_sync_tags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_post_tags(new.id, new.tags);
  return new;
end;
$$;

create or replace function public.trg_games_sync_tags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_game_tags(new.id, new.tags);
  return new;
end;
$$;

drop trigger if exists trg_posts_sync_tags on public.posts;
create trigger trg_posts_sync_tags
after insert or update of tags on public.posts
for each row
execute function public.trg_posts_sync_tags();

drop trigger if exists trg_games_sync_tags on public.games;
create trigger trg_games_sync_tags
after insert or update of tags on public.games
for each row
execute function public.trg_games_sync_tags();

insert into public.tags (slug, display_name, group_key, icon_key, weight) values
  ('unity', 'Unity', 'engine', 'unity', 30),
  ('unity/urp', 'URP', 'rendering', 'urp', 28),
  ('unity/hdrp', 'HDRP', 'rendering', 'hdrp', 20),
  ('unity/dots', 'DOTS', 'performance', 'dots', 18),
  ('unity/ecs', 'ECS', 'performance', 'ecs', 18),
  ('unity/addressables', 'Addressables', 'pipeline', 'addressables', 22),
  ('unity/shadergraph', 'Shader Graph', 'rendering', 'shadergraph', 22),
  ('ue', 'Unreal Engine', 'engine', 'ue', 30),
  ('ue/blueprint', 'Blueprint', 'scripting', 'blueprint', 22),
  ('ue/gas', 'GAS', 'gameplay', 'gas', 20),
  ('godot', 'Godot', 'engine', 'godot', 26),
  ('cocos', 'Cocos', 'engine', 'cocos', 18),
  ('tuanjie', '团结', 'engine', 'tuanjie', 16),
  ('netcode', 'Netcode', 'network', 'netcode', 22),
  ('netcode/rollback', 'Rollback', 'network', 'rollback', 18),
  ('rendering', 'Rendering', 'rendering', 'rendering', 16),
  ('rendering/shader', 'Shader', 'rendering', 'shader', 18),
  ('vfx', 'VFX', 'rendering', 'vfx', 16),
  ('animation', 'Animation', 'content', 'animation', 16),
  ('ui', 'UI', 'content', 'ui', 14),
  ('performance', 'Performance', 'performance', 'performance', 20),
  ('profiling', 'Profiling', 'performance', 'profiling', 18),
  ('pipeline', 'Pipeline', 'pipeline', 'pipeline', 1),
  ('build', 'Build', 'pipeline', 'build', 14),
  ('mobile', 'Mobile', 'platform', 'mobile', 14),
  ('webgl', 'WebGL', 'platform', 'webgl', 12),
  ('2d', '2D', 'content', '2d', 14),
  ('3d', '3D', 'content', '3d', 14),
  ('procedural', 'Procedural', 'content', 'procedural', 14),
  ('audio', 'Audio', 'content', 'audio', 12),
  ('ai-npc', 'AI NPC', 'ai', 'ai', 16),
  ('behavior-tree', 'Behavior Tree', 'ai', 'bt', 14),
  ('chatgpt', 'ChatGPT', 'tool', 'chatgpt', 18),
  ('claude', 'Claude', 'tool', 'claude', 18),
  ('gemini', 'Gemini', 'tool', 'gemini', 14),
  ('perplexity', 'Perplexity', 'tool', 'perplexity', 12),
  ('cursor', 'Cursor', 'tool', 'cursor', 18),
  ('copilot', 'Copilot', 'tool', 'copilot', 16),
  ('midjourney', 'Midjourney', 'tool', 'midjourney', 18),
  ('stable-diffusion', 'Stable Diffusion', 'tool', 'stable-diffusion', 16),
  ('meshy', 'Meshy', 'tool', 'meshy', 12),
  ('luma', 'Luma', 'tool', 'luma', 12),
  ('runway', 'Runway', 'tool', 'runway', 12),
  ('pika', 'Pika', 'tool', 'pika', 12),
  ('adobe-substance', 'Substance 3D', 'tool', 'adobe-substance', 10),
  ('miro', 'Miro', 'tool', 'miro', 8),
  ('notion', 'Notion', 'tool', 'notion', 8),
  ('unity-mcp', 'Unity MCP', 'tool', 'unity-mcp', 10),
  ('codely', 'Codely', 'tool', 'codely', 10),
  ('elevenlabs', 'ElevenLabs', 'tool', 'elevenlabs', 10),
  ('suno', 'Suno', 'tool', 'suno', 10),
  ('playht', 'PlayHT', 'tool', 'playht', 6),
  ('soundraw', 'Soundraw', 'tool', 'soundraw', 6),
  ('tabnine', 'Tabnine', 'tool', 'tabnine', 6),
  ('amazon-codewhisperer', 'CodeWhisperer', 'tool', 'amazon-codewhisperer', 6),
  ('bezi', 'Bezi', 'tool', 'bezi', 6),
  ('coplay', 'Coplay', 'tool', 'coplay', 6),
  ('leonardo-unity', 'Leonardo (Unity)', 'tool', 'leonardo-unity', 6),
  ('amara', 'Amara', 'tool', 'amara', 6),
  ('flockbay', 'Flockbay', 'tool', 'flockbay', 6),
  ('ludus', 'Ludus', 'tool', 'ludus', 6),
  ('godot-copilot', 'Godot Copilot', 'tool', 'godot-copilot', 6),
  ('fuku', 'Fuku', 'tool', 'fuku', 6),
  ('cocos-copilot', 'Cocos Copilot', 'tool', 'cocos-copilot', 6),
  ('kaedim', 'Kaedim', 'tool', 'kaedim', 6),
  ('polycam', 'Polycam', 'tool', 'polycam', 6),
  ('leonardo', 'Leonardo', 'tool', 'leonardo', 6),
  ('embergen', 'EmberGen', 'tool', 'embergen', 6),
  ('tripo', 'Tripo', 'tool', 'tripo', 6),
  ('tooncrafter', 'ToonCrafter', 'tool', 'tooncrafter', 6),
  ('seaart', 'SeaArt', 'tool', 'seaart', 6),
  ('texture-lab', 'Texture Lab', 'tool', 'texture-lab', 6),
  ('genie3', 'Genie 3', 'tool', 'genie3', 6),
  ('layerai', 'LayerAI', 'tool', 'layerai', 6),
  ('golopix', 'GoloPix', 'tool', 'golopix', 6),
  ('banana', 'Banana', 'tool', 'banana', 6)
on conflict (slug) do nothing;

insert into public.tag_aliases (alias, tag_slug) values
  (public.normalize_tag_alias('Unity'), 'unity'),
  (public.normalize_tag_alias('URP'), 'unity/urp'),
  (public.normalize_tag_alias('Universal Render Pipeline'), 'unity/urp'),
  (public.normalize_tag_alias('HDRP'), 'unity/hdrp'),
  (public.normalize_tag_alias('DOTS'), 'unity/dots'),
  (public.normalize_tag_alias('ECS'), 'unity/ecs'),
  (public.normalize_tag_alias('ShaderGraph'), 'unity/shadergraph'),
  (public.normalize_tag_alias('Shader Graph'), 'unity/shadergraph'),
  (public.normalize_tag_alias('Addressables'), 'unity/addressables'),
  (public.normalize_tag_alias('UE'), 'ue'),
  (public.normalize_tag_alias('Unreal'), 'ue'),
  (public.normalize_tag_alias('Blueprint'), 'ue/blueprint'),
  (public.normalize_tag_alias('GAS'), 'ue/gas'),
  (public.normalize_tag_alias('Godot'), 'godot'),
  (public.normalize_tag_alias('Cocos'), 'cocos'),
  (public.normalize_tag_alias('Tuanjie'), 'tuanjie'),
  (public.normalize_tag_alias('团结'), 'tuanjie'),
  (public.normalize_tag_alias('Netcode'), 'netcode'),
  (public.normalize_tag_alias('Rollback'), 'netcode/rollback'),
  (public.normalize_tag_alias('VFX'), 'vfx'),
  (public.normalize_tag_alias('Animation'), 'animation'),
  (public.normalize_tag_alias('UI'), 'ui'),
  (public.normalize_tag_alias('Performance'), 'performance'),
  (public.normalize_tag_alias('Profiling'), 'profiling'),
  (public.normalize_tag_alias('Pipeline'), 'pipeline'),
  (public.normalize_tag_alias('Build'), 'build'),
  (public.normalize_tag_alias('Mobile'), 'mobile'),
  (public.normalize_tag_alias('WebGL'), 'webgl'),
  (public.normalize_tag_alias('2D'), '2d'),
  (public.normalize_tag_alias('3D'), '3d'),
  (public.normalize_tag_alias('Procedural'), 'procedural'),
  (public.normalize_tag_alias('Audio'), 'audio'),
  (public.normalize_tag_alias('AI NPC'), 'ai-npc'),
  (public.normalize_tag_alias('Behavior Tree'), 'behavior-tree'),
  (public.normalize_tag_alias('ChatGPT'), 'chatgpt'),
  (public.normalize_tag_alias('Claude'), 'claude'),
  (public.normalize_tag_alias('Gemini'), 'gemini'),
  (public.normalize_tag_alias('Perplexity'), 'perplexity'),
  (public.normalize_tag_alias('Cursor'), 'cursor'),
  (public.normalize_tag_alias('Copilot'), 'copilot'),
  (public.normalize_tag_alias('Midjourney'), 'midjourney'),
  (public.normalize_tag_alias('MJ'), 'midjourney'),
  (public.normalize_tag_alias('Stable Diffusion'), 'stable-diffusion'),
  (public.normalize_tag_alias('SD'), 'stable-diffusion'),
  (public.normalize_tag_alias('Meshy'), 'meshy'),
  (public.normalize_tag_alias('Luma'), 'luma'),
  (public.normalize_tag_alias('Runway'), 'runway'),
  (public.normalize_tag_alias('Pika'), 'pika'),
  (public.normalize_tag_alias('Substance'), 'adobe-substance'),
  (public.normalize_tag_alias('Substance 3D'), 'adobe-substance'),
  (public.normalize_tag_alias('Miro'), 'miro'),
  (public.normalize_tag_alias('Notion'), 'notion'),
  (public.normalize_tag_alias('Unity MCP'), 'unity-mcp'),
  (public.normalize_tag_alias('Unity-MCP'), 'unity-mcp'),
  (public.normalize_tag_alias('Codely'), 'codely'),
  (public.normalize_tag_alias('ElevenLabs'), 'elevenlabs'),
  (public.normalize_tag_alias('Eleven Labs'), 'elevenlabs'),
  (public.normalize_tag_alias('Suno'), 'suno'),
  (public.normalize_tag_alias('PlayHT'), 'playht'),
  (public.normalize_tag_alias('Soundraw'), 'soundraw'),
  (public.normalize_tag_alias('Tabnine'), 'tabnine'),
  (public.normalize_tag_alias('CodeWhisperer'), 'amazon-codewhisperer'),
  (public.normalize_tag_alias('Amazon CodeWhisperer'), 'amazon-codewhisperer'),
  (public.normalize_tag_alias('Bezi'), 'bezi'),
  (public.normalize_tag_alias('Coplay'), 'coplay'),
  (public.normalize_tag_alias('Leonardo Unity'), 'leonardo-unity'),
  (public.normalize_tag_alias('Leonardo-Unity'), 'leonardo-unity'),
  (public.normalize_tag_alias('Amara'), 'amara'),
  (public.normalize_tag_alias('Flockbay'), 'flockbay'),
  (public.normalize_tag_alias('Ludus'), 'ludus'),
  (public.normalize_tag_alias('Godot Copilot'), 'godot-copilot'),
  (public.normalize_tag_alias('Godot-Copilot'), 'godot-copilot'),
  (public.normalize_tag_alias('Fuku'), 'fuku'),
  (public.normalize_tag_alias('Cocos Copilot'), 'cocos-copilot'),
  (public.normalize_tag_alias('Cocos-Copilot'), 'cocos-copilot'),
  (public.normalize_tag_alias('Kaedim'), 'kaedim'),
  (public.normalize_tag_alias('Polycam'), 'polycam'),
  (public.normalize_tag_alias('Leonardo'), 'leonardo'),
  (public.normalize_tag_alias('EmberGen'), 'embergen'),
  (public.normalize_tag_alias('Tripo'), 'tripo'),
  (public.normalize_tag_alias('ToonCrafter'), 'tooncrafter'),
  (public.normalize_tag_alias('Toon Crafter'), 'tooncrafter'),
  (public.normalize_tag_alias('SeaArt'), 'seaart'),
  (public.normalize_tag_alias('Sea Art'), 'seaart'),
  (public.normalize_tag_alias('Texture Lab'), 'texture-lab'),
  (public.normalize_tag_alias('Texture-Lab'), 'texture-lab'),
  (public.normalize_tag_alias('Genie3'), 'genie3'),
  (public.normalize_tag_alias('Genie 3'), 'genie3'),
  (public.normalize_tag_alias('LayerAI'), 'layerai'),
  (public.normalize_tag_alias('Layer AI'), 'layerai'),
  (public.normalize_tag_alias('GoloPix'), 'golopix'),
  (public.normalize_tag_alias('Golo Pix'), 'golopix'),
  (public.normalize_tag_alias('Banana'), 'banana')
on conflict (alias) do nothing;
