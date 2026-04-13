import { supabase } from './supabaseClient';
import { tagRegistrySeed, type TagRecord } from '../data/tagRegistry';

export type TagSuggestion = TagRecord;

export function normalizeTagAlias(input: string) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const localAliasToSlug = (() => {
  const map = new Map<string, string>();
  for (const t of tagRegistrySeed) {
    map.set(normalizeTagAlias(t.slug), t.slug);
    for (const a of t.aliases ?? []) {
      map.set(normalizeTagAlias(a), t.slug);
    }
  }
  return map;
})();

export function canonicalizeTag(input: string): string | null {
  const n = normalizeTagAlias(input);
  if (!n) return null;
  return localAliasToSlug.get(n) ?? null;
}

export function canonicalizeTags(inputs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of inputs) {
    const slug = canonicalizeTag(v);
    if (!slug) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

export function getTagDisplayName(slug: string) {
  const found = tagRegistrySeed.find((t) => t.slug === slug);
  return found?.displayName ?? slug;
}

function localSuggest(q: string, limit: number): TagSuggestion[] {
  const nq = normalizeTagAlias(q);
  const qLower = q.trim().toLowerCase();
  const scored = tagRegistrySeed
    .map((t) => {
      const dn = (t.displayName ?? '').toLowerCase();
      const slug = (t.slug ?? '').toLowerCase();
      const aliasHit = (t.aliases ?? []).some((a) => normalizeTagAlias(a).includes(nq));
      const prefix = dn.startsWith(qLower) || slug.startsWith(nq) ? 2 : 0;
      const contains = dn.includes(qLower) || slug.includes(nq) || aliasHit ? 1 : 0;
      const weight = Number(t.weight ?? 0);
      return { t, score: prefix * 1000 + contains * 100 + weight };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.t);
  return scored;
}

export async function suggestTags(q: string, limit = 8): Promise<TagSuggestion[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];

  try {
    const like = `%${trimmed}%`;
    const nq = normalizeTagAlias(trimmed);
    const likeN = `%${nq}%`;

    const tagsRes = await supabase
      .from('tags')
      .select('slug,display_name,group_key,icon_key,weight')
      .or(`slug.ilike.${like},display_name.ilike.${like}`)
      .limit(50);
    if (tagsRes.error) throw tagsRes.error;
    const tags = (tagsRes.data ?? []).map((r) => ({
      slug: String(r.slug),
      displayName: String(r.display_name),
      groupKey: r.group_key,
      iconKey: r.icon_key,
      weight: Number(r.weight ?? 0),
    })) satisfies TagSuggestion[];

    const aliasRes = await supabase
      .from('tag_aliases')
      .select('tag_slug')
      .ilike('alias', likeN)
      .limit(50);
    if (aliasRes.error) throw aliasRes.error;
    const aliasSlugs = Array.from(new Set((aliasRes.data ?? []).map((x) => String(x.tag_slug))));

    let aliasTags: TagSuggestion[] = [];
    if (aliasSlugs.length > 0) {
      const byAlias = await supabase
        .from('tags')
        .select('slug,display_name,group_key,icon_key,weight')
        .in('slug', aliasSlugs)
        .limit(50);
      if (byAlias.error) throw byAlias.error;
      aliasTags = (byAlias.data ?? []).map((r) => ({
        slug: String(r.slug),
        displayName: String(r.display_name),
        groupKey: r.group_key,
        iconKey: r.icon_key,
        weight: Number(r.weight ?? 0),
      }));
    }

    const merged = new Map<string, TagSuggestion>();
    for (const t of [...tags, ...aliasTags]) merged.set(t.slug, t);
    const candidates = Array.from(merged.values());
    const qLower = trimmed.toLowerCase();
    candidates.sort((a, b) => {
      const aPrefix = a.displayName.toLowerCase().startsWith(qLower) || a.slug.toLowerCase().startsWith(nq) ? 1 : 0;
      const bPrefix = b.displayName.toLowerCase().startsWith(qLower) || b.slug.toLowerCase().startsWith(nq) ? 1 : 0;
      if (aPrefix !== bPrefix) return bPrefix - aPrefix;
      const aw = Number(a.weight ?? 0);
      const bw = Number(b.weight ?? 0);
      if (aw !== bw) return bw - aw;
      return a.displayName.localeCompare(b.displayName);
    });
    return candidates.slice(0, limit);
  } catch {
    return localSuggest(trimmed, limit);
  }
}
