const crypto = require("node:crypto");

const MAX_BODY_BYTES = 2_500_000;
const LIMITS = {
  postContent: 20_000,
  commentContent: 2_000,
  gameDescription: 2_000,
  gameAuthorNote: 2_000,
  chatMessage: 1_000,
  url: 2_000,
  projectName: 120,
  assetTitle: 200,
  noteContent: 30_000,
};

function json(statusCode, body, extraHeaders) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(extraHeaders ?? {}),
    },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  };
}

function text(statusCode, body, extraHeaders) {
  return {
    statusCode,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      ...(extraHeaders ?? {}),
    },
    body: String(body),
    isBase64Encoded: false,
  };
}

function cc({ b = 10, s = 30, swr = 60 } = {}) {
  return `public, max-age=${b}, s-maxage=${s}, stale-while-revalidate=${swr}`;
}

function normalizeHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers ?? {})) {
    if (typeof v === "undefined" || v === null) continue;
    out[String(k).toLowerCase()] = Array.isArray(v) ? v.join(",") : String(v);
  }
  return out;
}

function parseQueryString(raw) {
  const out = {};
  if (!raw) return out;
  const s = String(raw).replace(/^\?+/, "");
  if (!s) return out;
  const params = new URLSearchParams(s);
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

function normalizeQuery(event) {
  const out = {};
  const qsp = event?.queryStringParameters;
  if (qsp && typeof qsp === "object") {
    for (const [k, v] of Object.entries(qsp)) {
      if (typeof v === "undefined" || v === null) continue;
      out[String(k)] = Array.isArray(v) ? v.join(",") : String(v);
    }
  }
  const qs = event?.queryString;
  if (qs && typeof qs === "object" && !Array.isArray(qs)) {
    for (const [k, v] of Object.entries(qs)) {
      if (typeof v === "undefined" || v === null) continue;
      out[String(k)] = Array.isArray(v) ? v.join(",") : String(v);
    }
  } else if (typeof qs === "string") {
    Object.assign(out, parseQueryString(qs));
  }
  if (typeof event?.rawQueryString === "string") {
    Object.assign(out, parseQueryString(event.rawQueryString));
  }
  if (typeof event?.requestContext?.queryString === "string") {
    Object.assign(out, parseQueryString(event.requestContext.queryString));
  }
  return out;
}

function parseAllowedOrigins() {
  const raw = String(process.env.ALLOWED_ORIGINS ?? "").trim();
  if (!raw) return { allowAll: true, allow: new Set() };
  const allow = new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return { allowAll: false, allow };
}

function corsHeaders(origin) {
  const { allowAll, allow } = parseAllowedOrigins();
  const allowOrigin = allowAll ? "*" : allow.has(origin) ? origin : "";
  if (!allowOrigin) return {};
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-request-id",
    "access-control-expose-headers": "x-request-id",
    "access-control-max-age": "86400",
    ...(allowAll ? {} : { "access-control-allow-credentials": "true" }),
    vary: "Origin",
  };
}

function createRequestId() {
  return crypto.randomUUID();
}

function stripBasePath(pathname) {
  const basePath = String(process.env.API_BASE_PATH ?? "").trim();
  if (!basePath) return pathname;
  const base = basePath.startsWith("/") ? basePath : `/${basePath}`;
  if (pathname === base) return "/";
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length);
  return pathname;
}

function normalizePath(pathname) {
  const p = stripBasePath(String(pathname || "/"));
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p || "/";
}

function getSupabaseConfig() {
  const url = String(process.env.SUPABASE_URL ?? "").trim();
  const anonKey = String(process.env.SUPABASE_ANON_KEY ?? "").trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!url) throw new Error("Missing env var: SUPABASE_URL");
  if (!anonKey && !serviceRoleKey) {
    throw new Error("Missing env vars: SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY");
  }
  const apiKey = serviceRoleKey || anonKey;
  const baseUrl = url.replace(/\/+$/, "");
  return { baseUrl, anonKey, serviceRoleKey, apiKey };
}

async function supabaseRest({ requestId, method, path, query, body, authToken, prefer, apiKeyMode }) {
  const { baseUrl, apiKey, anonKey } = getSupabaseConfig();
  const endpoint = `${baseUrl}/rest/v1/${path.replace(/^\/+/, "")}`;

  const url = new URL(endpoint);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (typeof v === "undefined" || v === null) continue;
    url.searchParams.set(k, String(v));
  }

  const apikeyHeader =
    apiKeyMode === "anon" ? (anonKey || apiKey) : apiKeyMode === "service" ? apiKey : apiKey;

  const headers = {
    apikey: apikeyHeader,
    authorization: authToken ? `Bearer ${authToken}` : `Bearer ${apikeyHeader}`,
    "x-request-id": requestId,
  };
  if (prefer) headers.prefer = prefer;

  let payload = undefined;
  if (typeof body !== "undefined" && body !== null) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(url, { method, headers, body: payload });
  const textBody = await res.text();
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const parsed = isJson && textBody ? JSON.parse(textBody) : textBody;
  return { ok: res.ok, status: res.status, data: parsed, headers: res.headers };
}

async function supabaseGetUser({ requestId, accessToken }) {
  const { baseUrl, anonKey, apiKey } = getSupabaseConfig();
  const endpoint = `${baseUrl}/auth/v1/user`;
  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      apikey: anonKey || apiKey,
      authorization: `Bearer ${accessToken}`,
      "x-request-id": requestId,
    },
  });
  const textBody = await res.text();
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const parsed = isJson && textBody ? JSON.parse(textBody) : textBody;
  if (!res.ok) return { ok: false, status: res.status, error: parsed };
  return { ok: true, status: res.status, user: parsed };
}

function getBearerToken(headers) {
  const raw = headers["authorization"] || "";
  const m = raw.match(/^\s*bearer\s+(.+)\s*$/i);
  return m ? m[1] : null;
}

