import { wrapFetch } from "./telemetry";

type ApiErrorPayload =
  | { error?: string; message?: string; details?: unknown; requestId?: string }
  | unknown;

type ApiEnvelope<T> = {
  data: T;
  requestId: string;
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const defaultTimeoutMs = 15_000;

export function isApiConfigured() {
  return Boolean(apiBaseUrl);
}

function getBaseUrl() {
  if (!apiBaseUrl) return "";
  return apiBaseUrl.replace(/\/+$/, "");
}

async function parseResponseBody(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  if (contentType.includes("application/json") && text) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function toErrorMessage(payload: ApiErrorPayload) {
  if (!payload || typeof payload !== "object") return "请求失败";
  const p = payload as {
    error?: unknown;
    message?: unknown;
    details?: unknown;
  };
  if (typeof p.message !== "undefined") return String(p.message);
  if (typeof p.error !== "undefined") {
    if (String(p.error) === "supabase_error" && p.details) {
      if (typeof p.details === "string") return p.details;
      if (typeof p.details === "object") {
        const d = p.details as { message?: unknown; error_description?: unknown; error?: unknown };
        return String(d.message ?? d.error_description ?? d.error ?? p.error);
      }
    }
    return String(p.error);
  }
  if (p.details) {
    if (typeof p.details === "string") return p.details;
    if (typeof p.details === "object") {
      const d = p.details as { message?: unknown; error_description?: unknown; error?: unknown };
      return String(d.message ?? d.error_description ?? d.error ?? "请求失败");
    }
  }
  return "请求失败";
}

const telemetryFetch = wrapFetch(fetch);

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function mergeAbortSignals(source?: AbortSignal | null, timeoutMs?: number) {
  const controller = new AbortController();
  let timeoutId: number | null = null;

  if (typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  }

  if (source) {
    if (source.aborted) controller.abort();
    else source.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    },
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = base ? `${base}${path}` : path;

  const method = String(init?.method ?? "GET").toUpperCase();
  const { signal, cleanup } = mergeAbortSignals(init?.signal ?? null, defaultTimeoutMs);

  let res: Response;
  try {
    res = await telemetryFetch(url, { ...(init ?? {}), signal });
  } catch (e) {
    cleanup();
    const isGet = method === "GET";
    if (isGet) {
      await sleep(150 + Math.round(Math.random() * 150));
      const retry = mergeAbortSignals(init?.signal ?? null, defaultTimeoutMs);
      try {
        res = await telemetryFetch(url, { ...(init ?? {}), signal: retry.signal });
      } finally {
        retry.cleanup();
      }
    } else {
      throw e;
    }
  } finally {
    cleanup();
  }

  const headerRequestId = res.headers.get("x-request-id") || "";
  if (res.ok) return (await parseResponseBody(res)) as T;
  const payload = (await parseResponseBody(res)) as ApiErrorPayload;
  const requestId =
    (payload && typeof payload === "object" && "requestId" in payload && typeof (payload as { requestId?: unknown }).requestId === "string"
      ? String((payload as { requestId?: unknown }).requestId)
      : "") || headerRequestId;
  const suffix = requestId ? `; requestId=${requestId}` : "";
  throw new Error(`${toErrorMessage(payload)} (${res.status})${suffix}`);
}

export async function apiGetPosts(opts?: { limit?: number; offset?: number; order?: "latest" | "hot" }) {
  const q = new URLSearchParams();
  if (opts?.limit) q.set("limit", String(opts.limit));
  if (opts?.offset) q.set("offset", String(opts.offset));
  if (opts?.order) q.set("order", String(opts.order));
  const qs = q.toString();
  return apiFetch<ApiEnvelope<unknown[]>>(`/posts${qs ? `?${qs}` : ""}`);
}

export async function apiGetPost(id: string) {
  return apiFetch<ApiEnvelope<unknown>>(`/post/${encodeURIComponent(id)}`);
}

export async function apiCreatePost(input: {
  accessToken: string;
  title: string;
  content: string;
  tags?: string[] | string;
  isAiAssisted?: boolean;
}) {
  return apiFetch<ApiEnvelope<{ id: string }>>(`/post`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({
      title: input.title,
      content: input.content,
      tags: input.tags,
      is_ai_assisted: Boolean(input.isAiAssisted),
    }),
  });
}

export async function apiTogglePostLike(input: { accessToken: string; postId: string }) {
  return apiFetch<{ liked: boolean; requestId: string }>(`/post/${encodeURIComponent(input.postId)}/like`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.accessToken}`,
    },
  });
}

export async function apiGetLikedPostIds(input: { accessToken: string; postIds: string[] }) {
  const q = new URLSearchParams();
  q.set("ids", input.postIds.join(","));
  return apiFetch<ApiEnvelope<string[]>>(`/likes/posts?${q.toString()}`, {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
    },
  });
}

export async function apiDeletePost(input: { accessToken: string; postId: string }) {
  return apiFetch<{ ok: boolean; requestId: string }>(`/post/${encodeURIComponent(input.postId)}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${input.accessToken}`,
    },
  });
}

export async function apiReportPost(input: { accessToken: string; postId: string; reason?: string | null }) {
  return apiFetch<{ ok: boolean; requestId: string }>(`/post/${encodeURIComponent(input.postId)}/report`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({ reason: input.reason ?? null }),
  });
}

export async function apiGetComments(input: { postId: string; accessToken?: string | null }) {
  const q = new URLSearchParams();
  q.set("postId", input.postId);
  return apiFetch<ApiEnvelope<unknown[]>>(`/comments?${q.toString()}`, {
    headers: input.accessToken ? { authorization: `Bearer ${input.accessToken}` } : undefined,
  });
}

export async function apiCreateComment(input: {
  accessToken: string;
  postId: string;
  content: string;
  parentId?: string | null;
}) {
  return apiFetch<ApiEnvelope<{ id: string }>>(`/comment`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({
      post_id: input.postId,
      parent_id: input.parentId ?? null,
      content: input.content,
    }),
  });
}

export async function apiToggleCommentLike(input: { accessToken: string; commentId: string }) {
  return apiFetch<{ liked: boolean; requestId: string }>(`/comment/${encodeURIComponent(input.commentId)}/like`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.accessToken}`,
    },
  });
}

