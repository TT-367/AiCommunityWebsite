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

function makeRand(seed) {
  let s = seed >>> 0;
  return function () {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296);
  };
}

const rnd = makeRand(20260318);
const randInt = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const people = [
  { name: '张伟', handle: 'zhangwei' },
  { name: '李然', handle: 'liran' },
  { name: '王敏', handle: 'wangmin' },
  { name: '赵欣', handle: 'zhaoxin' },
  { name: '陈思远', handle: 'siyuan' },
  { name: '刘畅', handle: 'liuchang' },
  { name: '孙浩', handle: 'sunhao' },
  { name: '周琪', handle: 'zhouqi' },
  { name: 'Alice Wu', handle: 'alicewu' },
  { name: 'Kevin Lee', handle: 'kevinlee' },
  { name: 'Liu Yan', handle: 'liuyan' },
  { name: 'Chen Yu', handle: 'chenyu' },
  { name: 'David Kim', handle: 'davidk' },
  { name: 'Emily Wang', handle: 'emilyw' },
];

const titles = [
  '论坛 MVP 的信息架构怎么定？',
  '帖子列表分页与排序：热度算法简化版',
  'RLS 设计：如何保证 author_id 不被伪造',
  '图片上传：直传 + 预签名的前后端约定',
  '评论层级：两层回复够用吗？',
  '内容审核：敏感词与图片审核的接入顺序',
  '用 Tailwind 做移动端排版的细节',
  '如何做点赞幂等：重复点击不重复写',
  '搜索：先用 PG FTS 还是上 Meilisearch',
  '通知系统：站内信、@提醒、回复提醒',
  '性能优化：减少 N+1 与过度渲染',
  '埋点与留存：内测阶段要采哪些数据',
];

const tagPool = ['论坛', '产品', '架构', 'RLS', 'Supabase', 'Vite', 'Tailwind', '性能', '搜索', '内容安全'];

async function main() {
  const fileEnv = await loadEnvFromFile();
  const env = { ...fileEnv, ...process.env };

  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anon = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  const password = env.SEED_PASSWORD || 'Passw0rd!123';
  const count = Math.max(5, Math.min(30, Number(env.SEED_USER_COUNT || 14)));
  const runId = String(env.SEED_RUN_ID || Date.now());

  if (!url || !anon) {
    throw new Error('Missing env vars: SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_ equivalents)');
  }

  const admin = service
    ? createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  const createdUsers = [];
  const usedPeople = shuffle(people).slice(0, Math.min(count, people.length));

  for (let i = 0; i < count; i++) {
    const p = usedPeople[i % usedPeople.length];
    const email = `seed_${p.handle}_${runId}_${String(i + 1).padStart(2, '0')}@example.com`;
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.handle)}-${runId}`;

    if (admin) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: p.name, avatar_url: avatarUrl },
      });
      if (error || !data?.user) throw new Error(error?.message || 'createUser failed');
      createdUsers.push({ id: data.user.id, email, name: p.name, avatarUrl });
      continue;
    }

    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: p.name, avatar_url: avatarUrl } },
    });
    if (error || !data?.user) throw new Error(error?.message || 'signUp failed');
    createdUsers.push({ id: data.user.id, email, name: p.name, avatarUrl });
  }

  const authedClients = [];
  for (const u of createdUsers) {
    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email: u.email, password });
    if (error || !data?.session) {
      throw new Error(
        `Sign-in failed for ${u.email}: ${error?.message || 'no session'}`
      );
    }
    authedClients.push({ ...u, client });
  }

  for (const u of authedClients) {
    const { error } = await u.client
      .from('profiles')
      .upsert({ id: u.id, display_name: u.name, avatar_url: u.avatarUrl }, { onConflict: 'id' });
    if (error) {
      if (admin) {
        const { error: adminError } = await admin
          .from('profiles')
          .upsert({ id: u.id, display_name: u.name, avatar_url: u.avatarUrl }, { onConflict: 'id' });
        if (adminError) throw new Error(adminError.message);
      } else {
        throw new Error(error.message);
      }
    }
  }

  const posts = [];
  for (const u of authedClients) {
    const postCount = randInt(1, 3);
    for (let i = 0; i < postCount; i++) {
      const title = pick(titles);
      const tags = Array.from(new Set([pick(tagPool), pick(tagPool), pick(tagPool)])).slice(0, randInt(2, 4));
      const body = `# ${title}\n\n这是用于内测的种子内容（run ${runId}）。\n\n- 主题：${tags.join('、')}\n- 作者：${u.name}\n\n欢迎同事在评论区反馈问题与建议。`;
      const { data, error } = await u.client
        .from('posts')
        .insert({
          author_id: u.id,
          title,
          description: `${title}（内测种子）`,
          content: body,
          tags,
          is_ai_assisted: rnd() > 0.65,
        })
        .select('id')
        .maybeSingle();
      if (error || !data?.id) throw new Error(error?.message || 'insert post failed');
      posts.push({ id: data.id, authorId: u.id });
    }
  }

  const postIds = posts.map(p => p.id);
  for (const u of authedClients) {
    const targetCount = randInt(2, Math.min(10, postIds.length));
    const targets = shuffle(postIds).slice(0, targetCount);
    for (const postId of targets) {
      const { error } = await u.client
        .from('post_likes')
        .upsert({ post_id: postId, user_id: u.id }, { onConflict: 'post_id,user_id' });
      if (error) throw new Error(error.message);
    }
  }

  const out = {
    runId,
    password,
    users: createdUsers.map(u => ({ id: u.id, email: u.email, name: u.name })),
    postCount: posts.length,
  };

  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