async function requireSupabaseUser(req) {
  const token = getBearerToken(req.headers);
  if (!token) {
    return {
      ok: false,
      res: json(401, { error: "missing_token", requestId: req.requestId }, { "x-request-id": req.requestId }),
      token: null,
      user: null,
    };
  }
  const result = await supabaseGetUser({ requestId: req.requestId, accessToken: token });
  if (!result.ok) {
    return {
      ok: false,
      res: json(result.status, { error: "invalid_token", details: result.error, requestId: req.requestId }, { "x-request-id": req.requestId }),
      token: null,
      user: null,
    };
  }
  return { ok: true, res: null, token, user: result.user };
}

function coerceString(input) {
  if (typeof input === "string") return input;
  if (typeof input === "number" || typeof input === "boolean") return String(input);
  return "";
}

function normalizeTags(input) {
  if (Array.isArray(input)) {
    return input
      .map((t) => String(t).trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  const raw = coerceString(input);
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeTagAlias(input) {
  return coerceString(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function log(level, payload) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    ...payload,
  };
  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

function createRouter() {
  const routes = [];

  function add(method, pattern, handler) {
    routes.push({ method: method.toUpperCase(), pattern, handler });
  }

  async function handle(req) {
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = req.path.match(r.pattern);
      if (!m) continue;
      return r.handler(req, m.groups ?? {});
    }
    return json(404, { error: "not_found", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  return { add, handle };
}

const router = createRouter();

router.add("GET", /^\/health$/i, async (req) => {
  return json(
    200,
    {
      ok: true,
      requestId: req.requestId,
      now: new Date().toISOString(),
    },
    { "x-request-id": req.requestId }
  );
});

router.add("GET", /^\/tags$/i, async (req) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit ?? 200)));
  const group = coerceString(req.query.group ?? "").trim();

  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "tags",
    query: {
      select: "slug,display_name,group_key,description,icon_key,weight",
      ...(group ? { group_key: `eq.${group}` } : {}),
      order: "weight.desc,display_name.asc",
      limit,
    },
  });

  if (!ok) {
    return json(status, { error: "supabase_error", details: data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  return json(200, { data, requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 30, s: 60, swr: 300 }) });
});

router.add("GET", /^\/tags\/suggest$/i, async (req) => {
  const q = coerceString(req.query.q ?? "").trim();
  const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 8)));
  if (!q) return json(200, { data: [], requestId: req.requestId }, { "x-request-id": req.requestId });

  const nq = normalizeTagAlias(q);
  const like = `%${q}%`;
  const likeN = `%${nq}%`;

  const tagsRes = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "tags",
    query: {
      select: "slug,display_name,group_key,icon_key,weight",
      or: `(slug.ilike.${like},display_name.ilike.${like})`,
      limit: 50,
    },
  });
  if (!tagsRes.ok) {
    return json(tagsRes.status, { error: "supabase_error", details: tagsRes.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const aliasRes = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "tag_aliases",
    query: {
      select: "tag_slug,alias",
      alias: `ilike.${likeN}`,
      limit: 50,
    },
  });
  if (!aliasRes.ok) {
    return json(aliasRes.status, { error: "supabase_error", details: aliasRes.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const aliasRows = Array.isArray(aliasRes.data) ? aliasRes.data : [];
  const aliasSlugs = Array.from(new Set(aliasRows.map((r) => String(r.tag_slug || "")).filter(Boolean)));
  let aliasTags = [];
  if (aliasSlugs.length > 0) {
    const inExpr = `in.(${aliasSlugs.join(",")})`;
    const byAlias = await supabaseRest({
      requestId: req.requestId,
      method: "GET",
      path: "tags",
      query: {
        select: "slug,display_name,group_key,icon_key,weight",
        slug: inExpr,
        limit: 50,
      },
    });
    if (!byAlias.ok) {
      return json(byAlias.status, { error: "supabase_error", details: byAlias.data, requestId: req.requestId }, { "x-request-id": req.requestId });
    }
    aliasTags = Array.isArray(byAlias.data) ? byAlias.data : [];
  }

  const merged = new Map();
  for (const row of [...(Array.isArray(tagsRes.data) ? tagsRes.data : []), ...aliasTags]) {
    const slug = String(row.slug || "");
    if (!slug) continue;
    merged.set(slug, row);
  }

  const candidates = Array.from(merged.values());
  const qLower = q.toLowerCase();
  const nqLower = nq.toLowerCase();
  candidates.sort((a, b) => {
    const ad = String(a.display_name || "");
    const bd = String(b.display_name || "");
    const as = String(a.slug || "");
    const bs = String(b.slug || "");
    const aw = Number(a.weight ?? 0);
    const bw = Number(b.weight ?? 0);
    const aPrefix = ad.toLowerCase().startsWith(qLower) || as.toLowerCase().startsWith(nqLower) ? 1 : 0;
    const bPrefix = bd.toLowerCase().startsWith(qLower) || bs.toLowerCase().startsWith(nqLower) ? 1 : 0;
    if (aPrefix !== bPrefix) return bPrefix - aPrefix;
    if (aw !== bw) return bw - aw;
    return ad.localeCompare(bd);
  });

  return json(200, { data: candidates.slice(0, limit), requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 10, s: 20, swr: 60 }) });
});

