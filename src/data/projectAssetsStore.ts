export type ProjectRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectAssetKind = 'file' | 'note' | 'link';

export type ProjectAssetItem = {
  id: string;
  projectId: string;
  kind: ProjectAssetKind;
  title: string;
  createdAt: string;
  updatedAt: string;
  fileName?: string;
  mime?: string;
  size?: number;
  dataUrl?: string;
  content?: string;
  url?: string;
};

const PROJECTS_KEY = 'oc:projects_v1';
const ASSETS_KEY = 'oc:project_assets_v1';

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    return safeJsonParse<T>(localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function makeProjectId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `p_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function listProjects(): ProjectRecord[] {
  const list = readStorage<ProjectRecord[]>(PROJECTS_KEY, []);
  return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function upsertProject(input: { id: string; name: string }): ProjectRecord {
  const ts = nowIso();
  const list = readStorage<ProjectRecord[]>(PROJECTS_KEY, []);
  const idx = list.findIndex((p) => p.id === input.id);
  if (idx >= 0) {
    const next: ProjectRecord = { ...list[idx]!, name: input.name, updatedAt: ts };
    const merged = [...list.slice(0, idx), next, ...list.slice(idx + 1)];
    writeStorage(PROJECTS_KEY, merged);
    return next;
  }
  const rec: ProjectRecord = { id: input.id, name: input.name, createdAt: ts, updatedAt: ts };
  writeStorage(PROJECTS_KEY, [rec, ...list].slice(0, 50));
  return rec;
}

export function touchProject(projectId: string) {
  const list = readStorage<ProjectRecord[]>(PROJECTS_KEY, []);
  const idx = list.findIndex((p) => p.id === projectId);
  if (idx < 0) return;
  const ts = nowIso();
  const next: ProjectRecord = { ...list[idx]!, updatedAt: ts };
  writeStorage(PROJECTS_KEY, [...list.slice(0, idx), next, ...list.slice(idx + 1)]);
}

export function deleteProject(projectId: string) {
  const list = readStorage<ProjectRecord[]>(PROJECTS_KEY, []);
  writeStorage(
    PROJECTS_KEY,
    list.filter((p) => p.id !== projectId)
  );
  const map = readStorage<Record<string, ProjectAssetItem[]>>(ASSETS_KEY, {});
  if (map[projectId]) {
    const next = { ...map };
    delete next[projectId];
    writeStorage(ASSETS_KEY, next);
  }
}

export function listProjectAssets(projectId: string): ProjectAssetItem[] {
  const map = readStorage<Record<string, ProjectAssetItem[]>>(ASSETS_KEY, {});
  return [...(map[projectId] ?? [])].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function addProjectAsset(item: Omit<ProjectAssetItem, 'createdAt' | 'updatedAt'>): { ok: true } | { ok: false } {
  const ts = nowIso();
  const map = readStorage<Record<string, ProjectAssetItem[]>>(ASSETS_KEY, {});
  const list = map[item.projectId] ?? [];
  const nextItem: ProjectAssetItem = { ...item, createdAt: ts, updatedAt: ts };
  const nextList = [nextItem, ...list].slice(0, 200);
  const ok = writeStorage(ASSETS_KEY, { ...map, [item.projectId]: nextList });
  if (!ok) return { ok: false };
  touchProject(item.projectId);
  return { ok: true };
}

export function deleteProjectAsset(projectId: string, assetId: string) {
  const map = readStorage<Record<string, ProjectAssetItem[]>>(ASSETS_KEY, {});
  const list = map[projectId] ?? [];
  const next = list.filter((x) => x.id !== assetId);
  writeStorage(ASSETS_KEY, { ...map, [projectId]: next });
  touchProject(projectId);
}