export async function apiGetLikedCommentIds(input: { accessToken: string; commentIds: string[] }) {
  const q = new URLSearchParams();
  q.set("ids", input.commentIds.join(","));
  return apiFetch<ApiEnvelope<string[]>>(`/likes/comments?${q.toString()}`, {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
    },
  });
}

export async function apiGetUserProfile(input: { userId: string; accessToken?: string | null }) {
  return apiFetch<ApiEnvelope<unknown>>(`/user/${encodeURIComponent(input.userId)}/profile`, {
    headers: input.accessToken ? { authorization: `Bearer ${input.accessToken}` } : undefined,
  });
}

export async function apiGetUserPosts(input: { userId: string; accessToken?: string | null }) {
  return apiFetch<ApiEnvelope<unknown[]>>(`/user/${encodeURIComponent(input.userId)}/posts`, {
    headers: input.accessToken ? { authorization: `Bearer ${input.accessToken}` } : undefined,
  });
}

export async function apiGetDeveloperLeaderboard(limit = 10) {
  const q = new URLSearchParams();
  q.set("limit", String(limit));
  return apiFetch<ApiEnvelope<unknown[]>>(`/leaderboard/developers?${q.toString()}`);
}

export async function apiGetGames(opts?: { limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (opts?.limit) q.set("limit", String(opts.limit));
  if (opts?.offset) q.set("offset", String(opts.offset));
  const qs = q.toString();
  return apiFetch<ApiEnvelope<unknown[]>>(`/games${qs ? `?${qs}` : ""}`);
}

export async function apiGetGame(gameId: string) {
  return apiFetch<ApiEnvelope<unknown>>(`/game/${encodeURIComponent(gameId)}`);
}

export async function apiCreateGame(input: {
  accessToken: string;
  id?: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  tags?: string[] | string;
}) {
  return apiFetch<ApiEnvelope<unknown>>(`/game`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({
      id: input.id,
      title: input.title,
      description: input.description,
      thumbnail_url: input.thumbnailUrl ?? null,
      tags: input.tags,
    }),
  });
}

export async function apiGetGamePost(gameId: string) {
  return apiFetch<ApiEnvelope<unknown>>(`/game/${encodeURIComponent(gameId)}/post`);
}

export async function apiUpsertGamePost(input: {
  accessToken: string;
  gameId: string;
  authorNote: string;
  videoUrl?: string | null;
  repoUrl?: string | null;
}) {
  return apiFetch<ApiEnvelope<unknown>>(`/game/${encodeURIComponent(input.gameId)}/post`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({
      author_note: input.authorNote,
      video_url: input.videoUrl ?? null,
      repo_url: input.repoUrl ?? null,
    }),
  });
}