router.add("GET", /^\/posts$/i, async (req) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 20)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));
  const order = String(req.query.order ?? "latest");
  const rawTags = normalizeTags(req.query.tags ?? req.query.tag ?? "");
  const select =
    "id,title,description,tags,is_ai_assisted,created_at,author:profiles!posts_author_id_fkey(id,display_name,avatar_url),comments(count),post_likes(count)";

  if (rawTags.length > 0) {
    const tagSlugs = rawTags
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);
    const inExpr = `in.(${tagSlugs.join(",")})`;

    const tagsRes = await supabaseRest({
      requestId: req.requestId,
      method: "GET",
      path: "post_tags",
      query: {
        select: "post_id,tag_slug",
        tag_slug: inExpr,
        limit: 2000,
      },
    });
    if (!tagsRes.ok) {
      return json(tagsRes.status, { error: "supabase_error", details: tagsRes.data, requestId: req.requestId }, { "x-request-id": req.requestId });
    }

    const rows = Array.isArray(tagsRes.data) ? tagsRes.data : [];
    const overlapMap = new Map();
    for (const r of rows) {
      const pid = String(r.post_id || "");
      const ts = String(r.tag_slug || "");
      if (!pid || !ts) continue;
      const cur = overlapMap.get(pid) ?? new Set();
      cur.add(ts);
      overlapMap.set(pid, cur);
    }
    const rankedIds = Array.from(overlapMap.entries())
      .map(([postId, set]) => ({ postId, overlap: set.size }))
      .sort((a, b) => b.overlap - a.overlap)
      .map((x) => x.postId)
      .slice(0, Math.min(250, offset + limit * 6));

    if (rankedIds.length === 0) {
      return json(200, { data: [], requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 10, s: 20, swr: 60 }) });
    }

    const postsRes = await supabaseRest({
      requestId: req.requestId,
      method: "GET",
      path: "posts",
      query: {
        select,
        id: `in.(${rankedIds.join(",")})`,
        limit: Math.min(250, rankedIds.length),
      },
    });
    if (!postsRes.ok) {
      return json(postsRes.status, { error: "supabase_error", details: postsRes.data, requestId: req.requestId }, { "x-request-id": req.requestId });
    }

    const items = Array.isArray(postsRes.data) ? postsRes.data : [];
    const now = Date.now();
    const scored = items.map((p) => {
      const pid = String(p.id || "");
      const likesCount = p.post_likes && p.post_likes[0] && typeof p.post_likes[0].count !== "undefined" ? Number(p.post_likes[0].count) : 0;
      const commentsCount = p.comments && p.comments[0] && typeof p.comments[0].count !== "undefined" ? Number(p.comments[0].count) : 0;
      const createdAt = p.created_at ? new Date(String(p.created_at)).getTime() : 0;
      const ageDays = createdAt ? Math.max(0, (now - createdAt) / 86400000) : 9999;
      const recency = Math.max(0, 1 - ageDays / 7);
      const overlap = overlapMap.has(pid) ? overlapMap.get(pid).size : 0;
      const hot = likesCount * 2 + commentsCount * 1.2 + recency * 5 + overlap * 6;
      return { p, overlap, hot, createdAt };
    });

    scored.sort((a, b) => {
      if (order === "hot") {
        if (a.overlap !== b.overlap) return b.overlap - a.overlap;
        if (a.hot !== b.hot) return b.hot - a.hot;
        return b.createdAt - a.createdAt;
      }
      if (a.overlap !== b.overlap) return b.overlap - a.overlap;
      return b.createdAt - a.createdAt;
    });

    const sliced = scored.slice(offset, offset + limit).map((x) => x.p);
    return json(200, { data: sliced, requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 10, s: 20, swr: 60 }) });
  }

  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "posts",
    query: {
      select,
      order: order === "hot" ? undefined : "created_at.desc",
      limit,
      offset,
    },
  });

  if (!ok) {
    return json(
      status,
      { error: "supabase_error", details: data, requestId: req.requestId },
      { "x-request-id": req.requestId }
    );
  }

  return json(200, { data, requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 10, s: 20, swr: 60 }) });
});

router.add("GET", /^\/post\/(?<id>[^/]+)$/i, async (req, params) => {
  const postId = String(params.id || "");
  const select =
    "id,title,content,description,tags,is_ai_assisted,created_at,author:profiles!posts_author_id_fkey(id,display_name,avatar_url),comments(count),post_likes(count)";

  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "posts",
    query: {
      select,
      id: `eq.${postId}`,
      limit: 1,
    },
  });

  if (!ok) {
    return json(
      status,
      { error: "supabase_error", details: data, requestId: req.requestId },
      { "x-request-id": req.requestId }
    );
  }

  const row = Array.isArray(data) ? data[0] ?? null : null;
  if (!row) {
    return json(404, { error: "not_found", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  return json(200, { data: row, requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 10, s: 30, swr: 60 }) });
});

