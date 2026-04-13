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

const tagPool = [
  'unity',
  'unity/urp',
  'unity/hdrp',
  'unity/dots',
  'unity/ecs',
  'unity/addressables',
  'unity/shadergraph',
  'ue',
  'ue/blueprint',
  'ue/gas',
  'godot',
  'cocos',
  'tuanjie',
  '2d',
  '3d',
  'rendering',
  'rendering/shader',
  'vfx',
  'animation',
  'ui',
  'performance',
  'profiling',
  'build',
  'webgl',
  'mobile',
  'netcode',
  'netcode/rollback',
  'procedural',
  'ai-npc',
  'behavior-tree',
  'audio',
  'chatgpt',
  'claude',
  'gemini',
  'perplexity',
  'cursor',
  'copilot',
  'midjourney',
  'stable-diffusion',
  'meshy',
  'luma',
  'runway',
  'pika',
  'adobe-substance',
  'notion',
  'miro',
];

const titles = [
  'Unity 2D 跑酷：跳跃缓冲 + Coyote Time 的手感调参',
  'URP 2D 光照与后处理：移动端性能取舍',
  'Addressables 资源分组策略：首包与热更新',
  'Unity DOTS/ECS 弹幕系统：10k 子弹不卡',
  'Shader Graph 卡通描边 + 溶解：节点图与关键参数',
  'GPU Instancing + SRP Batcher：DrawCall 优化实测',
  'Netcode 同步位移：插值、预测与回滚',
  'UE5 GAS：技能系统最小可用架构',
  'UE 蓝图做任务树：对话/任务/存档一体化',
  'Niagara 粒子：金币飞入与爆裂预设',
  'Godot 4 角色控制器：坡度、台阶、滑行处理',
  'Godot 行为树 AI：巡逻/追击/丢失目标',
  'Cocos Creator 3.x 三消：关卡数据驱动与调参',
  '团结引擎微信小游戏：包体与首帧优化清单',
  '物理解谜关卡：碰撞层与约束的坑',
  'Roguelike 房间生成：BSP vs WFC 的取舍',
  'AI 驱动 NPC 对话：从 Prompt 到落地数据结构',
  '关卡难度曲线：新手期 3 分钟怎么设计',
  'Unity 动画状态机：连招与打断的实现',
  '2D 像素风瓦片地图：自动拼接与边缘处理',
  '音效系统：事件驱动 + 混音器分组',
  '存档系统：版本兼容与数据迁移',
  'UI 架构：MVVM / Presenter 的取舍',
  '输入系统：手柄/键鼠/触屏统一映射',
  '内购/广告接入：不污染主逻辑的封装方式',
  '热更新脚本：Lua / HybridCLR 的边界与选型',
  '渲染序：半透明排序与 UI 遮挡问题',
  '相机系统：Cinemachine 震屏与跟随限制',
  '多人房间：匹配、断线重连、心跳',
  '工具链：一键打包、多渠道出包、版本号规范',
  '资源管线：贴图压缩、Atlas、导入规则自动化',
  '上线前 QA 清单：必测项与回归策略'
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

const generatedPosts: Post[] = Array.from({ length: 32 }).map((_, i) => {
  const author = authors[i % authors.length];
  const title = titles[i % titles.length];
  const likeCount = randInt(5, 380);
  const cCount = randInt(0, 12);
  const cAuthors = Array.from({ length: Math.min(cCount, 3) }).map(() => pick(authors));
  const comments = cAuthors.map((a, idx) => makeComment(`c-${i + 1}-${idx + 1}`, a));
  const desc = ['实践记录', '经验总结', '性能对比', '工具链分享', '踩坑合集', 'Unity 实战', 'UE 蓝图'][randInt(0, 6)];
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
  playChannel?: string;
  createdAt: string;
}

const GAME_COVER_URLS = import.meta.glob('../assets/game-covers/pc/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  as: 'url',
}) as Record<string, string>;

type GameCoverEntry = {
  title: string;
  url: string;
  fileName: string;
};

function gameTitleFromFileName(fileName: string): string {
  return fileName.replace(/\.(png|jpe?g|webp|svg)$/i, '').trim() || '游戏 Demo';
}

function gameDescriptionFromTitle(title: string): string {
  if (title.includes('赛博') || title.includes('朋克')) return `${title} · 霓虹都市动作与高对比光影`;
  if (title.includes('逃亡') || title.includes('神庙')) return `${title} · 高速跑酷与障碍反应挑战`;
  if (title.includes('模拟') || title.includes('城市')) return `${title} · 城市经营与建造系统 Demo`;
  if (title.includes('星际') || title.includes('穿越')) return `${title} · 太空探索与科幻叙事体验`;
  if (title.includes('战记') || title.includes('领主')) return `${title} · 角色成长与战斗推进`;
  if (title.includes('使命') || title.includes('呼唤')) return `${title} · 战术射击与关卡推进`;
  if (title.includes('荒野')) return `${title} · 开放世界探索与沉浸氛围`;
  if (title.includes('白马') || title.includes('彩虹')) return `${title} · 轻松风格的休闲动作体验`;
  return `${title} · 可试玩 Demo`;
}

function gameTagsFromTitle(title: string): string[] {
  if (title.includes('赛博') || title.includes('朋克')) return ['3d', 'rendering', 'vfx', 'unity/urp'];
  if (title.includes('逃亡') || title.includes('神庙')) return ['2d', 'mobile', 'performance', 'unity'];
  if (title.includes('模拟') || title.includes('城市')) return ['3d', 'ui', 'procedural'];
  if (title.includes('星际') || title.includes('穿越')) return ['3d', 'rendering', 'vfx', 'webgl'];
  if (title.includes('战记') || title.includes('领主')) return ['3d', 'ai-npc', 'behavior-tree'];
  if (title.includes('使命') || title.includes('呼唤')) return ['3d', 'netcode', 'vfx'];
  if (title.includes('荒野')) return ['3d', 'procedural', 'ai-npc'];
  if (title.includes('白马') || title.includes('彩虹')) return ['2d', 'animation', 'vfx'];
  return ['3d', 'ui'];
}

const gameCoverEntries: GameCoverEntry[] = Object.entries(GAME_COVER_URLS)
  .map(([path, url]) => {
    const fileName = path.split('/').pop() ?? path;
    return { fileName, url, title: gameTitleFromFileName(fileName) };
  })
  .sort((a, b) => a.fileName.localeCompare(b.fileName, 'zh-Hans-CN'));

export const mockGames: Game[] = gameCoverEntries.map((cover, idx) => {
  const title = cover.title;
  return {
    id: `g${idx + 1}`,
    title,
    description: gameDescriptionFromTitle(title),
    thumbnail: cover.url,
    author: pick(authors),
    playCount: 2400 + randInt(0, 9800),
    likes: 120 + randInt(0, 780),
    tags: gameTagsFromTitle(title),
    playChannel: idx === 0 ? '小游戏宿主' : undefined,
    createdAt: daysAgo(randInt(1, 26)),
  };
});

export type MockSkill = {
  id: string;
  title: string;
  description: string;
  type: 'prompt' | 'skill.md';
  author: string;
  likes: number;
  downloads: number;
  tags: string[];
  content: string;
};

export const mockSkills: MockSkill[] = [
  {
    id: '1',
    title: 'Unity 2D 跑酷游戏全套管线',
    description: '包含角色控制、地图无限生成、视差滚动背景与金币收集计分的完整 Prompt 链。',
    type: 'prompt',
    author: 'GameMaster',
    likes: 128,
    downloads: 450,
    tags: ['unity', '2d', 'unity/urp', 'cursor', 'copilot', 'build'],
    content: `你是资深 Unity 2D 跑酷游戏主程兼关卡策划。请按以下要求输出：\n\n【目标】\n生成一套可直接落地的 Unity 2D 跑酷完整开发管线（角色控制、无尽地图生成、视差背景、金币/障碍、计分与 UI）。\n\n【约束】\n- 引擎：Unity 2022 LTS\n- 渲染：URP 2D\n- 输入：新 Input System\n- 架构：事件总线 + ScriptableObject 配置\n\n【输出格式】\n1) 目录结构（Assets/...）\n2) 关键脚本清单（类名 + 职责 + 依赖）\n3) 角色控制：地面检测、跳跃缓冲、coyote time、加速度/减速度\n4) 地图生成：段落（Chunk）拼接策略、对象池、难度曲线\n5) 视差：多层滚动参数、相机绑定\n6) 计分：距离/金币/连击，结算逻辑\n7) UI：HUD、暂停、失败、复活\n8) 可测试性：最小可复现场景、调试开关\n\n现在开始输出。`,
  },
  {
    id: '2',
    title: 'RPG 对话系统与任务树配置',
    description: '标准化的 Skill.md，让 Agent 能够自动解析策划填写的 Excel 表格并生成对应的对话代码与节点。',
    type: 'skill.md',
    author: 'TechOtaku',
    likes: 256,
    downloads: 890,
    tags: ['ue', 'ue/blueprint', 'claude', 'ui'],
    content: `# Skill: RPG Dialogue & Quest Tree Generator\n\n## Goal\n将策划提供的 Excel/CSV 对话与任务配置，自动生成 UE(5.x) 可用的对话数据资产与任务树蓝图节点。\n\n## Inputs\n- dialogue.csv\n  - npc_id, node_id, text, choices(json), next_id\n- quest.csv\n  - quest_id, state, trigger, reward(json), next_state\n\n## Output\n- DataAssets:\n  - DA_Dialogue_{npc_id}\n  - DA_Quest_{quest_id}\n- Blueprints:\n  - BP_DialogueRunner\n  - BP_QuestStateMachine\n\n## Steps\n1. 校验表结构与唯一键（npc_id+node_id, quest_id+state）。\n2. 解析 choices(json) 并生成分支节点列表。\n3. 生成可视化任务树：Trigger -> State -> Reward -> Next。\n4. 输出蓝图调用示例：开始对话/推进任务/保存进度。\n\n## Constraints\n- 必须生成可读的错误报告（缺失字段、循环引用、非法 next_id）。\n- 所有字符串需支持本地化 key。\n\n## Deliverables\n- 资产命名规范\n- 生成日志与错误清单\n- 示例关卡：NPCTestMap\n`,
  },
  {
    id: '3',
    title: '像素风场景生成提示词库',
    description: 'Midjourney/Stable Diffusion 专用的场景提示词模板，稳定输出等距视角的像素风瓦片地图。',
    type: 'prompt',
    author: 'PixelArtFan',
    likes: 89,
    downloads: 210,
    tags: ['2d', 'rendering', 'vfx', 'midjourney', 'stable-diffusion'],
    content: `你是像素美术总监。请生成“等距像素风瓦片地图”的图像提示词模板。\n\n【目标】\n输出 8 个场景模板：森林/雪原/沙漠/沼泽/城镇/地牢/海港/天空城。\n\n【通用要求】\n- isometric pixel art, tileable, clean outline\n- consistent palette, 16-bit era vibe\n- no text, no watermark, no logo\n- top-down/isometric ambiguity must be resolved to isometric\n\n【每个模板包含】\n- Midjourney 版本（含 --ar、--stylize、--seed 占位）\n- Stable Diffusion 版本（正向 + 反向 + 推荐采样器与步数）\n- 3 个变体关键词（昼夜/季节/风格）\n\n现在开始输出。`,
  },
  {
    id: '4',
    title: 'UI 动效与粒子效果自动生成',
    description: '教导 AI 如何在 Godot 中用纯代码实现弹窗的果冻动画及金币飞入粒子的配置文件。',
    type: 'skill.md',
    author: 'GodotDev',
    likes: 342,
    downloads: 1200,
    tags: ['godot', 'ui', 'animation', 'vfx'],
    content: `# Skill: Godot UI Motion & Particle Pack\n\n## Goal\n在 Godot 4 中用纯代码生成 UI 弹窗动效（果冻/回弹）与金币飞入粒子（GPUParticles2D）。\n\n## Inputs\n- UI 组件信息：节点路径、目标尺寸、锚点\n- 粒子参数：发射点、目标点、数量、持续时间、贴图路径\n\n## Outputs\n- Tween 动画脚本片段（可复用函数）\n- 粒子 preset（JSON）\n- Demo Scene：UIFxDemo.tscn\n\n## Implementation\n1) Jelly Pop\n- scale: 0.8 -> 1.05 -> 0.98 -> 1.0\n- easing: out_back + out_elastic 混合\n\n2) Coin Fly\n- emit burst\n- velocity towards target with slight arc\n- on finish: add score, play sfx\n\n## Constraints\n- 不使用编辑器手动 tween\n- 所有参数可配置\n`,
  },
  {
    id: '5',
    title: '一页式 GDD + 竞品拆解 Prompt（立项阶段）',
    description: '面向立项与原型：快速产出一页式 GDD、核心循环、竞品对标与风险清单。',
    type: 'prompt',
    author: 'PM_AIGo',
    likes: 204,
    downloads: 980,
    tags: ['chatgpt', 'perplexity', 'notion'],
    content: `你是资深游戏策划 + 产品经理。请基于我给你的想法，输出“一页式 GDD + 竞品拆解”。\n\n【输入】\n- 游戏一句话：\n- 平台：PC/移动/主机/Web\n- 受众：\n- 参考游戏（可选）：\n\n【输出】\n1) 核心循环（30 字）\n2) 玩法系统拆解（3-5 个系统）\n3) 关卡/成长/经济（只给最小闭环）\n4) 竞品对标（至少 3 个：差异点/可抄点/不可抄点）\n5) 里程碑（MVP→可玩→上线）\n6) 风险清单（技术/美术/运营/商业化）\n\n现在开始，先向我提 5 个关键澄清问题，再输出结果。`,
  },
  {
    id: '6',
    title: 'Stable Diffusion 精灵序列生成与切图导入（Skill.md）',
    description: '从提示词到 SpriteSheet，再到 Unity/UE 导入的标准步骤与参数建议。',
    type: 'skill.md',
    author: 'ArtPipeline',
    likes: 173,
    downloads: 760,
    tags: ['stable-diffusion', 'midjourney', 'leonardo'],
    content: `# Skill: Sprite Sequence → SpriteSheet → Engine Import\n\n## Goal\n将 AI 生成的角色动作/特效帧序列，整理为 SpriteSheet 并导入引擎（Unity/UE）。\n\n## Steps\n1) 生成帧序列\n- 统一角色占位、相机距离、背景纯色\n- 固定 seed / prompt 模板\n\n2) 清理背景与抖动\n- 背景去除\n- 中心点对齐（pivot）\n- 帧间抖动修正\n\n3) 合成 SpriteSheet\n- 行列布局\n- 命名规则：action_dir_frame\n\n4) 引擎导入\n- Unity: Sprite(2D), no mipmap, point/bi-linear（按风格）\n- UE: Paper2D / Flipbook\n\n## Deliverables\n- SpriteSheet.png\n- meta.json（行列/帧率/事件点）\n- 导入检查清单\n`,
  },
  {
    id: '7',
    title: 'WebGL 玩法原型：输入/状态机/事件总线 Prompt',
    description: '在浏览器端快速搭建可玩的玩法原型（状态机 + 事件总线 + UI）。',
    type: 'prompt',
    author: 'FrontendGameplay',
    likes: 142,
    downloads: 540,
    tags: ['cursor', 'copilot', 'webgl'],
    content: `你是资深前端游戏开发工程师。请用 TypeScript 输出一个可运行的 WebGL/Canvas 玩法原型架构。\n\n【要求】\n- 输入：键鼠/触控统一\n- 架构：状态机（FSM）+ 事件总线 + 数据层（store）\n- UI：HUD/暂停/结算\n- 可扩展：技能/道具/敌人\n\n【输出】\n- 目录结构\n- 核心类（Game, Scene, Entity, Systems）\n- 事件定义与示例\n- 最小可跑 Demo 的伪代码/代码骨架\n\n现在开始输出。`,
  },
  {
    id: '8',
    title: '多人协作代码规范与 PR 模板（Skill.md）',
    description: '给 AI 编程助手的规范化约束：分支策略、PR 模板、代码风格与自动化检查。',
    type: 'skill.md',
    author: 'DevLead',
    likes: 198,
    downloads: 610,
    tags: ['copilot', 'cursor'],
    content: `# Skill: Team Coding Policy (AI-Friendly)\n\n## Goal\n让 AI 编程助手在多人协作中输出“可合并、可审查、可回滚”的代码。\n\n## Policy\n- 每次只做一个主题变更\n- 必须提供：变更点列表 + 影响范围 + 回归自测点\n- 禁止：写入敏感信息、日志泄露、破坏性重构\n\n## PR Template\n- What\n- Why\n- How\n- Screenshots\n- Tests\n- Risk\n\n## Lint/Check\n- TypeScript: tsc --noEmit\n- ESLint\n\n## Deliverables\n- PR.md\n- CODESTYLE.md\n- CI checks\n`,
  },
  {
    id: '9',
    title: 'BGM 主题生成 Prompt（不同场景变体）',
    description: '为关卡/菜单/战斗等不同场景生成一致主题的游戏 BGM 变体。',
    type: 'prompt',
    author: 'AudioDesigner',
    likes: 121,
    downloads: 430,
    tags: ['suno', 'soundraw'],
    content: `你是游戏音频总监。请为一个游戏主题生成 6 个 BGM 变体。\n\n【输入】\n- 游戏题材与世界观：\n- 主旋律关键词：\n- 风格参考：\n\n【输出】\n- Menu/Exploration/Battle/Boss/Win/Lose 六段提示词\n- 每段包含：BPM、主乐器、情绪、结构（A/B/Bridge）\n- 保持主题动机一致（motif）\n\n现在开始。`,
  },
  {
    id: '10',
    title: '角色配音与情绪表（Skill.md）',
    description: '把文案/情绪/语速/音色统一成可自动生成的配音配置表。',
    type: 'skill.md',
    author: 'VO_Pipeline',
    likes: 156,
    downloads: 520,
    tags: ['elevenlabs', 'playht'],
    content: `# Skill: Voice Acting Spec Generator\n\n## Goal\n将角色台词整理为可批量生成的配音配置（情绪、语速、停顿、音色）。\n\n## Inputs\n- character_profile.md\n- lines.csv (id, character, text, emotion, speed, pause_ms)\n\n## Outputs\n- voice_jobs.json\n- 文件命名：{character}_{id}.wav\n- 对应字幕：{id}.srt\n\n## Constraints\n- 情绪枚举统一（calm/angry/sad/happy/fear）\n- 统一 LUFS 目标与噪声门限\n\n## Deliverables\n- 批量生成脚本调用示例\n- QA 清单（爆音/断句/重复字）\n`,
  },
  {
    id: '11',
    title: '引擎内一键生成场景与资产 Prompt（插件式）',
    description: '在引擎内触发：输入需求 → 生成资源 → 自动放到场景里。',
    type: 'prompt',
    author: 'EngineAgent',
    likes: 187,
    downloads: 680,
    tags: ['unity-mcp', 'codely', 'bezi'],
    content: `你是游戏引擎内置 AI 助手。请根据我的自然语言需求，生成“可直接落地”的引擎内操作步骤。\n\n【要求】\n- 输出：创建哪些资源（Prefab/Material/AudioClip/Script）\n- 输出：资源导入设置（压缩、过滤、尺寸）\n- 输出：场景放置（坐标、层级、命名）\n- 输出：可回滚（撤销步骤）\n\n现在等待我的需求。`,
  },
  {
    id: '12',
    title: 'UE 蓝图生成与性能检查（Skill.md）',
    description: '让 AI 生成可读的蓝图逻辑，并附带性能热点检查清单。',
    type: 'skill.md',
    author: 'UE_Tools',
    likes: 211,
    downloads: 740,
    tags: ['amara', 'flockbay', 'ue', 'ue/blueprint'],
    content: `# Skill: UE Blueprint Builder + Perf Checklist\n\n## Goal\n根据需求生成 UE 蓝图（角色/交互/AI），并给出性能检查清单。\n\n## Steps\n1) 用事件图（Event Graph）搭建最小闭环\n2) 将频繁逻辑搬到函数/宏并做 Tick 限制\n3) 引入数据资产驱动（DataAsset/DataTable）\n\n## Perf Checklist\n- Tick 是否必要\n- 组件数量与动态创建\n- 物理与碰撞的开销\n- 蓝图循环与递归\n\n## Deliverables\n- 蓝图节点描述（可复制）\n- 示例关卡与测试步骤\n`,
  },
];

export const mockSkillComments: Record<string, Array<{ authorName: string; content: string; createdAt: string }>> = {
  '1': [
    { authorName: '张伟', content: '这个 Prompt 结构很清晰，尤其是 Chunk 对象池那块，照着做基本就能跑起来。', createdAt: daysAgo(2) },
    { authorName: 'Alice Wu', content: '建议再补一段关于 Addressables/资源加载的约束，会更完整。', createdAt: daysAgo(3) },
  ],
  '2': [
    { authorName: 'David Kim', content: 'Excel 校验 + 循环引用检测太关键了，之前我们就踩过 next_id 死循环。', createdAt: daysAgo(5) },
  ],
  '3': [
    { authorName: 'Emily Wang', content: '反向词“no text / watermark”很实用，像素瓦片一致性确实更稳了。', createdAt: daysAgo(1) },
  ],
  '4': [
    { authorName: '赵欣', content: 'Tween 组合 out_back + out_elastic 这个手感很棒，Godot 4 适配没问题。', createdAt: daysAgo(4) },
  ],
};
