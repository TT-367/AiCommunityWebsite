import { createClient } from '@supabase/supabase-js';

function parseDotenv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function loadEnvFromFile() {
  const fs = await import('node:fs/promises');
  const candidates = ['.env.local', '.env', '.env.development.local', '.env.development'];
  for (const name of candidates) {
    try {
      const text = await fs.readFile(new URL(`../${name}`, import.meta.url), 'utf8');
      return parseDotenv(text);
    } catch {
      continue;
    }
  }
  return {};
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function safeDeleteByUserIds(client, table, userIdColumn, userIds) {
  if (userIds.length === 0) return { deleted: 0, skipped: false };
  let deleted = 0;
  for (const ids of chunk(userIds, 100)) {
    const { error, data } = await client.from(table).delete().in(userIdColumn, ids).select('1');
    if (error) {
      const msg = error.message || '';
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('Not Found')) {
        return { deleted, skipped: true };
      }
      throw new Error(`${table} delete failed: ${msg}`);
    }
    deleted += (data ?? []).length;
  }
  return { deleted, skipped: false };
}

async function safeDeletePostsByAuthorIds(client, authorIds) {
  if (authorIds.length === 0) return { deleted: 0 };
  let deleted = 0;
  for (const ids of chunk(authorIds, 100)) {
    const { error, data } = await client.from('posts').delete().in('author_id', ids).select('id');
    if (error) throw new Error(`posts delete failed: ${error.message}`);
    deleted += (data ?? []).length;
  }
  return { deleted };
}

async function safeDeleteCommentsByAuthorIds(client, authorIds) {
  if (authorIds.length === 0) return { deleted: 0 };
  let deleted = 0;
  for (const ids of chunk(authorIds, 100)) {
    const { error, data } = await client.from('comments').delete().in('author_id', ids).select('id');
    if (error) throw new Error(`comments delete failed: ${error.message}`);
    deleted += (data ?? []).length;
  }
  return { deleted };
}

async function listAllUsers(admin) {
  const all = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    all.push(...users);
    if (users.length < perPage) break;
    page += 1;
  }
  return all;
}

async function main() {
  const fileEnv = await loadEnvFromFile();
  const env = { ...fileEnv, ...process.env };

  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  const runId = env.SEED_RUN_ID ? String(env.SEED_RUN_ID) : null;
  const dryRun = String(env.DRY_RUN || '').toLowerCase() === 'true' || String(env.DRY_RUN || '') === '1';

  if (!url || !service) {
    throw new Error('Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const users = await listAllUsers(admin);

  const seedUsers = users.filter((u) => {
    const email = String(u.email ?? '');
    if (!email.startsWith('seed_')) return false;
    if (!email.endsWith('@example.com')) return false;
    if (runId && !email.includes(`_${runId}_`)) return false;
    return true;
  });

  const userIds = seedUsers.map((u) => u.id);

  const plan = {
    runId,
    matchedUsers: seedUsers.map((u) => ({ id: u.id, email: u.email })),
    matchedCount: userIds.length,
    dryRun,
  };

  if (dryRun) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }

  const deletedPostReports = await safeDeleteByUserIds(admin, 'post_reports', 'reporter_id', userIds);
  const deletedCommentLikes = await safeDeleteByUserIds(admin, 'comment_likes', 'user_id', userIds);
  const deletedPostLikes = await safeDeleteByUserIds(admin, 'post_likes', 'user_id', userIds);
  const deletedComments = await safeDeleteCommentsByAuthorIds(admin, userIds);
  const deletedPosts = await safeDeletePostsByAuthorIds(admin, userIds);

  const deletedProfiles = await safeDeleteByUserIds(admin, 'profiles', 'id', userIds);

  let deletedAuthUsers = 0;
  for (const uid of userIds) {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) throw new Error(`auth deleteUser failed for ${uid}: ${error.message}`);
    deletedAuthUsers += 1;
  }

  const out = {
    runId,
    matchedCount: userIds.length,
    deleted: {
      post_reports: deletedPostReports,
      comment_likes: deletedCommentLikes,
      post_likes: deletedPostLikes,
      comments: deletedComments,
      posts: deletedPosts,
      profiles: deletedProfiles,
      auth_users: deletedAuthUsers,
    },
  };

  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