router.add("GET", /^\/me$/i, async (req) => {
  const token = getBearerToken(req.headers);
  if (!token) return json(401, { error: "missing_token", requestId: req.requestId }, { "x-request-id": req.requestId });
  const result = await supabaseGetUser({ requestId: req.requestId, accessToken: token });
  if (!result.ok) {
    return json(result.status, { error: "invalid_token", details: result.error, requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  return json(200, { user: result.user, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("GET", /^\/likes\/posts$/i, async (req) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;

  const raw = String(req.query.ids ?? "").trim();
  if (!raw) return json(200, { data: [], requestId: req.requestId }, { "x-request-id": req.requestId });

  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
  if (ids.length === 0) return json(200, { data: [], requestId: req.requestId }, { "x-request-id": req.requestId });

  const userId = String(auth.user.id || "");
  const inExpr = `in.(${ids.join(",")})`;
  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "post_likes",
    query: {
      select: "post_id",
      user_id: `eq.${userId}`,
      post_id: inExpr,
    },
    authToken: auth.token,
    apiKeyMode: "anon",
  });

  if (!ok) {
    return json(status, { error: "supabase_error", details: data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const liked = Array.isArray(data) ? data.map((r) => String(r.post_id)) : [];
  return json(200, { data: liked, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("POST", /^\/post$/i, async (req) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return json(400, { error: "invalid_body", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const title = coerceString(req.body.title).trim();
  const content = coerceString(req.body.content).trim();
  const tags = normalizeTags(req.body.tags);
  const isAiAssisted = Boolean(req.body.is_ai_assisted ?? req.body.isAiAssisted ?? false);

  if (!title || !content) {
    return json(400, { error: "missing_fields", requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  if (title.length > 200) {
    return json(400, { error: "title_too_long", requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  if (content.length > LIMITS.postContent) {
    return json(400, { error: "content_too_long", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const description = content.replace(/\s+/g, " ").trim().slice(0, 160);
  const userId = String(auth.user.id || "");
  if (!userId) {
    return json(500, { error: "missing_user_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "POST",
    path: "posts",
    query: { select: "id" },
    body: {
      author_id: userId,
      title,
      content,
      description,
      tags,
      is_ai_assisted: isAiAssisted,
    },
    authToken: auth.token,
    prefer: "return=representation",
    apiKeyMode: "anon",
  });

  if (!ok) {
    return json(
      status,
      { error: "supabase_error", details: data, requestId: req.requestId },
      { "x-request-id": req.requestId }
    );
  }

  const row = Array.isArray(data) ? data[0] ?? null : data;
  return json(201, { data: row, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("POST", /^\/post\/(?<id>[^/]+)\/like$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const postId = String(params.id || "");
  const userId = String(auth.user.id || "");
  if (!postId || !userId) {
    return json(400, { error: "missing_fields", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const existing = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "post_likes",
    query: {
      select: "post_id",
      post_id: `eq.${postId}`,
      user_id: `eq.${userId}`,
      limit: 1,
    },
    authToken: auth.token,
    apiKeyMode: "anon",
  });

  if (!existing.ok) {
    return json(
      existing.status,
      { error: "supabase_error", details: existing.data, requestId: req.requestId },
      { "x-request-id": req.requestId }
    );
  }

  const hasLiked = Array.isArray(existing.data) && existing.data.length > 0;

  if (hasLiked) {
    const del = await supabaseRest({
      requestId: req.requestId,
      method: "DELETE",
      path: "post_likes",
      query: {
        post_id: `eq.${postId}`,
        user_id: `eq.${userId}`,
      },
      authToken: auth.token,
      prefer: "return=minimal",
      apiKeyMode: "anon",
    });
    if (!del.ok) {
      return json(del.status, { error: "supabase_error", details: del.data, requestId: req.requestId }, { "x-request-id": req.requestId });
    }
    return json(200, { liked: false, requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const ins = await supabaseRest({
    requestId: req.requestId,
    method: "POST",
    path: "post_likes",
    query: { select: "post_id" },
    body: { post_id: postId, user_id: userId },
    authToken: auth.token,
    prefer: "return=minimal",
    apiKeyMode: "anon",
  });
  if (!ins.ok) {
    return json(ins.status, { error: "supabase_error", details: ins.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  return json(200, { liked: true, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("DELETE", /^\/post\/(?<id>[^/]+)$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const postId = String(params.id || "");
  const userId = String(auth.user.id || "");
  if (!postId || !userId) {
    return json(400, { error: "missing_fields", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const del = await supabaseRest({
    requestId: req.requestId,
    method: "DELETE",
    path: "posts",
    query: {
      id: `eq.${postId}`,
      author_id: `eq.${userId}`,
    },
    authToken: auth.token,
    prefer: "return=minimal",
    apiKeyMode: "anon",
  });

  if (!del.ok) {
    return json(del.status, { error: "supabase_error", details: del.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  return json(200, { ok: true, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("POST", /^\/post\/(?<id>[^/]+)\/report$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const postId = String(params.id || "");
  const userId = String(auth.user.id || "");
  if (!postId || !userId) {
    return json(400, { error: "missing_fields", requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  const reason = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? coerceString(req.body.reason) : "";

  const up = await supabaseRest({
    requestId: req.requestId,
    method: "POST",
    path: "post_reports",
    query: { on_conflict: "post_id,reporter_id" },
    body: {
      post_id: postId,
      reporter_id: userId,
      reason: reason || null,
    },
    authToken: auth.token,
    prefer: "resolution=merge-duplicates,return=minimal",
    apiKeyMode: "anon",
  });

  if (!up.ok) {
    return json(up.status, { error: "supabase_error", details: up.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  return json(200, { ok: true, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("GET", /^\/comments$/i, async (req) => {
  const postId = String(req.query.postId ?? "").trim();
  if (!postId) return json(400, { error: "missing_postId", requestId: req.requestId }, { "x-request-id": req.requestId });

  const token = getBearerToken(req.headers);
  const select =
    "id,parent_id,content,created_at,author:profiles!comments_author_id_fkey(id,display_name,avatar_url),comment_likes(count)";
  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "comments",
    query: {
      select,
      post_id: `eq.${postId}`,
      order: "created_at.asc",
      limit: 500,
    },
    authToken: token || undefined,
    apiKeyMode: "anon",
  });

  if (!ok) {
    return json(status, { error: "supabase_error", details: data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  return json(200, { data, requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 5, s: 10, swr: 30 }) });
});

router.add("POST", /^\/comment$/i, async (req) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return json(400, { error: "invalid_body", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const postId = coerceString(req.body.post_id ?? req.body.postId).trim();
  const parentId = coerceString(req.body.parent_id ?? req.body.parentId).trim();
  const content = coerceString(req.body.content).trim();

  if (!postId || !content) {
    return json(400, { error: "missing_fields", requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  if (content.length > LIMITS.commentContent) {
    return json(400, { error: "content_too_long", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const userId = String(auth.user.id || "");
  const ins = await supabaseRest({
    requestId: req.requestId,
    method: "POST",
    path: "comments",
    query: { select: "id" },
    body: {
      post_id: postId,
      author_id: userId,
      parent_id: parentId || null,
      content,
    },
    authToken: auth.token,
    prefer: "return=representation",
    apiKeyMode: "anon",
  });

  if (!ins.ok) {
    return json(ins.status, { error: "supabase_error", details: ins.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const row = Array.isArray(ins.data) ? ins.data[0] ?? null : ins.data;
  return json(201, { data: row, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("GET", /^\/likes\/comments$/i, async (req) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;

  const raw = String(req.query.ids ?? "").trim();
  if (!raw) return json(200, { data: [], requestId: req.requestId }, { "x-request-id": req.requestId });

  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);
  if (ids.length === 0) return json(200, { data: [], requestId: req.requestId }, { "x-request-id": req.requestId });

  const userId = String(auth.user.id || "");
  const inExpr = `in.(${ids.join(",")})`;
  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "comment_likes",
    query: {
      select: "comment_id",
      user_id: `eq.${userId}`,
      comment_id: inExpr,
    },
    authToken: auth.token,
    apiKeyMode: "anon",
  });

  if (!ok) {
    return json(status, { error: "supabase_error", details: data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const liked = Array.isArray(data) ? data.map((r) => String(r.comment_id)) : [];
  return json(200, { data: liked, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("POST", /^\/comment\/(?<id>[^/]+)\/like$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const commentId = String(params.id || "");
  const userId = String(auth.user.id || "");
  if (!commentId || !userId) {
    return json(400, { error: "missing_fields", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const existing = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "comment_likes",
    query: {
      select: "comment_id",
      comment_id: `eq.${commentId}`,
      user_id: `eq.${userId}`,
      limit: 1,
    },
    authToken: auth.token,
    apiKeyMode: "anon",
  });

  if (!existing.ok) {
    return json(existing.status, { error: "supabase_error", details: existing.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const hasLiked = Array.isArray(existing.data) && existing.data.length > 0;

  if (hasLiked) {
    const del = await supabaseRest({
      requestId: req.requestId,
      method: "DELETE",
      path: "comment_likes",
      query: {
        comment_id: `eq.${commentId}`,
        user_id: `eq.${userId}`,
      },
      authToken: auth.token,
      prefer: "return=minimal",
      apiKeyMode: "anon",
    });
    if (!del.ok) {
      return json(del.status, { error: "supabase_error", details: del.data, requestId: req.requestId }, { "x-request-id": req.requestId });
    }
    return json(200, { liked: false, requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const ins = await supabaseRest({
    requestId: req.requestId,
    method: "POST",
    path: "comment_likes",
    query: { select: "comment_id" },
    body: { comment_id: commentId, user_id: userId },
    authToken: auth.token,
    prefer: "return=minimal",
    apiKeyMode: "anon",
  });
  if (!ins.ok) {
    return json(ins.status, { error: "supabase_error", details: ins.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  return json(200, { liked: true, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("GET", /^\/games$/i, async (req) => {
  const limit = Math.max(1, Math.min(200, Number(req.query.limit ?? 200)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));
  const select =
    "id,owner_id,title,description,thumbnail_url,tags,play_count,likes,created_at,owner:profiles!games_owner_id_fkey(id,display_name,avatar_url)";
  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "games",
    query: {
      select,
      order: "created_at.desc",
      limit,
      offset,
    },
  });
  if (!ok) return json(status, { error: "supabase_error", details: data, requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { data, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("GET", /^\/game\/(?<id>[^/]+)$/i, async (req, params) => {
  const gameId = String(params.id || "");
  if (!gameId) return json(400, { error: "missing_game_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  const select =
    "id,owner_id,title,description,thumbnail_url,tags,play_count,likes,created_at,owner:profiles!games_owner_id_fkey(id,display_name,avatar_url)";
  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "games",
    query: {
      select,
      id: `eq.${gameId}`,
      limit: 1,
    },
  });
  if (!ok) return json(status, { error: "supabase_error", details: data, requestId: req.requestId }, { "x-request-id": req.requestId });
  const row = Array.isArray(data) ? data[0] ?? null : null;
  if (!row) return json(404, { error: "not_found", requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { data: row, requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 30, s: 60, swr: 120 }) });
});

router.add("POST", /^\/game$/i, async (req) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return json(400, { error: "invalid_body", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const id = coerceString(req.body.id).trim() || `g-${crypto.randomUUID()}`;
  const title = coerceString(req.body.title).trim();
  const description = coerceString(req.body.description).trim();
  const thumbnailUrl = coerceString(req.body.thumbnail_url ?? req.body.thumbnailUrl).trim();
  const tags = normalizeTags(req.body.tags);

  if (!id || !title || !description) {
    return json(400, { error: "missing_fields", requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  if (title.length > 200) {
    return json(400, { error: "title_too_long", requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  if (description.length > LIMITS.gameDescription) {
    return json(400, { error: "description_too_long", requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  if (thumbnailUrl.length > LIMITS.url) {
    return json(400, { error: "thumbnail_url_too_long", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const userId = String(auth.user.id || "");
  if (!userId) return json(500, { error: "missing_user_id", requestId: req.requestId }, { "x-request-id": req.requestId });

  const ins = await supabaseRest({
    requestId: req.requestId,
    method: "POST",
    path: "games",
    query: { select: "id" },
    body: {
      id,
      owner_id: userId,
      title,
      description,
      thumbnail_url: thumbnailUrl || null,
      tags,
    },
    authToken: auth.token,
    prefer: "return=representation",
    apiKeyMode: "anon",
  });
  if (!ins.ok) return json(ins.status, { error: "supabase_error", details: ins.data, requestId: req.requestId }, { "x-request-id": req.requestId });

  const sel =
    "id,owner_id,title,description,thumbnail_url,tags,play_count,likes,created_at,owner:profiles!games_owner_id_fkey(id,display_name,avatar_url)";
  const fetched = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "games",
    query: { select: sel, id: `eq.${id}`, limit: 1 },
  });
  if (!fetched.ok) return json(fetched.status, { error: "supabase_error", details: fetched.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  const row = Array.isArray(fetched.data) ? fetched.data[0] ?? null : null;
  return json(201, { data: row ?? { id }, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("GET", /^\/game\/(?<id>[^/]+)\/post$/i, async (req, params) => {
  const gameId = String(params.id || "");
  if (!gameId) return json(400, { error: "missing_game_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  const select =
    "game_id,author_id,author_note,video_url,repo_url,created_at,updated_at,author:profiles!game_posts_author_id_fkey(id,display_name,avatar_url)";
  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "game_posts",
    query: {
      select,
      game_id: `eq.${gameId}`,
      limit: 1,
    },
  });
  if (!ok) return json(status, { error: "supabase_error", details: data, requestId: req.requestId }, { "x-request-id": req.requestId });
  const row = Array.isArray(data) ? data[0] ?? null : null;
  if (!row) return json(404, { error: "not_found", requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { data: row, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("POST", /^\/game\/(?<id>[^/]+)\/post$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const gameId = String(params.id || "");
  if (!gameId) return json(400, { error: "missing_game_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return json(400, { error: "invalid_body", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const userId = String(auth.user.id || "");
  const can = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "games",
    query: { select: "id,owner_id", id: `eq.${gameId}`, limit: 1 },
  });
  if (!can.ok) return json(can.status, { error: "supabase_error", details: can.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  const gameRow = Array.isArray(can.data) ? can.data[0] ?? null : null;
  if (!gameRow) return json(404, { error: "not_found", requestId: req.requestId }, { "x-request-id": req.requestId });
  if (String(gameRow.owner_id || "") !== userId) {
    return json(403, { error: "forbidden", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const authorNote = coerceString(req.body.author_note ?? req.body.authorNote).trim();
  const videoUrl = coerceString(req.body.video_url ?? req.body.videoUrl).trim();
  const repoUrl = coerceString(req.body.repo_url ?? req.body.repoUrl).trim();
  if (!authorNote) return json(400, { error: "missing_fields", requestId: req.requestId }, { "x-request-id": req.requestId });
  if (authorNote.length > LIMITS.gameAuthorNote) {
    return json(400, { error: "author_note_too_long", requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  if (videoUrl.length > LIMITS.url) {
    return json(400, { error: "video_url_too_long", requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  if (repoUrl.length > LIMITS.url) {
    return json(400, { error: "repo_url_too_long", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const select =
    "game_id,author_id,author_note,video_url,repo_url,created_at,updated_at,author:profiles!game_posts_author_id_fkey(id,display_name,avatar_url)";
  const up = await supabaseRest({
    requestId: req.requestId,
    method: "POST",
    path: "game_posts",
    query: { select, on_conflict: "game_id" },
    body: {
      game_id: gameId,
      author_id: userId,
      author_note: authorNote,
      video_url: videoUrl || null,
      repo_url: repoUrl || null,
    },
    authToken: auth.token,
    prefer: "resolution=merge-duplicates,return=representation",
    apiKeyMode: "anon",
  });
  if (!up.ok) return json(up.status, { error: "supabase_error", details: up.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  const row = Array.isArray(up.data) ? up.data[0] ?? null : up.data;
  return json(201, { data: row, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("GET", /^\/game\/(?<id>[^/]+)\/comments$/i, async (req, params) => {
  const gameId = String(params.id || "");
  if (!gameId) return json(400, { error: "missing_game_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  const token = getBearerToken(req.headers);
  const select =
    "id,parent_id,content,created_at,author:profiles!game_comments_author_id_fkey(id,display_name,avatar_url),game_comment_likes(count)";
  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "game_comments",
    query: {
      select,
      game_id: `eq.${gameId}`,
      order: "created_at.asc",
      limit: 500,
    },
    authToken: token || undefined,
    apiKeyMode: "anon",
  });
  if (!ok) return json(status, { error: "supabase_error", details: data, requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { data, requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 10, s: 20, swr: 60 }) });
});

router.add("POST", /^\/game\/(?<id>[^/]+)\/comment$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const gameId = String(params.id || "");
  if (!gameId) return json(400, { error: "missing_game_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return json(400, { error: "invalid_body", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const parentId = coerceString(req.body.parent_id ?? req.body.parentId).trim();
  const content = coerceString(req.body.content).trim();
  if (!content) return json(400, { error: "missing_fields", requestId: req.requestId }, { "x-request-id": req.requestId });
  if (content.length > LIMITS.commentContent) {
    return json(400, { error: "content_too_long", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const userId = String(auth.user.id || "");
  const ins = await supabaseRest({
    requestId: req.requestId,
    method: "POST",
    path: "game_comments",
    query: { select: "id" },
    body: {
      game_id: gameId,
      author_id: userId,
      parent_id: parentId || null,
      content,
    },
    authToken: auth.token,
    prefer: "return=representation",
    apiKeyMode: "anon",
  });
  if (!ins.ok) return json(ins.status, { error: "supabase_error", details: ins.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  const row = Array.isArray(ins.data) ? ins.data[0] ?? null : ins.data;
  return json(201, { data: row, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("GET", /^\/likes\/game-comments$/i, async (req) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;

  const raw = String(req.query.ids ?? "").trim();
  if (!raw) return json(200, { data: [], requestId: req.requestId }, { "x-request-id": req.requestId });

  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);
  if (ids.length === 0) return json(200, { data: [], requestId: req.requestId }, { "x-request-id": req.requestId });

  const userId = String(auth.user.id || "");
  const inExpr = `in.(${ids.join(",")})`;
  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "game_comment_likes",
    query: {
      select: "comment_id",
      user_id: `eq.${userId}`,
      comment_id: inExpr,
    },
    authToken: auth.token,
    apiKeyMode: "anon",
  });

  if (!ok) {
    return json(status, { error: "supabase_error", details: data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const liked = Array.isArray(data) ? data.map((r) => String(r.comment_id)) : [];
  return json(200, { data: liked, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("POST", /^\/game-comment\/(?<id>[^/]+)\/like$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const commentId = String(params.id || "");
  const userId = String(auth.user.id || "");
  if (!commentId || !userId) {
    return json(400, { error: "missing_fields", requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const existing = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "game_comment_likes",
    query: {
      select: "comment_id",
      comment_id: `eq.${commentId}`,
      user_id: `eq.${userId}`,
      limit: 1,
    },
    authToken: auth.token,
    apiKeyMode: "anon",
  });

  if (!existing.ok) {
    return json(existing.status, { error: "supabase_error", details: existing.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const hasLiked = Array.isArray(existing.data) && existing.data.length > 0;

  if (hasLiked) {
    const del = await supabaseRest({
      requestId: req.requestId,
      method: "DELETE",
      path: "game_comment_likes",
      query: {
        comment_id: `eq.${commentId}`,
        user_id: `eq.${userId}`,
      },
      authToken: auth.token,
      prefer: "return=minimal",
      apiKeyMode: "anon",
    });
    if (!del.ok) {
      return json(del.status, { error: "supabase_error", details: del.data, requestId: req.requestId }, { "x-request-id": req.requestId });
    }
    return json(200, { liked: false, requestId: req.requestId }, { "x-request-id": req.requestId });
  }

  const ins = await supabaseRest({
    requestId: req.requestId,
    method: "POST",
    path: "game_comment_likes",
    query: { select: "comment_id" },
    body: { comment_id: commentId, user_id: userId },
    authToken: auth.token,
    prefer: "return=minimal",
    apiKeyMode: "anon",
  });
  if (!ins.ok) {
    return json(ins.status, { error: "supabase_error", details: ins.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  return json(200, { liked: true, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("GET", /^\/user\/(?<id>[^/]+)\/profile$/i, async (req, params) => {
  const userId = String(params.id || "");
  if (!userId) return json(400, { error: "missing_user_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  const token = getBearerToken(req.headers);
  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "profiles",
    query: {
      select: "id,display_name,avatar_url",
      id: `eq.${userId}`,
      limit: 1,
    },
    authToken: token || undefined,
    apiKeyMode: "anon",
  });
  if (!ok) return json(status, { error: "supabase_error", details: data, requestId: req.requestId }, { "x-request-id": req.requestId });
  const row = Array.isArray(data) ? data[0] ?? null : null;
  if (!row) return json(404, { error: "not_found", requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { data: row, requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 20, s: 40, swr: 120 }) });
});

router.add("GET", /^\/user\/(?<id>[^/]+)\/posts$/i, async (req, params) => {
  const userId = String(params.id || "");
  if (!userId) return json(400, { error: "missing_user_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  const token = getBearerToken(req.headers);
  const select = "id,title,description,tags,created_at,post_likes(count),comments(count)";
  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "posts",
    query: {
      select,
      author_id: `eq.${userId}`,
      order: "created_at.desc",
      limit: 100,
    },
    authToken: token || undefined,
    apiKeyMode: "anon",
  });
  if (!ok) return json(status, { error: "supabase_error", details: data, requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { data, requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 10, s: 20, swr: 60 }) });
});

router.add("GET", /^\/leaderboard\/developers$/i, async (req) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 10)));
  const rpc = await supabaseRest({
    requestId: req.requestId,
    method: "POST",
    path: "rpc/get_developer_leaderboard",
    body: { limit_count: limit },
  });
  if (!rpc.ok) {
    return json(rpc.status, { error: "supabase_error", details: rpc.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  return json(200, { data: rpc.data, requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 30, s: 60, swr: 180 }) });
});

router.add("GET", /^\/projects$/i, async (req) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const select = "id,name,created_at,updated_at";
  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "projects",
    query: {
      select,
      owner_id: `eq.${auth.user.id}`,
      order: "updated_at.desc",
      limit: 100,
    },
    authToken: auth.token,
    apiKeyMode: "anon",
  });
  if (!ok) return json(status, { error: "supabase_error", details: data, requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { data, requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 5, s: 10, swr: 30 }) });
});

router.add("POST", /^\/projects$/i, async (req) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return json(400, { error: "invalid_body", requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  const name = coerceString(req.body.name).trim().slice(0, LIMITS.projectName);
  if (!name) return json(400, { error: "missing_name", requestId: req.requestId }, { "x-request-id": req.requestId });
  const id = coerceString(req.body.id).trim();
  const insert = await supabaseRest({
    requestId: req.requestId,
    method: "POST",
    path: "projects",
    query: { select: "id,name,created_at,updated_at" },
    prefer: "return=representation",
    body: { ...(id ? { id } : {}), owner_id: auth.user.id, name },
    authToken: auth.token,
    apiKeyMode: "anon",
  });
  if (!insert.ok) return json(insert.status, { error: "supabase_error", details: insert.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  const row = Array.isArray(insert.data) ? insert.data[0] ?? null : null;
  if (!row) return json(500, { error: "insert_failed", requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { data: row, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("PATCH", /^\/projects\/(?<id>[^/]+)$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const projectId = String(params.id || "").trim();
  if (!projectId) return json(400, { error: "missing_project_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return json(400, { error: "invalid_body", requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  const name = coerceString(req.body.name).trim().slice(0, LIMITS.projectName);
  if (!name) return json(400, { error: "missing_name", requestId: req.requestId }, { "x-request-id": req.requestId });
  const upd = await supabaseRest({
    requestId: req.requestId,
    method: "PATCH",
    path: "projects",
    query: { id: `eq.${projectId}`, owner_id: `eq.${auth.user.id}`, select: "id,name,created_at,updated_at" },
    prefer: "return=representation",
    body: { name },
    authToken: auth.token,
    apiKeyMode: "anon",
  });
  if (!upd.ok) return json(upd.status, { error: "supabase_error", details: upd.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  const row = Array.isArray(upd.data) ? upd.data[0] ?? null : null;
  if (!row) return json(404, { error: "not_found", requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { data: row, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("DELETE", /^\/projects\/(?<id>[^/]+)$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const projectId = String(params.id || "").trim();
  if (!projectId) return json(400, { error: "missing_project_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  const del = await supabaseRest({
    requestId: req.requestId,
    method: "DELETE",
    path: "projects",
    query: { id: `eq.${projectId}`, owner_id: `eq.${auth.user.id}` },
    authToken: auth.token,
    apiKeyMode: "anon",
  });
  if (!del.ok) return json(del.status, { error: "supabase_error", details: del.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { ok: true, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("GET", /^\/projects\/(?<id>[^/]+)\/assets$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const projectId = String(params.id || "").trim();
  if (!projectId) return json(400, { error: "missing_project_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  const { ok, status, data } = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "project_assets",
    query: {
      select: "id,project_id,kind,title,content,url,file_name,mime,size,data_url,created_at,updated_at",
      project_id: `eq.${projectId}`,
      order: "updated_at.desc",
      limit: 200,
    },
    authToken: auth.token,
    apiKeyMode: "anon",
  });
  if (!ok) return json(status, { error: "supabase_error", details: data, requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { data, requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 5, s: 10, swr: 30 }) });
});

router.add("POST", /^\/projects\/(?<id>[^/]+)\/assets$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const projectId = String(params.id || "").trim();
  if (!projectId) return json(400, { error: "missing_project_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return json(400, { error: "invalid_body", requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  const kind = coerceString(req.body.kind).trim();
  if (!["file", "note", "link"].includes(kind)) return json(400, { error: "invalid_kind", requestId: req.requestId }, { "x-request-id": req.requestId });
  const title = coerceString(req.body.title).trim().slice(0, LIMITS.assetTitle) || (kind === "note" ? "未命名笔记" : kind === "link" ? "外部资源" : "文件");
  const content = coerceString(req.body.content).trim().slice(0, LIMITS.noteContent) || null;
  const url = coerceString(req.body.url).trim().slice(0, LIMITS.url) || null;
  const fileName = coerceString(req.body.file_name ?? req.body.fileName).trim().slice(0, 300) || null;
  const mime = coerceString(req.body.mime).trim().slice(0, 200) || null;
  const size = typeof req.body.size === "number" && Number.isFinite(req.body.size) ? Math.max(0, Math.min(50_000_000, Math.floor(req.body.size))) : null;
  const dataUrl = typeof req.body.data_url === "string" ? req.body.data_url : typeof req.body.dataUrl === "string" ? req.body.dataUrl : null;

  const ins = await supabaseRest({
    requestId: req.requestId,
    method: "POST",
    path: "project_assets",
    query: { select: "id,project_id,kind,title,content,url,file_name,mime,size,data_url,created_at,updated_at" },
    prefer: "return=representation",
    body: {
      project_id: projectId,
      kind,
      title,
      content,
      url,
      file_name: fileName,
      mime,
      size,
      data_url: dataUrl,
    },
    authToken: auth.token,
    apiKeyMode: "anon",
  });
  if (!ins.ok) return json(ins.status, { error: "supabase_error", details: ins.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  const row = Array.isArray(ins.data) ? ins.data[0] ?? null : null;
  if (!row) return json(500, { error: "insert_failed", requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { data: row, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("DELETE", /^\/projects\/(?<projectId>[^/]+)\/assets\/(?<assetId>[^/]+)$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const projectId = String(params.projectId || "").trim();
  const assetId = String(params.assetId || "").trim();
  if (!projectId) return json(400, { error: "missing_project_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  if (!assetId) return json(400, { error: "missing_asset_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  const del = await supabaseRest({
    requestId: req.requestId,
    method: "DELETE",
    path: "project_assets",
    query: { id: `eq.${assetId}`, project_id: `eq.${projectId}` },
    authToken: auth.token,
    apiKeyMode: "anon",
  });
  if (!del.ok) return json(del.status, { error: "supabase_error", details: del.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { ok: true, requestId: req.requestId }, { "x-request-id": req.requestId });
});

router.add("GET", /^\/projects\/(?<id>[^/]+)\/workspace-state$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const projectId = String(params.id || "").trim();
  if (!projectId) return json(400, { error: "missing_project_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  const get = await supabaseRest({
    requestId: req.requestId,
    method: "GET",
    path: "project_workspace_states",
    query: { select: "project_id,state,created_at,updated_at", project_id: `eq.${projectId}` },
    authToken: auth.token,
    apiKeyMode: "anon",
  });
  if (!get.ok) return json(get.status, { error: "supabase_error", details: get.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  const row = Array.isArray(get.data) ? get.data[0] ?? null : null;
  return json(200, { data: row ?? { project_id: projectId, state: {}, created_at: null, updated_at: null }, requestId: req.requestId }, { "x-request-id": req.requestId, "cache-control": cc({ b: 2, s: 5, swr: 10 }) });
});

router.add("PUT", /^\/projects\/(?<id>[^/]+)\/workspace-state$/i, async (req, params) => {
  const auth = await requireSupabaseUser(req);
  if (!auth.ok) return auth.res;
  const projectId = String(params.id || "").trim();
  if (!projectId) return json(400, { error: "missing_project_id", requestId: req.requestId }, { "x-request-id": req.requestId });
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return json(400, { error: "invalid_body", requestId: req.requestId }, { "x-request-id": req.requestId });
  }
  const state = req.body && typeof req.body.state === "object" && req.body.state && !Array.isArray(req.body.state) ? req.body.state : req.body;
  const up = await supabaseRest({
    requestId: req.requestId,
    method: "POST",
    path: "project_workspace_states",
    query: { select: "project_id,state,created_at,updated_at", on_conflict: "project_id" },
    prefer: "resolution=merge-duplicates,return=representation",
    body: { project_id: projectId, state },
    authToken: auth.token,
    apiKeyMode: "anon",
  });
  if (!up.ok) return json(up.status, { error: "supabase_error", details: up.data, requestId: req.requestId }, { "x-request-id": req.requestId });
  const row = Array.isArray(up.data) ? up.data[0] ?? null : null;
  if (!row) return json(500, { error: "upsert_failed", requestId: req.requestId }, { "x-request-id": req.requestId });
  return json(200, { data: row, requestId: req.requestId }, { "x-request-id": req.requestId });
});

exports.main_handler = async function main_handler(event, context) {
  const headers = normalizeHeaders(event.headers);
  const method = String(event.httpMethod || event.requestContext?.httpMethod || "GET").toUpperCase();
  const origin = headers["origin"] || "";
  const requestId = headers["x-request-id"] || event.requestId || context?.request_id || createRequestId();
  const path = normalizePath(event.path || event.requestContext?.path || "/");
  const query = normalizeQuery(event);

  const cors = corsHeaders(origin);
  if (method === "OPTIONS") {
    return text(204, "", { ...cors, "x-request-id": requestId });
  }

  let body = null;
  try {
    if (event.body) {
      const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : String(event.body);
      if (raw.length > MAX_BODY_BYTES) {
        return json(413, { error: "payload_too_large", requestId }, { ...cors, "x-request-id": requestId });
      }
      const ctype = headers["content-type"] || "";
      body = ctype.includes("application/json") ? JSON.parse(raw) : raw;
    }
  } catch (e) {
    return json(400, { error: "invalid_body", requestId }, { ...cors, "x-request-id": requestId });
  }

  const startedAt = Date.now();
  const req = { method, path, query, headers, body, requestId, rawEvent: event };

  try {
    const res = await router.handle(req);
    const elapsedMs = Date.now() - startedAt;
    log("info", {
      requestId,
      method,
      path,
      statusCode: res.statusCode,
      elapsedMs,
      userAgent: headers["user-agent"] || null,
      referer: headers["referer"] || null,
    });
    res.headers = { ...(res.headers ?? {}), ...cors, "x-request-id": requestId, "server-timing": `total;dur=${elapsedMs}` };
    return res;
  } catch (e) {
    const elapsedMs = Date.now() - startedAt;
    const message = e && typeof e === "object" && "message" in e ? String(e.message) : String(e);
    log("error", { requestId, method, path, elapsedMs, error: message });
    return json(500, { error: "internal_error", requestId }, { ...cors, "x-request-id": requestId });
  }
};