export async function apiGetGameComments(input: { gameId: string; accessToken?: string | null }) {
  return apiFetch<ApiEnvelope<unknown[]>>(`/game/${encodeURIComponent(input.gameId)}/comments`, {
    headers: input.accessToken ? { authorization: `Bearer ${input.accessToken}` } : undefined,
  });
}

export async function apiCreateGameComment(input: {
  accessToken: string;
  gameId: string;
  content: string;
  parentId?: string | null;
}) {
  return apiFetch<ApiEnvelope<{ id: string }>>(`/game/${encodeURIComponent(input.gameId)}/comment`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({
      parent_id: input.parentId ?? null,
      content: input.content,
    }),
  });
}

export async function apiGetLikedGameCommentIds(input: { accessToken: string; commentIds: string[] }) {
  const q = new URLSearchParams();
  q.set("ids", input.commentIds.join(","));
  return apiFetch<ApiEnvelope<string[]>>(`/likes/game-comments?${q.toString()}`, {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
    },
  });
}

export async function apiToggleGameCommentLike(input: { accessToken: string; commentId: string }) {
  return apiFetch<{ liked: boolean; requestId: string }>(`/game-comment/${encodeURIComponent(input.commentId)}/like`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.accessToken}`,
    },
  });
}

export type ApiProject = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type ApiProjectAsset = {
  id: string;
  project_id: string;
  kind: "file" | "note" | "link";
  title: string;
  content?: string | null;
  url?: string | null;
  file_name?: string | null;
  mime?: string | null;
  size?: number | null;
  data_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiWorkspaceStateRow = {
  project_id: string;
  state: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
};

export async function apiListProjects(input: { accessToken: string }) {
  return apiFetch<ApiEnvelope<ApiProject[]>>(`/projects`, {
    headers: { authorization: `Bearer ${input.accessToken}` },
  });
}

export async function apiCreateProject(input: { accessToken: string; name: string; id?: string }) {
  return apiFetch<ApiEnvelope<ApiProject>>(`/projects`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify({ id: input.id, name: input.name }),
  });
}

export async function apiUpdateProject(input: { accessToken: string; id: string; name: string }) {
  return apiFetch<ApiEnvelope<ApiProject>>(`/projects/${encodeURIComponent(input.id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify({ name: input.name }),
  });
}

export async function apiDeleteProject(input: { accessToken: string; id: string }) {
  return apiFetch<{ ok: boolean; requestId: string }>(`/projects/${encodeURIComponent(input.id)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${input.accessToken}` },
  });
}

export async function apiListProjectAssets(input: { accessToken: string; projectId: string }) {
  return apiFetch<ApiEnvelope<ApiProjectAsset[]>>(`/projects/${encodeURIComponent(input.projectId)}/assets`, {
    headers: { authorization: `Bearer ${input.accessToken}` },
  });
}

export async function apiAddProjectAsset(input: {
  accessToken: string;
  projectId: string;
  asset: Omit<ApiProjectAsset, "id" | "project_id" | "created_at" | "updated_at"> & { dataUrl?: string | null; fileName?: string | null };
}) {
  return apiFetch<ApiEnvelope<ApiProjectAsset>>(`/projects/${encodeURIComponent(input.projectId)}/assets`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify({
      kind: input.asset.kind,
      title: input.asset.title,
      content: input.asset.content ?? null,
      url: input.asset.url ?? null,
      file_name: (input.asset.file_name ?? input.asset.fileName) ?? null,
      mime: input.asset.mime ?? null,
      size: input.asset.size ?? null,
      data_url: (input.asset.data_url ?? input.asset.dataUrl) ?? null,
    }),
  });
}

export async function apiDeleteProjectAsset(input: { accessToken: string; projectId: string; assetId: string }) {
  return apiFetch<{ ok: boolean; requestId: string }>(
    `/projects/${encodeURIComponent(input.projectId)}/assets/${encodeURIComponent(input.assetId)}`,
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${input.accessToken}` },
    },
  );
}

export async function apiGetWorkspaceState(input: { accessToken: string; projectId: string }) {
  return apiFetch<ApiEnvelope<ApiWorkspaceStateRow>>(`/projects/${encodeURIComponent(input.projectId)}/workspace-state`, {
    headers: { authorization: `Bearer ${input.accessToken}` },
  });
}

export async function apiSetWorkspaceState(input: { accessToken: string; projectId: string; state: Record<string, unknown> }) {
  return apiFetch<ApiEnvelope<ApiWorkspaceStateRow>>(`/projects/${encodeURIComponent(input.projectId)}/workspace-state`, {
    method: "PUT",
    headers: { "content-type": "application/json", authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify({ state: input.state }),
  });
}
