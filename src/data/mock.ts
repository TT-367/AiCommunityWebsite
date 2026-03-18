export interface Author {
  id: string;
  name: string;
  handle: string;
  avatar: string;
}

export interface Comment {
  id: string;
  author: Author;
  content: string;
  createdAt: string;
  likes: number;
  replies?: Comment[];
}

export interface Post {
  id: string;
  author: Author;
  title: string;
  description: string;
  content: string;
  tags: string[];
  likes: number;
  commentsCount: number;
  comments: Comment[];
  createdAt: string;
  isAiAssisted?: boolean;
  gameIds?: string[];
}

function makeRand() {
  let seed = 1337;
  return function () {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) / 4294967296);
  };
}

const rnd = makeRand();
const randInt = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59), 0);
  return d.toISOString();
};

const authors: Author[] = [
  { id: 'u01', name: '张伟', handle: '@zhangwei', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangwei' },
  { id: 'u02', name: 'Li Mei', handle: '@limei', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=limei' },
  { id: 'u03', name: '王磊', handle: '@wanglei', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wanglei' },
  { id: 'u04', name: 'Liu Yan', handle: '@liuyan', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liuyan' },
  { id: 'u05', name: '陈思远', handle: '@siyuan', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=siyuan' },
  { id: 'u06', name: 'Alice Wu', handle: '@alicewu', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alicewu' },
  { id: 'u07', name: '赵欣', handle: '@zhaoxin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoxin' },
  { id: 'u08', name: 'Sun Hao', handle: '@sunhao', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sunhao' },
  { id: 'u09', name: '刘畅', handle: '@liuchang', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liuchang' },
  { id: 'u10', name: 'Kevin Lee', handle: '@kevinl', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kevin' },
  { id: 'u11', name: '王敏', handle: '@wangmin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangmin' },
  { id: 'u12', name: 'Chen Yu', handle: '@chenyu', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chenyu' },
  { id: 'u13', name: '李然', handle: '@liran', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liran' },
  { id: 'u14', name: 'David Kim', handle: '@davidk', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=davidk' },
  { id: 'u15', name: 'Emily Wang', handle: '@emilyw', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily' },
  { id: 'u16', name: '赵云', handle: '@zhaoyun', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoyun' },
];

const tagPool = ['RAG', 'Agents', 'LangChain', 'Llama3', 'Prompt', 'Inference', 'vLLM', 'VectorDB', 'UI', 'GameDev', 'Unity', 'WebGPU', '教程', '经验'];

const titles = [
  '我用 vLLM 把生成速度翻倍的踩坑记录',
  '社区版 RAG 架构：如何控制成本与稳定性',
  '使用 Supabase 做权限与 RLS 的最佳实践',
  'Tailwind 打造响应式论坛布局的细节',
  '结合 Meilisearch 的全文搜索方案实测',
  '多模型路由：在不同场景切换 LLM',
  '前端直传 OSS 的安全与限流',
  '把帖子评论做成流式渲染的尝试',
  '小团队如何做 A/B 实验与埋点',
  'WebGPU 加速图片滤镜在浏览器侧推理',
  'Agent 协作写游戏剧情的流程',
  '用 LangGraph 管理状态机与任务',
  '数据库索引优化：从 2s 降到 120ms',
  '内容安全接入与触发策略',
  '个人开发者部署路线分享',
  '如何把点赞系统做成幂等且高并发',
  'SSR 与 SPA 的权衡与迁移',
  '我踩过的 Supabase Realtime 坑',
  '论坛消息通知设计',
  '图片上传体验优化笔记'
];

function makeComment(id: string, author: Author): Comment {
  return {
    id,
    author,
    content: ['赞同观点', '有点不同看法', '实现里这一步能更稳', '数据很好看', '求开源地址'][randInt(0, 4)],
    createdAt: daysAgo(randInt(1, 25)),
    likes: randInt(0, 6),
  };
}

const generatedPosts: Post[] = Array.from({ length: 22 }).map((_, i) => {
  const author = authors[i % authors.length];
  const title = titles[i % titles.length];
  const likeCount = randInt(5, 380);
  const cCount = randInt(0, 12);
  const cAuthors = Array.from({ length: Math.min(cCount, 3) }).map(() => pick(authors));
  const comments = cAuthors.map((a, idx) => makeComment(`c-${i + 1}-${idx + 1}`, a));
  const desc = ['实践记录', '经验总结', '性能对比', '工具链分享', '踩坑合集'][randInt(0, 4)];
  const tset = Array.from(new Set(Array.from({ length: randInt(2, 5) }).map(() => pick(tagPool))));
  return {
    id: `p${i + 1}`,
    author,
    title,
    description: `${title} · ${desc}`,
    content: `# ${title}\n\n这里是正文内容的节选，用于展示排版与交互。\n\n- 关键点：${pick(tagPool)}, ${pick(tagPool)}\n- 数据区间：近 ${randInt(3, 14)} 天\n\n结论：在合理的缓存与索引下，体验显著提升。`,
    tags: tset,
    likes: likeCount,
    commentsCount: cCount,
    comments,
    createdAt: daysAgo(randInt(0, 28)),
    isAiAssisted: rnd() > 0.6 ? true : false,
    gameIds: rnd() > 0.7 ? ['g1'] : undefined,
  };
});

export const mockPosts: Post[] = generatedPosts.sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
);

export interface Game {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  author: Author;
  playCount: number;
  likes: number;
  tags: string[];
  createdAt: string;
}

export const mockGames: Game[] = [
  {
    id: 'g1',
    title: 'Neon Racer 2077',
    description: '赛博风格赛车，赛道由 AI 程序化生成',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
    author: authors[0],
    playCount: 12000 + randInt(0, 3000),
    likes: 600 + randInt(100, 500),
    tags: ['Racing', '3D', 'AI'],
    createdAt: daysAgo(randInt(10, 25)),
  },
  {
    id: 'g2',
    title: 'Echoes of Magic',
    description: 'NPC 使用 LLM 动态对话与任务生成',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
    author: authors[5],
    playCount: 6000 + randInt(0, 2000),
    likes: 300 + randInt(50, 200),
    tags: ['RPG', 'AI NPC'],
    createdAt: daysAgo(randInt(5, 20)),
  },
  {
    id: 'g3',
    title: 'Space Tycoon AI',
    description: '经济由多 Agent 模拟的太空经营',
    thumbnail: 'https://images.unsplash.com/photo-1614728853913-1e2203d9d73e?w=800&q=80',
    author: authors[13],
    playCount: 4500 + randInt(0, 1500),
    likes: 200 + randInt(40, 150),
    tags: ['Strategy', 'Simulation'],
    createdAt: daysAgo(randInt(3, 18)),
  },
  {
    id: 'g4',
    title: 'Puzzle Quest VR',
    description: '物理解谜 VR，支持手势追踪',
    thumbnail: 'https://images.unsplash.com/photo-1592478411213-61535fdd861d?w=800&q=80',
    author: authors[14],
    playCount: 2800 + randInt(0, 1200),
    likes: 120 + randInt(30, 90),
    tags: ['Puzzle', 'VR'],
    createdAt: daysAgo(randInt(1, 14)),
  },
  {
    id: 'g5',
    title: 'Pixel Dungeon AI',
    description: '像素地牢，关卡由生成式模型拼接',
    thumbnail: 'https://images.unsplash.com/photo-1558980394-0a5fea5001dc?w=800&q=80',
    author: authors[2],
    playCount: 3600 + randInt(0, 900),
    likes: 180 + randInt(20, 80),
    tags: ['Roguelike', '2D'],
    createdAt: daysAgo(randInt(2, 16)),
  },
  {
    id: 'g6',
    title: 'Bot Soccer',
    description: '小型足球对抗，策略由 LLM 生成并解释',
    thumbnail: 'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=800&q=80',
    author: authors[8],
    playCount: 2200 + randInt(0, 700),
    likes: 95 + randInt(10, 60),
    tags: ['Sports', 'AI'],
    createdAt: daysAgo(randInt(1, 12)),
  },
];
