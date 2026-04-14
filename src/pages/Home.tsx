import { forwardRef, type TransitionEvent, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Code2, MessageSquare, Music2, Palette, Plus, ShoppingBag, TerminalSquare, Wand2, X } from 'lucide-react';
import { Feed } from '../components/Feed';
import { HeroSearch, type HomeTab } from '../components/HeroSearch';
import { SkillMarket } from '../components/SkillMarket';
import { Badge } from '../components/ui/Badge';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { AIToolchainSidebar } from '../components/AIToolchainSidebar';
import { AIChatWidget, type AIChatWidgetHandle } from '../components/AIChatWidget';
import { GameGallery } from './GameGallery';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { aiToolchainData, type AIToolchainCategory } from '../data/aiToolchain';
import { mockGames, mockSkills, type Game, type MockSkill } from '../data/mock';
import { mockEvents } from '../data/mockEvents';
import { upsertProject } from '../data/projectAssetsStore';
import { useAuthStore } from '../stores/authStore';
import { apiCreateProject, isApiConfigured } from '../lib/apiClient';

const GAME_ICON_URLS = Object.values(
  import.meta.glob('../assets/game-icons/*.{png,jpg,jpeg,webp,svg}', { eager: true, as: 'url' })
) as string[];

const STYLE_MODEL_IMAGE_URLS = import.meta.glob('../assets/style-models/**/*.{png,jpg,jpeg,webp}', {
  eager: true,
  as: 'url',
}) as Record<string, string>;

const GAME_TEMPLATE_IMAGE_URLS = import.meta.glob('../assets/game-templates/**/*.{png,jpg,jpeg,webp}', {
  eager: true,
  as: 'url',
}) as Record<string, string>;

const CHARACTER_TEMPLATE_IMAGE_URLS = import.meta.glob('../assets/character-templates/*.{png,jpg,jpeg,webp}', {
  eager: true,
  as: 'url',
}) as Record<string, string>;

type StyleModelImage = {
  url: string;
  fileName: string;
  path: string;
};

type StyleModel = {
  id: string;
  name: string;
  images: StyleModelImage[];
  coverUrl: string;
};

type HomeTemplateKind = 'style' | 'game' | 'character';

type HomeTemplatePack = {
  id: string;
  name: string;
  coverUrl: string;
  images: StyleModelImage[];
  kind: HomeTemplateKind;
  styleModelId?: string;
};

type BlueprintNode = {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
};

type BlueprintEdge = {
  id: string;
  from: string;
  to: string;
};

type BlueprintViewportState = {
  camera: { x: number; y: number };
  scale: number;
  nodeW: number;
  nodeH: number;
  nodes: Record<string, BlueprintNode>;
};

type PipelineBlueprintHandle = {
  ensureStage: (stageId: string) => void;
};

type PipelineResourceKind = 'prototype' | 'code' | 'audio' | 'engine';

type PipelineResource = {
  id: string;
  title: string;
  description: string;
  coverUrl: string | null;
  kind: PipelineResourceKind;
  content: string;
};

function toSafeFileName(input: string): string {
  return input
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function styleModelDescription(name: string): string {
  const map: Record<string, string> = {
    写实森林: '写实自然光 · 森林地形与植被氛围',
    卡通城市: '卡通渲染 · 城市场景与建筑体块',
    废土生存: '废土末世 · 荒凉质感与生存氛围',
    海盗港口: '海盗题材 · 港口建筑与航海元素',
    火山熔岩: '熔岩火山 · 高对比光影与热浪氛围',
    维多利亚工业: '维多利亚工业 · 机械结构与蒸汽风格',
    魔法地牢: '奇幻地牢 · 魔法元素与地下空间',
  };
  return map[name] ?? '可用于生成同风格场景与资产';
}

function buildStyleModelPrompt(name: string): string {
  return `使用风格模型「${name}」。请按这个风格生成我需要的游戏资产：`;
}

function buildTemplatePacksFromFolder(
  segment: string,
  urls: Record<string, string>,
  kind: Exclude<HomeTemplateKind, 'style'>
): HomeTemplatePack[] {
  const entries = Object.entries(urls).map(([path, url]) => {
    const after = path.split(`/${segment}/`)[1] ?? '';
    const parts = after.split('/');
    const fileName = parts[parts.length - 1] ?? after;
    const packName =
      parts.length >= 2
        ? (parts[0] ?? '模板')
        : (fileName.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '模板');
    return { url, fileName, packName, path };
  });

  const map = new Map<string, StyleModelImage[]>();
  for (const e of entries) {
    const arr = map.get(e.packName) ?? [];
    arr.push({ url: e.url, fileName: e.fileName, path: e.path });
    map.set(e.packName, arr);
  }

  const toSortKey = (fileName: string) => {
    const base = fileName.replace(/\.(png|jpg|jpeg|webp)$/i, '');
    const n = Number.parseInt(base, 10);
    if (Number.isFinite(n)) return n;
    return Number.MAX_SAFE_INTEGER;
  };

  const packs: HomeTemplatePack[] = [];
  for (const [name, images] of map.entries()) {
    const sorted = [...images].sort((a, b) => toSortKey(a.fileName) - toSortKey(b.fileName));
    const cover = sorted.find((x) => /^1\./.test(x.fileName))?.url ?? sorted[0]?.url ?? '';
    if (!cover) continue;
    packs.push({ id: `${kind}:${name}`, name, coverUrl: cover, images: sorted, kind });
  }
  return packs.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

function modIndex(i: number, n: number): number {
  if (n <= 0) return 0;
  return ((i % n) + n) % n;
}

export function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const openModal = useAuthStore((s) => s.openModal);
  const [activeTab, setActiveTab] = useState<HomeTab>('hot');
  const [toolchainOpen, setToolchainOpen] = useState(false);
  const [toolchainClosing, setToolchainClosing] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [skillModalId, setSkillModalId] = useState<string | null>(null);
  const [modelModalId, setModelModalId] = useState<string | null>(null);
  const [modelActiveIndex, setModelActiveIndex] = useState(0);
  const [templateModalId, setTemplateModalId] = useState<string | null>(null);
  const [templateActiveIndex, setTemplateActiveIndex] = useState(0);
  const [templateProcessOpen, setTemplateProcessOpen] = useState(false);
  const [activeStyleModelId, setActiveStyleModelId] = useState<string | null>(null);
  const [pipelineResourceModal, setPipelineResourceModal] = useState<PipelineResource | null>(null);
  const [blueprintSelectedStageId, setBlueprintSelectedStageId] = useState<string | null>(null);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [toolPickerOpen, setToolPickerOpen] = useState(false);
  const toolPickerRef = useRef<HTMLDivElement | null>(null);
  const aiChatRef = useRef<AIChatWidgetHandle | null>(null);
  const aiBlockRef = useRef<HTMLDivElement | null>(null);
  const [aiDraft, setAiDraft] = useState('');
  const aiDraftRef = useRef<HTMLTextAreaElement | null>(null);
  const [blueprintViewport, setBlueprintViewport] = useState<BlueprintViewportState | null>(null);
  const [workflowSidebarOpen, setWorkflowSidebarOpen] = useState(false);
  const [workflowSidebarTab, setWorkflowSidebarTab] = useState<'pipeline' | 'resources' | 'games'>('pipeline');
  const selectedSkill = useMemo<MockSkill | null>(() => {
    if (!skillModalId) return null;
    return mockSkills.find((s) => s.id === skillModalId) ?? null;
  }, [skillModalId]);
  const styleModels = useMemo<StyleModel[]>(() => {
    const entries = Object.entries(STYLE_MODEL_IMAGE_URLS).map(([path, url]) => {
      const after = path.split('/style-models/')[1] ?? '';
      const parts = after.split('/');
      const modelName = parts[0] ?? '未命名';
      const fileName = parts[parts.length - 1] ?? after;
      return { modelName, path, url, fileName };
    });

    const map = new Map<string, StyleModelImage[]>();
    for (const e of entries) {
      const arr = map.get(e.modelName) ?? [];
      arr.push({ url: e.url, fileName: e.fileName, path: e.path });
      map.set(e.modelName, arr);
    }

    const toSortKey = (fileName: string) => {
      const base = fileName.replace(/\.(png|jpg|jpeg|webp)$/i, '');
      const n = Number.parseInt(base, 10);
      if (Number.isFinite(n)) return n;
      return Number.MAX_SAFE_INTEGER;
    };

    const models: StyleModel[] = [];
    for (const [name, images] of map.entries()) {
      const sorted = [...images].sort((a, b) => toSortKey(a.fileName) - toSortKey(b.fileName));
      const cover = sorted.find((x) => /^1\./.test(x.fileName))?.url ?? sorted[0]?.url ?? '';
      if (!cover) continue;
      models.push({ id: name, name, images: sorted, coverUrl: cover });
    }
    return models.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  }, []);

  const gameTemplatePacks = useMemo<HomeTemplatePack[]>(
    () => buildTemplatePacksFromFolder('game-templates', GAME_TEMPLATE_IMAGE_URLS, 'game'),
    []
  );
  const characterTemplatePacks = useMemo<HomeTemplatePack[]>(
    () => buildTemplatePacksFromFolder('character-templates', CHARACTER_TEMPLATE_IMAGE_URLS, 'character'),
    []
  );

  const allTemplatePacks = useMemo<HomeTemplatePack[]>(() => {
    const style = styleModels.map((m) => ({
      id: `style:${m.id}`,
      name: m.name,
      coverUrl: m.coverUrl,
      images: m.images,
      kind: 'style' as const,
      styleModelId: m.id,
    }));
    return [...style, ...gameTemplatePacks, ...characterTemplatePacks];
  }, [characterTemplatePacks, gameTemplatePacks, styleModels]);

  const homeTemplatePacks = useMemo<HomeTemplatePack[]>(() => {
    const style = styleModels.map((m) => ({
      id: `style:${m.id}`,
      name: m.name,
      coverUrl: m.coverUrl,
      images: m.images,
      kind: 'style' as const,
      styleModelId: m.id,
    }));
    const groups = [style, gameTemplatePacks, characterTemplatePacks];
    const cursors = [0, 0, 0];
    const limit = 18;
    const out: HomeTemplatePack[] = [];
    while (out.length < limit) {
      let progressed = false;
      for (let gi = 0; gi < groups.length && out.length < limit; gi += 1) {
        const group = groups[gi];
        const idx = cursors[gi] ?? 0;
        if (idx < group.length) {
          out.push(group[idx]!);
          cursors[gi] = idx + 1;
          progressed = true;
        }
      }
      if (!progressed) break;
    }
    return out;
  }, [characterTemplatePacks, gameTemplatePacks, styleModels]);

  const selectedTemplatePack = useMemo<HomeTemplatePack | null>(() => {
    if (!templateModalId) return null;
    return allTemplatePacks.find((p) => p.id === templateModalId) ?? null;
  }, [allTemplatePacks, templateModalId]);
  const selectedModel = useMemo<StyleModel | null>(() => {
    if (!modelModalId) return null;
    return styleModels.find((m) => m.id === modelModalId) ?? null;
  }, [modelModalId, styleModels]);
  const activeStyleModel = useMemo<StyleModel | null>(() => {
    if (!activeStyleModelId) return null;
    return styleModels.find((m) => m.id === activeStyleModelId) ?? null;
  }, [activeStyleModelId, styleModels]);

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [keyword, setKeyword] = useState<string>('');
  const projectIdFromQuery = (query.get('project') ?? '').trim();
  const tabFromQuery = (query.get('tab') ?? '').trim();
  const isWorkflowView = projectIdFromQuery.length > 0;
  const isTabView =
    !isWorkflowView &&
    (tabFromQuery === 'hot' || tabFromQuery === 'latest' || tabFromQuery === 'skills' || tabFromQuery === 'games');
  const isProjectHub = !isWorkflowView && !isTabView;
  const eventBaseCount = mockEvents.length;
  const [eventCarouselPaused, setEventCarouselPaused] = useState<boolean>(false);
  const [eventIndex, setEventIndex] = useState<number>(0);
  const [eventAnimating, setEventAnimating] = useState<boolean>(false);
  const [eventAnimDir, setEventAnimDir] = useState<'next' | 'prev' | null>(null);
  const eventAnimTimerRef = useRef<number | null>(null);
  const eventPreloadRef = useRef<Set<string>>(new Set());
  const eventAnimCommittedRef = useRef<boolean>(false);
  const stageIdFromQuery = (query.get('stage') ?? '').trim();
  const stages = aiToolchainData;
  const stageIndexFromQuery = useMemo(() => {
    if (stageIdFromQuery.length === 0) return 0;
    const idx = stages.findIndex((s) => s.id === stageIdFromQuery);
    return idx >= 0 ? idx : 0;
  }, [stageIdFromQuery, stages]);
  const [stageIndex, setStageIndex] = useState<number>(stageIndexFromQuery);
  const activeStageToolIds = useMemo(() => stages[stageIndex]?.tools.map((t) => t.id) ?? [], [stageIndex, stages]);
  const activeStageId = stages[stageIndex]?.id ?? '';
  const blueprintSelectedStage = useMemo(() => {
    if (!blueprintSelectedStageId) return null;
    return stages.find((s) => s.id === blueprintSelectedStageId) ?? null;
  }, [blueprintSelectedStageId, stages]);
  const activeTool = useMemo(() => {
    if (!blueprintSelectedStage) return null;
    if (!activeToolId) return null;
    return blueprintSelectedStage.tools.find((t) => t.id === activeToolId) ?? null;
  }, [activeToolId, blueprintSelectedStage]);

  const goNextEvent = () => {
    if (eventBaseCount <= 1) return;
    if (eventAnimating) return;
    eventAnimCommittedRef.current = false;
    setEventAnimDir('next');
    setEventAnimating(true);
    if (eventAnimTimerRef.current) window.clearTimeout(eventAnimTimerRef.current);
    eventAnimTimerRef.current = window.setTimeout(() => {
      if (eventAnimCommittedRef.current) return;
      eventAnimCommittedRef.current = true;
      setEventIndex((v) => modIndex(v + 1, eventBaseCount));
      setEventAnimating(false);
      setEventAnimDir(null);
    }, 820);
  };

  const goPrevEvent = () => {
    if (eventBaseCount <= 1) return;
    if (eventAnimating) return;
    eventAnimCommittedRef.current = false;
    setEventAnimDir('prev');
    setEventAnimating(true);
    if (eventAnimTimerRef.current) window.clearTimeout(eventAnimTimerRef.current);
    eventAnimTimerRef.current = window.setTimeout(() => {
      if (eventAnimCommittedRef.current) return;
      eventAnimCommittedRef.current = true;
      setEventIndex((v) => modIndex(v - 1, eventBaseCount));
      setEventAnimating(false);
      setEventAnimDir(null);
    }, 820);
  };

  useEffect(() => {
    return () => {
      if (eventAnimTimerRef.current) window.clearTimeout(eventAnimTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isProjectHub) return;
    if (eventBaseCount <= 0) return;
    const n = eventBaseCount;
    const idxs = [eventIndex - 2, eventIndex - 1, eventIndex, eventIndex + 1, eventIndex + 2].map((i) => modIndex(i, n));
    const urls = idxs
      .map((i) => mockEvents[i]?.coverUrl)
      .filter((u): u is string => typeof u === 'string' && u.length > 0);

    urls.forEach((url) => {
      if (eventPreloadRef.current.has(url)) return;
      eventPreloadRef.current.add(url);
      const img = new Image();
      img.src = url;
      const anyImg = img as unknown as { decode?: () => Promise<void> };
      if (anyImg.decode) {
        anyImg.decode().catch(() => void 0);
      }
    });
  }, [eventBaseCount, eventIndex, isProjectHub]);

  useEffect(() => {
    if (!isProjectHub) return;
    if (eventCarouselPaused) return;
    if (eventBaseCount <= 1) return;
    const timer = window.setInterval(() => {
      goNextEvent();
    }, 5200);
    return () => window.clearInterval(timer);
  }, [eventCarouselPaused, eventBaseCount, isProjectHub]);

  useEffect(() => {
    if (!toolPickerOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = toolPickerRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setToolPickerOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [toolPickerOpen]);
  const prototypeGameplayResources = useMemo<PipelineResource[]>(() => {
    const raw = [
      {
        id: 'proto-runner',
        title: '无尽跑酷',
        description: '核心循环、关卡段落（Chunk）、计分与数值节奏',
        content: `# 无尽跑酷 · 开发文档拆解（示例）\n\n## 1. 核心循环\n- 开始 → 跑动/收集/躲避 → 失败 → 结算/复活 → 再来一局\n\n## 2. 关键系统\n- 角色控制：跳跃缓冲、coyote time、加速曲线\n- 关卡生成：Chunk 拼接、对象池、难度递增\n- 经济：金币/道具/复活点\n- UI：HUD、暂停、结算\n\n## 3. 里程碑\n- Day 1：可跑 + 可死\n- Day 3：生成关卡 + 计分\n- Day 7：完整闭环 + 可发布 Demo\n`,
      },
      {
        id: 'proto-match3',
        title: '三消',
        description: '棋盘规则、掉落补齐、目标与关卡胜负条件',
        content: `# 三消 · 开发文档拆解（示例）\n\n## 1. 棋盘规则\n- 网格尺寸：8x8（可配置）\n- 交换：相邻两格，若产生消除则生效\n\n## 2. 消除与特效\n- 3 连：普通消除\n- 4 连：直线特效\n- 5 连：彩球/炸弹\n\n## 3. 关卡目标\n- 达到分数\n- 收集指定元素\n- 清除障碍（冰块/锁链）\n\n## 4. 数据结构\n- BoardState\n- Cell\n- MatchResult\n- FallStep\n`,
      },
      {
        id: 'proto-towerdef',
        title: '塔防',
        description: '路径、刷怪波次、塔升级与克制关系',
        content: `# 塔防 · 开发文档拆解（示例）\n\n## 1. 核心循环\n- 布塔 → 开波 → 击杀 → 获得金币 → 升级/补塔\n\n## 2. 系统拆解\n- 路径：节点序列/网格寻路（取其一）\n- 敌人：血量、速度、抗性\n- 防御塔：射程、攻速、弹道、范围伤害\n- 波次：出怪表、精英/ Boss\n\n## 3. 平衡点\n- 单位 DPS vs HP\n- 金币回报 vs 难度\n`,
      },
      {
        id: 'proto-roguelike',
        title: '肉鸽',
        description: '房间生成、掉落与构筑，死亡回圈',
        content: `# Roguelike · 开发文档拆解（示例）\n\n## 1. 核心\n- 关卡房间树\n- 随机掉落\n- 构筑（Build）\n\n## 2. 生成策略\n- 房间类型：战斗/宝箱/商店/事件\n- 权重表：随层数变化\n\n## 3. 进程与存档\n- 本局存档\n- 元进程（解锁）\n`,
      },
    ];
    return raw.map((r) => ({ ...r, kind: 'prototype' as const, coverUrl: pickGameIconUrl(r.id) }));
  }, []);
  const prototypeWorldResources = useMemo<PipelineResource[]>(() => {
    const raw = [
      {
        id: 'world-fantasy',
        title: '奇幻世界',
        description: '阵营、地图、资源与冲突主线',
        content: `# 游戏背景 · 奇幻世界观拆解（示例）\n\n## 1. 世界规则\n- 魔法来源与代价\n- 科技/宗教/势力平衡\n\n## 2. 地图结构\n- 核心主城\n- 边境与副本区域\n- 交通与关卡门槛\n\n## 3. 冲突主线\n- 反派目标与动机\n- 玩家介入点\n- 章节推进节奏\n`,
      },
      {
        id: 'world-sci-fi',
        title: '科幻世界',
        description: '科技树、势力格局与剧情关键节点',
        content: `# 游戏背景 · 科幻世界观拆解（示例）\n\n## 1. 科技设定\n- 能源/跃迁/AI\n- 武器与防护\n\n## 2. 势力格局\n- 联邦/企业/叛军\n- 资源争夺点\n\n## 3. 剧情节点\n- 触发事件\n- 中期反转\n- 终局抉择\n`,
      },
      {
        id: 'world-postapoc',
        title: '废土世界',
        description: '生存规则、聚落经济与危机事件',
        content: `# 游戏背景 · 废土世界观拆解（示例）\n\n## 1. 生存规则\n- 水/食物/燃料\n- 辐射与药物\n\n## 2. 聚落经济\n- 贸易品与稀缺资源\n- 装备维修与升级\n\n## 3. 危机事件\n- 风暴/变异潮\n- 掠夺者袭击\n`,
      },
    ];
    return raw.map((r) => ({ ...r, kind: 'prototype' as const, coverUrl: pickGameIconUrl(r.id) }));
  }, []);
  const prototypeCharacterResources = useMemo<PipelineResource[]>(() => {
    const raw = [
      {
        id: 'char-hero-sheet',
        title: '主角模板',
        description: '动机、性格弧线、能力与限制',
        content: `# 角色原型 · 主角角色卡（模板）\n\n## 1. 基本信息\n- 名称/年龄/职业\n- 关键外观特征\n\n## 2. 动机与目标\n- 外显目标\n- 内在需求\n\n## 3. 能力与限制\n- 技能树方向\n- 明确短板\n\n## 4. 成长弧线\n- 起点 → 转折 → 终点\n`,
      },
      {
        id: 'char-villain-sheet',
        title: '反派模板',
        description: '对立目标、价值观与行为逻辑',
        content: `# 角色原型 · 反派角色卡（模板）\n\n## 1. 反派目标\n- 想要什么\n- 为什么现在行动\n\n## 2. 行为逻辑\n- 手段与底线\n- 与玩家的镜像关系\n\n## 3. 出场节奏\n- 预告 → 正面冲突 → 终局\n`,
      },
      {
        id: 'char-npc-pack',
        title: 'NPC组合',
        description: '商人/导师/任务发布者等功能性角色设计',
        content: `# 角色原型 · NPC 组合（示例）\n\n- 商人：稀缺品与折扣机制\n- 导师：技能解锁与教学关\n- 任务发布者：主线/支线节奏\n- 情报贩子：地图与线索\n`,
      },
    ];
    return raw.map((r) => ({ ...r, kind: 'prototype' as const, coverUrl: pickGameIconUrl(r.id) }));
  }, []);
  const artCharacterResources = useMemo<PipelineResource[]>(() => {
    const list = styleModels.slice(0, 4).map((m) => ({
      id: `art-char-${m.id}`,
      title: m.name,
      description: '角色设定与风格参考（示例）',
      coverUrl: m.coverUrl,
      kind: 'prototype' as const,
      content: `# 角色形象 · ${m.name}（示例）\n\n## 目标\n- 产出角色三视图/表情/服装变体\n\n## 交付物\n- 主角/敌人/中立 NPC\n- 轮廓与配色规范\n\n## 生成提示词方向\n- 风格：${m.name}\n- 关键词：材质、轮廓、光照、背景简化\n`,
    }));
    return list;
  }, [styleModels]);
  const artSceneResources = useMemo<PipelineResource[]>(() => {
    const list = styleModels.slice(4).map((m) => ({
      id: `art-scene-${m.id}`,
      title: m.name,
      description: '场景氛围、构图与素材参考（示例）',
      coverUrl: m.coverUrl,
      kind: 'prototype' as const,
      content: `# 场景搭建 · ${m.name}（示例）\n\n## 目标\n- 产出场景 key art + 可拆分素材列表\n\n## 拆分建议\n- 前景/中景/远景\n- 地面/墙体/道具\n\n## 生成提示词方向\n- 风格：${m.name}\n- 关键词：建筑语言、可玩动线、光影层次\n`,
    }));
    return list;
  }, [styleModels]);
  const audioSfxResources = useMemo<PipelineResource[]>(() => {
    const raw = [
      {
        id: 'sfx-casual',
        title: '三消音效',
        description: '点击、合成、连消、奖励、失败等 UI/反馈音效',
        content: `# 休闲/三消 · 音效拆解（示例）\n\n## UI\n- hover / click / back\n- open/close panel\n- reward popup\n\n## 玩法反馈\n- swap\n- match3/match4/match5\n- combo chain\n- clear obstacle\n\n## 结算\n- win / lose\n- stars reveal\n`,
      },
      {
        id: 'sfx-rpg',
        title: 'RPG音效',
        description: '技能、受击、UI、环境与战斗节奏',
        content: `# RPG · 音效拆解（示例）\n\n## 战斗\n- attack swing / hit\n- skill cast / impact\n- critical / dodge\n\n## 环境\n- footsteps (material)\n- ambience loop\n\n## UI\n- inventory open/close\n- equip/unequip\n- quest update\n`,
      },
      {
        id: 'sfx-shooter',
        title: '射击音效',
        description: '枪械、爆炸、脚步、近战与 UI 反馈',
        content: `# 射击/动作 · 音效拆解（示例）\n\n## 武器\n- fire / reload / empty\n- shell drop\n\n## 爆炸\n- grenade\n- debris\n\n## 移动\n- footsteps\n- slide / jump / land\n`,
      },
    ];
    return raw.map((r) => ({ ...r, kind: 'audio' as const, coverUrl: pickGameIconUrl(r.id) }));
  }, []);
  const audioMusicResources = useMemo<PipelineResource[]>(() => {
    const raw = [
      {
        id: 'bgm-menu',
        title: '主城BGM',
        description: '轻量、循环友好、不抢戏',
        content: `# 场景音乐 · 菜单/主城（示例）\n\n## 目标\n- 60–120s loop\n- 低频干净，避免疲劳\n\n## 结构\n- A(主题) → B(轻变化) → 回到 A\n\n## 变体\n- 白天/夜晚/节日\n`,
      },
      {
        id: 'bgm-explore',
        title: '探索BGM',
        description: '节奏推进、氛围塑造、可无缝切换',
        content: `# 场景音乐 · 探索（示例）\n\n## 目标\n- 分层（Layer）设计\n- 遇敌时叠加张力层\n\n## 结构\n- base layer + tension layer\n\n## 触发\n- 进入战斗/离开战斗\n`,
      },
      {
        id: 'bgm-battle',
        title: '战斗BGM',
        description: '高辨识主题动机 + 清晰节拍',
        content: `# 场景音乐 · 战斗（示例）\n\n## 目标\n- BPM 与手感同步\n- 主题动机可复用\n\n## 结构\n- Intro → Loop → Stinger\n\n## Stinger\n- 胜利/失败短音\n`,
      },
    ];
    return raw.map((r) => ({ ...r, kind: 'audio' as const, coverUrl: pickGameIconUrl(r.id) }));
  }, []);

  const resourceGroups = useMemo(() => {
    if (activeStageId === 'concept') {
      return [
        { id: 'gameplay', title: '游戏玩法', resources: prototypeGameplayResources },
        { id: 'world', title: '游戏背景', resources: prototypeWorldResources },
        { id: 'character', title: '角色原型', resources: prototypeCharacterResources },
      ];
    }
    if (activeStageId === 'art') {
      return [
        { id: 'art-character', title: '角色形象', resources: artCharacterResources },
        { id: 'art-scene', title: '场景搭建', resources: artSceneResources },
      ];
    }
    if (activeStageId === 'audio') {
      return [
        { id: 'sfx', title: '游戏音效', resources: audioSfxResources },
        { id: 'bgm', title: '场景音乐', resources: audioMusicResources },
      ];
    }
    return [];
  }, [
    activeStageId,
    artCharacterResources,
    artSceneResources,
    audioMusicResources,
    audioSfxResources,
    prototypeCharacterResources,
    prototypeGameplayResources,
    prototypeWorldResources,
  ]);

  useEffect(() => {
    document.documentElement.classList.add('no-scrollbar');
    return () => {
      document.documentElement.classList.remove('no-scrollbar');
    };
  }, []);

  useEffect(() => {
    if (!isTabView) return;
    const tab = (query.get('tab') ?? '').trim();
    if (tab === 'hot' || tab === 'latest' || tab === 'skills' || tab === 'games') {
      setActiveTab(tab);
    }
    const tagsRaw = (query.get('tags') ?? '').trim();
    if (tagsRaw) {
      const list = tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8);
      setSelectedTags(list);
    } else {
      setSelectedTags([]);
    }
    const q = (query.get('q') ?? '').trim();
    setKeyword(q);
  }, [isTabView, query]);

  useEffect(() => {
    if (!isTabView) return;
    const next = new URLSearchParams(window.location.search);
    next.set('tab', activeTab);
    if (selectedTags.length > 0) next.set('tags', selectedTags.join(','));
    else next.delete('tags');
    if (keyword.trim().length > 0) next.set('q', keyword.trim());
    else next.delete('q');
    const nextSearch = next.toString();
    const current = window.location.search.replace(/^\?/, '');
    if (nextSearch === current) return;
    navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
  }, [activeTab, isTabView, location.pathname, navigate, selectedTags, keyword]);

  useEffect(() => {
    if (!isWorkflowView) return;
    setStageIndex(stageIndexFromQuery);
  }, [isWorkflowView, stageIndexFromQuery]);

  useEffect(() => {
    if (!isWorkflowView) return;
    const next = new URLSearchParams(window.location.search);
    if (stages[stageIndex]?.id) next.set('stage', stages[stageIndex].id);
    else next.delete('stage');
    next.delete('tab');
    next.delete('tags');
    next.delete('q');
    const nextSearch = next.toString();
    const current = window.location.search.replace(/^\?/, '');
    if (nextSearch === current) return;
    navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
  }, [isWorkflowView, location.pathname, navigate, stageIndex, stages]);

  useEffect(() => {
    if (!toolchainOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToolchainClosing(true);
        setToolchainOpen(false);
        window.setTimeout(() => setToolchainClosing(false), 720);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toolchainOpen]);

  useEffect(() => {
    const onCloseEvent = () => {
      setToolchainClosing(true);
      setToolchainOpen(false);
      window.setTimeout(() => setToolchainClosing(false), 720);
    };
    window.addEventListener('toolchain:close', onCloseEvent as EventListener);
    return () => window.removeEventListener('toolchain:close', onCloseEvent as EventListener);
  }, []);
  const openToolchain = () => {
    setToolchainClosing(false);
    setToolchainOpen(true);
  };

  const blueprintRef = useRef<PipelineBlueprintHandle | null>(null);
  const selectBlueprintStage = (stageId: string) => {
    setBlueprintSelectedStageId(stageId);
    const idx = stages.findIndex((s) => s.id === stageId);
    if (idx >= 0) setStageIndex(idx);
    const stage = stages.find((s) => s.id === stageId);
    const firstTool = stage?.tools.find((t) => t.isTop) ?? stage?.tools[0] ?? null;
    setActiveToolId(firstTool?.id ?? null);
    setToolPickerOpen(false);
    window.setTimeout(() => aiDraftRef.current?.focus(), 0);
  };
  const addBlueprintStage = (stageId: string) => {
    blueprintRef.current?.ensureStage(stageId);
  };

  const createNewProject = (template?: { id: string; name: string }) => {
    if (!user) {
      openModal('signIn');
      return;
    }
    if (!isApiConfigured()) {
      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `p_${Date.now()}`;
      try {
        localStorage.setItem('oc:lastProjectId', id);
      } catch {
        void 0;
      }
      const name = template ? `${template.name} 项目` : `新项目 ${new Date().toLocaleDateString()}`;
      upsertProject({ id, name });
      const next = new URLSearchParams();
      next.set('project', id);
      if (template) next.set('template', template.id);
      navigate({ pathname: '/workspace', search: next.toString() });
      return;
    }
    const token = session?.access_token ?? '';
    if (!token) return;
    apiCreateProject({ accessToken: token, name: template ? `${template.name} 项目` : `新项目 ${new Date().toLocaleDateString()}` })
      .then((res) => {
        try {
          localStorage.setItem('oc:lastProjectId', res.data.id);
        } catch {
          void 0;
        }
        const next = new URLSearchParams();
        next.set('project', res.data.id);
        if (template) next.set('template', template.id);
        navigate({ pathname: '/workspace', search: next.toString() });
      })
      .catch(() => void 0);
  };

  const openMarket = () => {
    if (!user) {
      openModal('signIn');
      return;
    }
    let projectId = '';
    try {
      projectId = (localStorage.getItem('oc:lastProjectId') ?? '').trim();
    } catch {
      projectId = '';
    }
    const next = new URLSearchParams();
    if (projectId) next.set('project', projectId);
    const search = next.toString();
    if (search) navigate({ pathname: '/my-assets', search });
    else navigate('/my-assets');
  };

  const closeToolchain = () => {
    setToolchainClosing(true);
    setToolchainOpen(false);
    window.setTimeout(() => setToolchainClosing(false), 720);
  };

  return (
    <main className="relative">
      <style>{`
        @keyframes drawerIn {
          0% { transform: translateX(-120%) scale(0.96); filter: blur(2px); }
          35% { transform: translateX(6px) scale(0.996); filter: blur(0.5px); }
          60% { transform: translateX(0px) scale(1.0); filter: blur(0px); }
          100% { transform: translateX(0) scale(1.0); filter: blur(0px); }
        }
        @keyframes drawerOut {
          0% { transform: translateX(0) scale(1.0); filter: blur(0px); }
          30% { transform: translateX(-6px) scale(0.998); }
          100% { transform: translateX(-120%) scale(0.96); }
        }
        @keyframes backdropIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes backdropOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      {(toolchainOpen || toolchainClosing) && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-sm pointer-events-auto"
            style={{
              animation: toolchainOpen
                ? 'backdropIn 520ms cubic-bezier(0.20, 0.00, 0.00, 1.00) both'
                : 'backdropOut 720ms cubic-bezier(0.15, 0.00, 0.85, 1.00) both',
            }}
            onClick={closeToolchain}
            aria-hidden="true"
          />
          <aside
            className="absolute left-0 top-0 bottom-0 ui-drawer bg-surface border-r border-border will-change-transform pointer-events-auto"
            style={{
              animation: toolchainOpen
                ? 'drawerIn 560ms cubic-bezier(0.20, 0.00, 0.00, 1.00) both'
                : 'drawerOut 720ms cubic-bezier(0.15, 0.00, 0.85, 1.00) both',
            }}
          >
            <div className="h-full flex flex-col">
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
                <div className="text-sm font-semibold text-foreground">AI 工具链</div>
                <button
                  type="button"
                  onClick={closeToolchain}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-surface border border-border hover:bg-surface-2 transition-colors"
                  aria-label="关闭"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <AIToolchainSidebar mode="drawer" />
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className={isWorkflowView ? 'w-full px-0 lg:px-2 py-6' : 'mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-10 2xl:px-12 pt-4 pb-8'}>
        {isProjectHub ? (
          <div className="w-full">
            <section id="home-events" className="mt-1">
              <div
                className="relative group/events"
                onMouseEnter={() => setEventCarouselPaused(true)}
                onMouseLeave={() => setEventCarouselPaused(false)}
              >
                <div className="relative w-full h-[232px] sm:h-[262px] md:h-[232px] lg:h-[276px] 2xl:h-[308px]" style={{ perspective: '1200px', perspectiveOrigin: '50% 40%' }}>
                  {eventBaseCount > 0 && (
                    <>
                      {(() => {
                        const n = eventBaseCount;
                        const left = modIndex(eventIndex - 1, n);
                        const center = modIndex(eventIndex, n);
                        const right = modIndex(eventIndex + 1, n);
                        const incoming = eventAnimDir === 'next' ? modIndex(eventIndex + 2, n) : modIndex(eventIndex - 2, n);

                        const easing = 'cubic-bezier(0.20, 0.00, 0.00, 1.00)';
                        const duration = '680ms';

                        const leftPos = 'translateX(-160%) translateZ(-120px) rotateY(18deg) scale(0.92)';
                        const centerPos = 'translateX(-50%) translateZ(0px) rotateY(0deg) scale(1)';
                        const rightPos = 'translateX(60%) translateZ(-120px) rotateY(-18deg) scale(0.92)';
                        const offLeft = 'translateX(-260%) translateZ(-220px) rotateY(24deg) scale(0.84)';
                        const offRight = 'translateX(160%) translateZ(-220px) rotateY(-24deg) scale(0.84)';

                        const baseCard =
                          'absolute top-0 left-1/2 flex flex-col gap-3 w-[calc((100%-1.5rem)/3)] transition-[transform,opacity,filter] will-change-transform';
                        const baseStyle = {
                          transitionTimingFunction: easing,
                          transitionDuration: eventAnimating ? duration : '0ms',
                        } as const;

                        const filterSide = 'brightness(0.9)';
                        const filterCenter = 'brightness(1.06)';

                        const cardCenterClass =
                          'relative w-full h-[180px] sm:h-[210px] md:h-[180px] lg:h-[224px] 2xl:h-[256px] overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-border/75 shadow-e3 transition-all';
                        const cardSideClass =
                          'relative w-full h-[180px] sm:h-[210px] md:h-[180px] lg:h-[224px] 2xl:h-[256px] overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-border/55 transition-all';

                        const overlayCenterClass =
                          'absolute inset-0 pointer-events-none bg-[radial-gradient(760px_circle_at_50%_-10%,rgba(var(--brand-2)/0.28),transparent_62%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(var(--background)/0.42)_100%)] opacity-60';
                        const overlayLeftClass =
                          'absolute inset-0 pointer-events-none bg-[radial-gradient(420px_circle_at_0%_45%,rgba(var(--brand-2)/0.20),transparent_64%),linear-gradient(90deg,rgba(var(--surface-2)/0.18)_0%,rgba(var(--surface-2)/0.04)_42%,rgba(var(--background)/0.48)_100%)] opacity-68';
                        const overlayRightClass =
                          'absolute inset-0 pointer-events-none bg-[radial-gradient(420px_circle_at_100%_45%,rgba(var(--brand-2)/0.20),transparent_64%),linear-gradient(90deg,rgba(var(--background)/0.48)_0%,rgba(var(--surface-2)/0.04)_58%,rgba(var(--surface-2)/0.18)_100%)] opacity-68';

                        const commit = (dir: 'next' | 'prev') => {
                          if (!eventAnimating) return;
                          if (eventAnimCommittedRef.current) return;
                          eventAnimCommittedRef.current = true;
                          if (eventAnimTimerRef.current) window.clearTimeout(eventAnimTimerRef.current);
                          setEventIndex((v) => (dir === 'next' ? modIndex(v + 1, eventBaseCount) : modIndex(v - 1, eventBaseCount)));
                          setEventAnimating(false);
                          setEventAnimDir(null);
                        };

                        const imageEl = (idx: number) => (
                          <img
                            src={mockEvents[idx]!.coverUrl}
                            alt={mockEvents[idx]!.title}
                            className="block h-full w-full object-cover opacity-[0.98] transition-opacity [backface-visibility:hidden]"
                            draggable={false}
                            loading="eager"
                            decoding="async"
                            onError={(e) => {
                              const el = e.currentTarget;
                              if (el.dataset.fallbackApplied === '1') return;
                              el.dataset.fallbackApplied = '1';
                              el.src = '/default-game.svg';
                            }}
                          />
                        );

                        const titleEl = (idx: number) => (
                          <div className="flex h-11 flex-col gap-1 px-1">
                            <div className="text-xs text-muted-foreground truncate">{mockEvents[idx]!.subtitle}</div>
                            <div className="text-[15px] font-semibold text-foreground truncate">{mockEvents[idx]!.title}</div>
                          </div>
                        );

                        const renderItem = (
                          idx: number,
                          key: string,
                          isCenter: boolean,
                          transform: string,
                          opacity: number,
                          zIndex: number,
                          filter: string,
                          origin: '100% 50%' | '50% 50%' | '0% 50%',
                          overlay: string,
                          onEnd?: (e: TransitionEvent<HTMLAnchorElement>) => void,
                          hideOnMobile?: boolean
                        ) => (
                          <Link
                            key={key}
                            to="/events"
                            state={{ eventId: mockEvents[idx]!.id }}
                            className={`${hideOnMobile ? 'hidden md:flex ' : ''}${baseCard}`}
                            style={{
                              ...baseStyle,
                              transform,
                              opacity,
                              zIndex,
                              filter,
                              transformOrigin: origin,
                              transformStyle: 'preserve-3d',
                              pointerEvents: eventAnimating ? 'none' : 'auto',
                            }}
                            onTransitionEnd={onEnd}
                          >
                            <div className={isCenter ? cardCenterClass : cardSideClass}>
                              {imageEl(idx)}
                              <div className={overlay} />
                            </div>
                            {titleEl(idx)}
                          </Link>
                        );

                        if (!eventAnimating) {
                          return (
                            <>
                              {renderItem(left, `ev-${left}`, false, leftPos, 1, 10, filterSide, '100% 50%', overlayLeftClass, undefined, true)}
                              {renderItem(center, `ev-${center}`, true, centerPos, 1, 20, filterCenter, '50% 50%', overlayCenterClass)}
                              {renderItem(right, `ev-${right}`, false, rightPos, 1, 10, filterSide, '0% 50%', overlayRightClass, undefined, true)}
                            </>
                          );
                        }

                        if (eventAnimDir === 'next') {
                          return (
                            <>
                              {renderItem(left, `ev-${left}`, false, offLeft, 0, 1, filterSide, '100% 50%', overlayLeftClass, undefined, true)}
                              {renderItem(center, `ev-${center}`, false, leftPos, 1, 10, filterSide, '100% 50%', overlayLeftClass, undefined, true)}
                              {renderItem(
                                right,
                                `ev-${right}`,
                                true,
                                centerPos,
                                1,
                                20,
                                filterCenter,
                                '50% 50%',
                                overlayCenterClass,
                                (e) => {
                                  if (e.target !== e.currentTarget) return;
                                  if (e.propertyName !== 'transform') return;
                                  commit('next');
                                },
                                true
                              )}
                              {renderItem(incoming, `ev-${incoming}`, false, rightPos, 1, 10, filterSide, '0% 50%', overlayRightClass, undefined, true)}
                            </>
                          );
                        }

                        return (
                          <>
                            {renderItem(incoming, `ev-${incoming}`, false, leftPos, 1, 10, filterSide, '100% 50%', overlayLeftClass, undefined, true)}
                            {renderItem(
                              left,
                              `ev-${left}`,
                              true,
                              centerPos,
                              1,
                              20,
                              filterCenter,
                              '50% 50%',
                              overlayCenterClass,
                              (e) => {
                                if (e.target !== e.currentTarget) return;
                                if (e.propertyName !== 'transform') return;
                                commit('prev');
                              },
                              true
                            )}
                            {renderItem(center, `ev-${center}`, false, rightPos, 1, 10, filterSide, '0% 50%', overlayRightClass, undefined, true)}
                            {renderItem(right, `ev-${right}`, false, offRight, 0, 1, filterSide, '0% 50%', overlayRightClass, undefined, true)}
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
                
                {/* Left/Right Navigation Arrows */}
                <button
                  type="button"
                  disabled={eventBaseCount <= 1 || eventAnimating}
                  aria-label="上一页活动"
                  className="absolute left-0 top-[90px] sm:top-[105px] md:top-[90px] lg:top-[112px] 2xl:top-[128px] -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-surface/85 border border-border/70 text-foreground/80 hover:bg-surface hover:text-foreground hover:scale-105 flex items-center justify-center backdrop-blur-md transition-all opacity-100 disabled:opacity-40 disabled:hover:scale-100 pointer-events-auto"
                  onClick={() => {
                    goPrevEvent();
                  }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  disabled={eventBaseCount <= 1 || eventAnimating}
                  aria-label="下一页活动"
                  className="absolute right-0 top-[90px] sm:top-[105px] md:top-[90px] lg:top-[112px] 2xl:top-[128px] -translate-y-1/2 translate-x-1/2 w-10 h-10 rounded-full bg-surface/85 border border-border/70 text-foreground/80 hover:bg-surface hover:text-foreground hover:scale-105 flex items-center justify-center backdrop-blur-md transition-all opacity-100 disabled:opacity-40 disabled:hover:scale-100 pointer-events-auto"
                  onClick={() => {
                    goNextEvent();
                  }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Pagination Dots */}
                <div className="flex justify-center items-center gap-1.5 mt-5">
                  {Array.from({ length: eventBaseCount }).map((_, idx) => (
                    <button
                      key={`event-page-dot-${idx}`}
                      type="button"
                      aria-label={`切换到第 ${idx + 1} 个活动`}
                      className={`h-1 w-6 rounded-full transition-all ${
                        eventBaseCount > 0 && idx === modIndex(eventIndex, eventBaseCount)
                          ? 'bg-foreground/35'
                          : 'bg-foreground/15 hover:bg-foreground/25'
                      }`}
                      onClick={() => {
                        if (eventAnimating) return;
                        setEventIndex(idx);
                      }}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-20 lg:mt-24">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[21px] leading-tight font-semibold text-foreground/90 tracking-tight">快速开始</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  className="group relative text-left rounded-2xl border border-border/60 bg-surface-2/40 hover:bg-surface-2/55 hover:border-border-strong hover:shadow-e2 transition-all overflow-hidden"
                  onClick={createNewProject}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(520px_circle_at_10%_15%,rgba(99,102,241,0.35),transparent_55%),radial-gradient(420px_circle_at_85%_20%,rgba(168,85,247,0.22),transparent_60%),linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] opacity-90" />
                  <div className="relative p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl border border-border/60 bg-surface/55 backdrop-blur-sm flex items-center justify-center">
                      <Plus className="w-6 h-6 text-foreground/90" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-foreground/90 tracking-tight">创建新项目</div>
                      <div className="mt-1 text-xs text-muted-foreground">进入游戏开发工作流</div>
                    </div>
                    <div className="ml-auto shrink-0">
                      <div className="h-8 px-4 rounded-full border border-border/60 bg-surface/55 backdrop-blur-sm text-xs font-semibold text-foreground-soft/85 inline-flex items-center">
                        免费使用
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="group relative text-left rounded-2xl border border-border/60 bg-surface-2/40 hover:bg-surface-2/55 hover:border-border-strong hover:shadow-e2 transition-all overflow-hidden"
                  onClick={openMarket}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(520px_circle_at_10%_15%,rgba(20,184,166,0.28),transparent_55%),radial-gradient(420px_circle_at_85%_20%,rgba(59,130,246,0.22),transparent_60%),linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] opacity-90" />
                  <div className="relative p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl border border-border/60 bg-surface/55 backdrop-blur-sm flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-foreground/90" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-foreground/90 tracking-tight">我的资产库</div>
                      <div className="mt-1 text-xs text-muted-foreground">技能 / 工具 / 模板</div>
                    </div>
                    <div className="ml-auto shrink-0">
                      <div className="h-8 px-4 rounded-full border border-border/60 bg-surface/55 backdrop-blur-sm text-xs font-semibold text-foreground-soft/85 inline-flex items-center">
                        立即查看
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="group relative text-left rounded-2xl border border-border/60 bg-surface-2/40 hover:bg-surface-2/55 hover:border-border-strong hover:shadow-e2 transition-all overflow-hidden"
                  onClick={() => void 0}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(520px_circle_at_10%_15%,rgba(168,85,247,0.26),transparent_55%),radial-gradient(420px_circle_at_85%_20%,rgba(236,72,153,0.14),transparent_60%),linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] opacity-90" />
                  <div className="relative p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl border border-border/60 bg-surface/55 backdrop-blur-sm flex items-center justify-center">
                      <Wand2 className="w-6 h-6 text-foreground/90" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-foreground/90 tracking-tight">寻找灵感</div>
                      <div className="mt-1 text-xs text-muted-foreground">浏览案例与方向（即将上线）</div>
                    </div>
                    <div className="ml-auto shrink-0">
                      <div className="h-8 px-4 rounded-full border border-border/60 bg-surface/55 backdrop-blur-sm text-xs font-semibold text-foreground-soft/85 inline-flex items-center">
                        敬请期待
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="group relative text-left rounded-2xl border border-border/60 bg-surface-2/40 hover:bg-surface-2/55 hover:border-border-strong hover:shadow-e2 transition-all overflow-hidden"
                  onClick={() => {
                    const next = new URLSearchParams();
                    next.set('tab', 'hot');
                    navigate({ pathname: '/', search: next.toString() });
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(520px_circle_at_10%_15%,rgba(59,130,246,0.24),transparent_55%),radial-gradient(420px_circle_at_85%_20%,rgba(34,197,94,0.16),transparent_60%),linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] opacity-90" />
                  <div className="relative p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl border border-border/60 bg-surface/55 backdrop-blur-sm flex items-center justify-center">
                      <Code2 className="w-6 h-6 text-foreground/90" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-foreground/90 tracking-tight">实践学习</div>
                      <div className="mt-1 text-xs text-muted-foreground">进入开发者社区学习与交流</div>
                    </div>
                    <div className="ml-auto shrink-0">
                      <div className="h-8 px-4 rounded-full border border-border/60 bg-surface/55 backdrop-blur-sm text-xs font-semibold text-foreground-soft/85 inline-flex items-center">
                        去看看
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </section>

            <section className="mt-10">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to="/assets"
                    className="inline-flex items-center gap-1 text-[21px] leading-tight font-semibold text-foreground/90 tracking-tight hover:opacity-90 transition-opacity"
                  >
                    模板库 <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Link>
                  <div className="text-[13px] font-medium text-foreground-soft/80 tracking-tight mt-[0.3rem]">近期热门</div>
                </div>
                <div className="shrink-0">
                  <Link
                    to="/assets"
                    className="h-9 px-3 rounded-full border border-border bg-surface/70 hover:bg-surface transition-colors text-xs font-semibold text-foreground inline-flex items-center"
                  >
                    查看全部
                  </Link>
                </div>
              </div>
              <div className="mt-[1.2rem] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-6">
                {homeTemplatePacks.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="group text-left flex flex-col gap-2.5"
                    onClick={() => {
                      setTemplateProcessOpen(false);
                      setTemplateActiveIndex(0);
                      setTemplateModalId(p.id);
                    }}
                  >
                    <div className="relative w-full aspect-square overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-e1 group-hover:border-border-strong group-hover:shadow-e2 transition-all">
                      <div className="absolute top-2 left-2 z-10 h-6 px-2 rounded-full bg-surface/55 border border-border/60 backdrop-blur-sm flex items-center">
                        <span className="text-[11px] font-semibold tracking-tight text-foreground-soft/80">
                          {p.kind === 'style' ? '风格' : p.kind === 'game' ? '游戏' : '角色'}
                        </span>
                      </div>
                      <img
                        src={p.coverUrl}
                        alt={p.name}
                        className="block h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        draggable={false}
                        loading="lazy"
                      />
                    </div>
                    <div className="px-0.5">
                      <div className="text-[13px] font-semibold text-foreground/85 truncate">{p.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[21px] leading-tight font-semibold text-foreground/90 tracking-tight">游戏空间</div>
                  <div className="text-[13px] font-medium text-foreground-soft/80 tracking-tight mt-[0.3rem]">近期热门</div>
                </div>
                <div className="shrink-0">
                  <Link
                    to="/games"
                    className="h-9 px-3 rounded-full border border-border bg-surface/70 hover:bg-surface transition-colors text-xs font-semibold text-foreground inline-flex items-center"
                  >
                    查看全部
                  </Link>
                </div>
              </div>
              <div className="mt-[1.2rem] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockGames.slice(0, 9).map((g) => (
                  <Link
                    key={`home-game-${g.id}`}
                    to={`/games/${g.id}`}
                    className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface hover:border-border-strong hover:shadow-e1 transition-all"
                  >
                    <div className="relative w-full aspect-video bg-surface-2 overflow-hidden">
                      <img
                        src={g.thumbnail}
                        alt={g.title}
                        className="block h-full w-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500"
                        draggable={false}
                        loading="lazy"
                        onError={(e) => {
                          const el = e.currentTarget;
                          if (el.dataset.fallbackApplied === '1') return;
                          el.dataset.fallbackApplied = '1';
                          el.src = '/default-game.svg';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="flex items-center justify-between gap-3 text-[11px] font-semibold">
                          <div className="min-w-0 truncate text-foreground-soft">
                            {g.author?.handle ?? '@anonymous'}
                          </div>
                          <div className="shrink-0 text-muted-foreground">
                            ★ {g.likes.toLocaleString()}
                          </div>
                        </div>
                        <div className="mt-1 text-[15px] font-semibold text-foreground tracking-tight truncate">
                          {g.title}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : isTabView ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <section className="col-span-1 lg:col-span-9 min-w-0">
              <HeroSearch
                activeTab={activeTab}
                onTabChange={setActiveTab}
                selectedTags={selectedTags}
                onSelectedTagsChange={setSelectedTags}
                searchQuery={keyword}
                onSearchChange={setKeyword}
                onSearchSubmit={() => {
                  if (activeTab !== 'hot' && activeTab !== 'latest') setActiveTab('hot');
                }}
              />

              {activeTab === 'hot' || activeTab === 'latest' ? (
                <Feed mode={activeTab} tags={selectedTags} keyword={keyword} />
              ) : activeTab === 'skills' ? (
                <div className="mt-6">
                  <SkillMarket tags={selectedTags} keyword={keyword} />
                </div>
              ) : (
                <div className="mt-6">
                  <GameGallery embedded />
                </div>
              )}
            </section>

            <aside className="hidden lg:block lg:col-span-3 space-y-8">
              <ModelShowcaseRail
                models={styleModels}
                onOpenModel={(id) => {
                  setModelActiveIndex(0);
                  setModelModalId(id);
                }}
                onUseModel={(id) => {
                  const model = styleModels.find((m) => m.id === id);
                  if (!model) return;
                  setActiveStyleModelId(model.id);
                  setAiDraft(buildStyleModelPrompt(model.name));
                  window.setTimeout(() => aiDraftRef.current?.focus(), 0);
                  aiBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />

              <footer className="text-xs text-muted-foreground px-2">
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <a href="#" className="hover:text-foreground">About</a>
                  <a href="#" className="hover:text-foreground">Privacy</a>
                  <a href="#" className="hover:text-foreground">Terms</a>
                  <a href="#" className="hover:text-foreground">API</a>
                  <span>© 2026 AiGo</span>
                </div>
              </footer>
            </aside>
          </div>
        ) : (
          <div className="relative">
            {!workflowSidebarOpen && (
              <button
                type="button"
                className="fixed right-4 top-24 z-40 h-10 px-3 rounded-full border border-border bg-surface/80 backdrop-blur-sm shadow-e2 text-xs font-semibold text-foreground inline-flex items-center gap-2 hover:shadow-e3 hover:border-border-strong transition-all duration-200"
                onClick={() => setWorkflowSidebarOpen(true)}
              >
                面板
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            )}

            <div className="mx-auto w-full px-2 lg:px-4">
              <div className="ui-panel ui-panel-sticky overflow-hidden flex flex-col">
                <div className="ui-panel-header px-5 py-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground tracking-tight">游戏开发工作流</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">拖动空白移动视角 · 滚轮缩放 · 点击节点打开 AI</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      className="h-9 px-3 rounded-full border border-border bg-surface/70 hover:bg-surface transition-colors text-xs font-semibold text-foreground"
                      onClick={openToolchain}
                    >
                      工具链
                    </button>
                    <button
                      type="button"
                      className="h-9 px-3 rounded-full border border-border bg-surface/70 hover:bg-surface transition-colors text-xs font-semibold text-foreground"
                      onClick={() => setWorkflowSidebarOpen(true)}
                    >
                      侧栏
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 p-5 relative">
                  {Object.keys(blueprintViewport?.nodes ?? {}).length === 0 && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <button
                        type="button"
                        className="pointer-events-auto ui-cta-card-sm flex flex-col items-center justify-center gap-2.5"
                        onClick={() => addBlueprintStage('concept')}
                      >
                        <div className="w-12 h-12 rounded-xl border border-border bg-surface/70 flex items-center justify-center">
                          <Plus className="w-6 h-6 text-foreground" />
                        </div>
                        <div className="text-lg font-semibold text-foreground tracking-tight">快速开始</div>
                        <div className="text-xs text-muted-foreground font-medium">点击生成一个“原型”流程蓝图</div>
                      </button>
                    </div>
                  )}
                  <PipelineBlueprint
                    ref={blueprintRef}
                    stages={stages}
                    selectedStageId={blueprintSelectedStageId}
                    onViewportChange={setBlueprintViewport}
                    onSelectStage={selectBlueprintStage}
                    onClearSelection={() => {
                      setBlueprintSelectedStageId(null);
                      setActiveToolId(null);
                      setToolPickerOpen(false);
                      setAiDraft('');
                    }}
                  />

                  {blueprintSelectedStage && blueprintViewport?.nodes[blueprintSelectedStage.id] && (
                    <div className="absolute inset-0 z-30 pointer-events-none">
                      <div
                        className="absolute left-0 top-0"
                        style={{
                          transform: `translate(${blueprintViewport.camera.x}px, ${blueprintViewport.camera.y}px) scale(${blueprintViewport.scale})`,
                          transformOrigin: '0 0',
                        }}
                      >
                        <div
                          ref={aiBlockRef}
                          data-bp-overlay
                          className="absolute pointer-events-auto"
                          style={{
                            left: blueprintViewport.nodes[blueprintSelectedStage.id].x + blueprintViewport.nodeW + 18,
                            top: blueprintViewport.nodes[blueprintSelectedStage.id].y,
                            width: 390,
                          }}
                        >
                            <div className="rounded-xl border border-border bg-surface/95 backdrop-blur-sm shadow-e3 overflow-hidden">
                              <div className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="w-9 h-9 rounded-xl border border-border bg-surface/70 hover:bg-surface transition-colors inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                                    aria-label="对话"
                                  >
                                    <MessageSquare className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    type="button"
                                    className="w-9 h-9 rounded-xl border border-border bg-surface/70 hover:bg-surface transition-colors inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                                    aria-label="添加"
                                  >
                                    <Plus className="w-4.5 h-4.5" />
                                  </button>
                                  <div className="ml-auto flex items-center gap-2">
                                    {activeStyleModel && (
                                      <Badge variant="secondary" className="bg-surface border border-border text-muted-foreground text-[11px] font-bold">
                                        {activeStyleModel.name}
                                      </Badge>
                                    )}
                                    <button
                                      type="button"
                                      className="w-9 h-9 rounded-xl border border-border bg-surface/70 hover:bg-surface transition-colors inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                                      aria-label="关闭"
                                      onClick={() => {
                                        setBlueprintSelectedStageId(null);
                                        setActiveToolId(null);
                                        setToolPickerOpen(false);
                                        setAiDraft('');
                                      }}
                                    >
                                      <X className="w-4.5 h-4.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-3 text-[11px] text-muted-foreground font-medium truncate">{blueprintSelectedStage.title}</div>

                                <Textarea
                                  ref={aiDraftRef}
                                  value={aiDraft}
                                  onChange={(e) => setAiDraft(e.target.value)}
                                  placeholder="描述任何你想要生成的内容"
                                  className="mt-2 min-h-[86px] max-h-[180px] resize-none border-0 bg-transparent px-1 py-1 text-base leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
                                />

                                <div className="mt-3 flex items-center gap-3">
                                  <div className="relative flex-1 min-w-0" ref={toolPickerRef}>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-surface/70 hover:bg-surface transition-colors max-w-full"
                                      onClick={() => setToolPickerOpen((v) => !v)}
                                    >
                                      {activeTool ? (
                                        <img src={activeTool.logo} alt={activeTool.name} className="w-5 h-5 object-contain" draggable={false} />
                                      ) : (
                                        <div className="w-5 h-5 rounded-md bg-surface-2 border border-border" />
                                      )}
                                      <div className="text-sm font-semibold text-foreground truncate">
                                        {activeTool ? activeTool.name : '选择工具'}
                                      </div>
                                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                                    </button>

                                    {toolPickerOpen && (
                                      <div className="absolute z-40 left-0 right-0 bottom-full mb-2 ui-popover overflow-hidden">
                                        <div className="max-h-[320px] overflow-y-auto no-scrollbar p-2">
                                          {blueprintSelectedStage.tools.map((t) => (
                                            <button
                                              key={t.id}
                                              type="button"
                                              className={
                                                t.id === activeToolId
                                                  ? 'w-full text-left rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 flex items-center gap-3'
                                                  : 'w-full text-left rounded-xl border border-border bg-surface hover:bg-surface-2 px-3 py-2.5 flex items-center gap-3'
                                              }
                                              onClick={() => {
                                                setActiveToolId(t.id);
                                                setToolPickerOpen(false);
                                                setAiDraft((prev) => (prev.trim().length > 0 ? prev : `使用工具「${t.name}」：`));
                                                window.setTimeout(() => aiDraftRef.current?.focus(), 0);
                                              }}
                                            >
                                              <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center overflow-hidden">
                                                <img src={t.logo} alt={t.name} className="w-5 h-5 object-contain" draggable={false} />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-sm font-semibold text-foreground truncate">{t.name}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    className={
                                      aiDraft.trim().length > 0
                                        ? 'w-12 h-12 rounded-xl bg-primary text-primary-foreground inline-flex items-center justify-center shadow-e2'
                                        : 'w-12 h-12 rounded-xl bg-surface-2 text-muted-foreground inline-flex items-center justify-center border border-border'
                                    }
                                    aria-label="发送"
                                    disabled={aiDraft.trim().length === 0}
                                    onClick={async () => {
                                      const text = aiDraft.trim();
                                      if (!text) return;
                                      await aiChatRef.current?.sendText(text);
                                      setAiDraft('');
                                      window.setTimeout(() => aiDraftRef.current?.focus(), 0);
                                    }}
                                  >
                                    <ArrowUp className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <AIChatWidget ref={aiChatRef} threadId="home-ai" title="" hint="" showEmptyHint={false} className="hidden" />
                          </div>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>

            {workflowSidebarOpen && (
              <div className="fixed inset-0 z-50">
                <div
                  className="absolute inset-0 bg-background/35 backdrop-blur-sm"
                  onClick={() => setWorkflowSidebarOpen(false)}
                  aria-hidden="true"
                />
                <aside className="absolute right-4 top-20 bottom-4 w-rail-left ui-panel overflow-hidden flex flex-col">
                  <div className="ui-panel-header px-4 py-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-foreground">侧边栏</div>
                    <button
                      type="button"
                      className="w-9 h-9 rounded-xl border border-border bg-surface/70 hover:bg-surface transition-colors inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                      onClick={() => setWorkflowSidebarOpen(false)}
                      aria-label="关闭"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </div>
                  <div className="px-3 pt-3 flex items-center gap-2">
                    <button
                      type="button"
                      className={
                        workflowSidebarTab === 'pipeline'
                          ? 'h-9 px-3 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs font-semibold'
                          : 'h-9 px-3 rounded-full border border-border bg-surface/70 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors text-xs font-semibold'
                      }
                      onClick={() => setWorkflowSidebarTab('pipeline')}
                    >
                      管线
                    </button>
                    <button
                      type="button"
                      className={
                        workflowSidebarTab === 'resources'
                          ? 'h-9 px-3 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs font-semibold'
                          : 'h-9 px-3 rounded-full border border-border bg-surface/70 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors text-xs font-semibold'
                      }
                      onClick={() => setWorkflowSidebarTab('resources')}
                    >
                      资源
                    </button>
                    <button
                      type="button"
                      className={
                        workflowSidebarTab === 'games'
                          ? 'h-9 px-3 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs font-semibold'
                          : 'h-9 px-3 rounded-full border border-border bg-surface/70 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors text-xs font-semibold'
                      }
                      onClick={() => setWorkflowSidebarTab('games')}
                    >
                      游戏
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3">
                    {workflowSidebarTab === 'pipeline' && (
                      <StageAssistNav
                        mode="sidebar"
                        stages={stages}
                        activeIndex={stageIndex}
                        onSelect={setStageIndex}
                        onAddStage={addBlueprintStage}
                        onOpenSkill={(id) => setSkillModalId(id)}
                      />
                    )}
                    {workflowSidebarTab === 'resources' && (
                      <PipelineResourceCategoriesRail
                        mode="sidebar"
                        stageKey={activeStageId}
                        groups={resourceGroups}
                        onOpen={(r) => setPipelineResourceModal(r)}
                      />
                    )}
                    {workflowSidebarTab === 'games' && <DemoShowcaseWall stageToolIds={activeStageToolIds} compact />}
                  </div>
                </aside>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={selectedSkill !== null}
        onOpenChange={(open) => {
          if (!open) setSkillModalId(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          {selectedSkill && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 text-[11px] font-bold px-2 py-1 rounded-md bg-surface-2 border border-border text-muted-foreground uppercase w-fit">
                      {selectedSkill.type}
                    </div>
                    <DialogTitle className="mt-2">{selectedSkill.title}</DialogTitle>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(selectedSkill.content);
                        } catch {
                          downloadTextFile(`${toSafeFileName(selectedSkill.title)}.txt`, selectedSkill.content);
                        }
                      }}
                    >
                      一键复制
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const ext = selectedSkill.type === 'skill.md' ? 'md' : 'txt';
                        downloadTextFile(`${toSafeFileName(selectedSkill.title)}.${ext}`, selectedSkill.content);
                      }}
                    >
                      下载
                    </Button>
                  </div>
                </div>
                <DialogDescription>{selectedSkill.description}</DialogDescription>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedSkill.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="bg-surface border border-border text-muted-foreground text-[11px] font-bold">
                      {t}
                    </Badge>
                  ))}
                </div>
              </DialogHeader>
              <DialogBody>
                <div className="rounded-xl border border-border bg-surface-2/40 p-4">
                  <pre className="text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words max-h-[55vh] overflow-y-auto no-scrollbar">
                    {selectedSkill.content}
                  </pre>
                </div>
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={pipelineResourceModal !== null}
        onOpenChange={(open) => {
          if (!open) setPipelineResourceModal(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          {pipelineResourceModal && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <DialogTitle>{pipelineResourceModal.title}</DialogTitle>
                    <DialogDescription>{pipelineResourceModal.description}</DialogDescription>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(pipelineResourceModal.content);
                        } catch {
                          downloadTextFile(`${toSafeFileName(pipelineResourceModal.title)}.md`, pipelineResourceModal.content);
                        }
                      }}
                    >
                      一键复制
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        downloadTextFile(`${toSafeFileName(pipelineResourceModal.title)}.md`, pipelineResourceModal.content);
                      }}
                    >
                      下载
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <DialogBody>
                <div className="rounded-xl border border-border bg-surface-2/40 p-4">
                  <pre className="text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto no-scrollbar">
                    {pipelineResourceModal.content}
                  </pre>
                </div>
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedModel !== null}
        onOpenChange={(open) => {
          if (!open) setModelModalId(null);
        }}
      >
        <DialogContent className="max-w-4xl">
          {selectedModel && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <DialogTitle>{selectedModel.name}</DialogTitle>
                    <DialogDescription>模型场景图展示 · {styleModelDescription(selectedModel.name)}</DialogDescription>
                  </div>
                  <div className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveStyleModelId(selectedModel.id);
                        setAiDraft(buildStyleModelPrompt(selectedModel.name));
                        window.setTimeout(() => aiDraftRef.current?.focus(), 0);
                        aiBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      使用此模型
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <DialogBody>
                <div className="rounded-xl border border-border bg-surface-2/40 p-4">
                  <div className="rounded-xl overflow-hidden border border-border bg-surface">
                    <img
                      src={
                        selectedModel.images[Math.min(modelActiveIndex, selectedModel.images.length - 1)]?.url ??
                        selectedModel.coverUrl
                      }
                      alt={selectedModel.name}
                      className="w-full h-[360px] object-cover"
                      draggable={false}
                      loading="eager"
                    />
                  </div>

                  {selectedModel.images.length > 1 && (
                    <div className="mt-4 grid grid-cols-5 gap-2 max-h-[28vh] overflow-y-auto no-scrollbar pr-1">
                      {selectedModel.images.map((img, idx) => (
                        <button
                          key={img.path}
                          type="button"
                          className={
                            idx === modelActiveIndex
                              ? 'rounded-lg overflow-hidden border border-primary/40 bg-surface'
                              : 'rounded-lg overflow-hidden border border-border bg-surface hover:border-border-strong'
                          }
                          onClick={() => setModelActiveIndex(idx)}
                        >
                          <img
                            src={img.url}
                            alt={`${selectedModel.name}-${idx + 1}`}
                            className="w-full h-16 object-cover"
                            draggable={false}
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedTemplatePack !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTemplateModalId(null);
            setTemplateProcessOpen(false);
          }
        }}
      >
        <DialogContent
          className="max-w-[1160px] p-0 bg-transparent border-0 shadow-none"
          overlayClassName="bg-background/80 backdrop-blur-md"
          viewportClassName="p-3 sm:p-6 lg:p-10"
          hideCloseButton
        >
          {selectedTemplatePack && (
            <>
              <div className="relative overflow-hidden rounded-[24px] border border-border bg-surface shadow-e3">
                <div className="relative h-[62vh] min-h-[420px] max-h-[720px] bg-surface-2 overflow-hidden">
                  <img
                    src={
                      selectedTemplatePack.images[Math.min(templateActiveIndex, selectedTemplatePack.images.length - 1)]
                        ?.url ?? selectedTemplatePack.coverUrl
                    }
                    alt={selectedTemplatePack.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-95"
                    draggable={false}
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_18%_-10%,rgba(var(--brand-2)/0.22),transparent_60%),radial-gradient(700px_circle_at_82%_0%,rgba(var(--brand-3)/0.18),transparent_62%)] opacity-70" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/22 to-transparent" />

                  <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="h-9 px-3 rounded-full border border-border/60 bg-surface/55 backdrop-blur-md text-xs font-semibold text-foreground/90 inline-flex items-center gap-2 hover:bg-surface-2/60 transition-colors"
                      onClick={() => {
                        setTemplateModalId(null);
                        setTemplateProcessOpen(false);
                      }}
                    >
                      <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                      返回
                    </button>

                    <div className="min-w-0 flex-1 px-3 hidden sm:block">
                      <div className="text-[13px] font-semibold text-foreground/90 truncate ui-display">{selectedTemplatePack.name}</div>
                      <div className="mt-0.5 text-[11px] font-medium text-foreground-soft/70 truncate">
                        {selectedTemplatePack.kind === 'style'
                          ? `风格模板 · ${styleModelDescription(selectedTemplatePack.name)}`
                          : selectedTemplatePack.kind === 'game'
                            ? '游戏模板'
                            : '角色模板'}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-border/60 bg-surface/55 backdrop-blur-md hover:bg-surface-2/60 text-foreground/90"
                      onClick={() => {
                        createNewProject({ id: selectedTemplatePack.id, name: selectedTemplatePack.name });
                        setTemplateModalId(null);
                        setTemplateProcessOpen(false);
                      }}
                    >
                      使用此模板
                    </Button>
                  </div>

                  {templateProcessOpen && (
                    <div className="absolute inset-x-0 bottom-20 sm:bottom-24 flex justify-center pointer-events-none">
                      <div className="pointer-events-auto w-[min(760px,calc(100%-2rem))] rounded-2xl border border-border/60 bg-surface/55 backdrop-blur-md shadow-e2 overflow-hidden">
                        <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-border/50">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground/90">制作过程</div>
                            <div className="mt-1 text-xs text-foreground-soft/70">一键复用模板到项目工作流（示意）</div>
                          </div>
                          <button
                            type="button"
                            className="w-9 h-9 rounded-xl border border-border/60 bg-surface/55 hover:bg-surface-2/60 transition-colors inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                            onClick={() => setTemplateProcessOpen(false)}
                            aria-label="关闭制作过程"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="rounded-xl border border-border/60 bg-surface/55 p-4">
                            <div className="text-xs font-semibold text-muted-foreground">Step 1</div>
                            <div className="mt-2 text-sm font-semibold text-foreground/90">选择模板</div>
                            <div className="mt-1 text-xs text-foreground-soft/70">确定风格/游戏/角色包</div>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-surface/55 p-4">
                            <div className="text-xs font-semibold text-muted-foreground">Step 2</div>
                            <div className="mt-2 text-sm font-semibold text-foreground/90">生成资源</div>
                            <div className="mt-1 text-xs text-foreground-soft/70">AI 产出素材与配置</div>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-surface/55 p-4">
                            <div className="text-xs font-semibold text-muted-foreground">Step 3</div>
                            <div className="mt-2 text-sm font-semibold text-foreground/90">导入项目</div>
                            <div className="mt-1 text-xs text-foreground-soft/70">落到资产库与工作流</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="md"
                      className="rounded-full border-border/60 bg-surface/55 backdrop-blur-md hover:bg-surface-2/60 text-foreground/90"
                      onClick={() => setTemplateProcessOpen((v) => !v)}
                    >
                      查看制作过程
                    </Button>
                  </div>
                </div>

                {selectedTemplatePack.images.length > 1 && (
                  <div className="border-t border-border bg-surface px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold text-muted-foreground">预览</div>
                      <div className="text-xs font-semibold text-muted-foreground">{selectedTemplatePack.images.length} 张</div>
                    </div>
                    <div className="mt-3 overflow-x-auto no-scrollbar">
                      <div className="flex items-stretch gap-3 w-max pr-2">
                        {selectedTemplatePack.images.map((img, idx) => (
                          <button
                            key={img.path}
                            type="button"
                            className={
                              idx === templateActiveIndex
                                ? 'relative w-28 h-16 rounded-xl overflow-hidden border border-primary/40 bg-surface shadow-e1'
                                : 'relative w-28 h-16 rounded-xl overflow-hidden border border-border bg-surface hover:border-border-strong'
                            }
                            onClick={() => setTemplateActiveIndex(idx)}
                            aria-label={`预览 ${idx + 1}`}
                          >
                            <img src={img.url} alt={`${selectedTemplatePack.name}-${idx + 1}`} className="w-full h-full object-cover" draggable={false} loading="lazy" />
                            {idx === templateActiveIndex && (
                              <div className="absolute inset-0 ring-1 ring-primary/30" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function stageIconForId(stageId: string) {
  if (stageId === 'concept') return Wand2;
  if (stageId === 'art') return Palette;
  if (stageId === 'dev') return Code2;
  if (stageId === 'audio') return Music2;
  return TerminalSquare;
}

function StageAssistNav({
  mode = 'rail',
  stages,
  activeIndex,
  onSelect,
  onAddStage,
  onOpenSkill,
}: {
  mode?: 'rail' | 'sidebar';
  stages: AIToolchainCategory[];
  activeIndex: number;
  onSelect: (idx: number) => void;
  onAddStage: (stageId: string) => void;
  onOpenSkill: (skillId: string) => void;
}) {
  const activeStage = stages[activeIndex];
  const toolIds = useMemo(() => activeStage?.tools.map((t) => t.id) ?? [], [activeStage]);
  const skills = useMemo(() => {
    if (!activeStage) return [];
    const filtered = mockSkills.filter((s) => s.tags.some((t) => toolIds.includes(t)));
    return [...filtered].sort((a, b) => b.likes - a.likes).slice(0, 6);
  }, [activeStage, toolIds]);

  return (
    <div className={mode === 'rail' ? 'lg:sticky lg:top-24 ui-panel overflow-hidden flex flex-col ui-panel-tall' : 'ui-panel overflow-hidden flex flex-col'}>
      <div className="shrink-0 px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground tracking-tight">项目开发管线</div>
            <div className="text-xs text-muted-foreground mt-1 line-clamp-1">流程与技能市场</div>
          </div>
        </div>
      </div>

      <div className="shrink-0 p-3 border-b border-border bg-surface">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="h-10 rounded-xl border border-border bg-surface hover:bg-surface-2 transition-colors text-xs font-semibold text-foreground"
          >
            项目文件
          </button>
          <button
            type="button"
            className="h-10 rounded-xl border border-border bg-surface hover:bg-surface-2 transition-colors text-xs font-semibold text-foreground"
          >
            打包/导出
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 grid gap-2">
          {stages.map((s, idx) => {
            const Icon = stageIconForId(s.id);
            const isActive = idx === activeIndex;
            return (
              <div key={s.id} className="flex items-stretch gap-2">
                <button
                  type="button"
                  className={
                    isActive
                      ? 'flex-1 text-left rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/10 transition-colors px-3 py-3'
                      : 'flex-1 text-left rounded-xl border border-border bg-surface hover:bg-surface-2 transition-colors px-3 py-3'
                  }
                  onClick={() => onSelect(idx)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl border border-border bg-surface-2 flex items-center justify-center">
                      <Icon className={isActive ? 'w-4.5 h-4.5 text-primary' : 'w-4.5 h-4.5 text-muted-foreground'} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{s.title}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{s.summary}</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  className="w-11 rounded-xl border border-border bg-surface hover:bg-surface-2 transition-colors inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="新增蓝图"
                  onClick={() => onAddStage(s.id)}
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>
              </div>
            );
          })}
        </div>

        {activeStage && (
          <div className="shrink-0 border-t border-border bg-surface">
            <div className="px-3 py-3 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-muted-foreground truncate">{activeStage.title}</div>
              <div className="text-[11px] font-semibold text-muted-foreground">技能市场</div>
            </div>
            <div
              className="max-h-[260px] overflow-y-auto no-scrollbar px-3 pb-3"
              onWheel={(e) => {
                e.stopPropagation();
              }}
            >
              {skills.length === 0 ? (
                <div className="text-xs text-muted-foreground/70 rounded-xl border border-border bg-surface-2 p-4 text-center">
                  暂无匹配技能
                </div>
              ) : (
                <div className="grid gap-2">
                  {skills.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="text-left group rounded-xl border border-border bg-surface-2/55 hover:bg-surface-2 transition-colors p-3"
                      onClick={() => onOpenSkill(s.id)}
                    >
                      <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {s.title}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground line-clamp-1">{s.description}</div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-bold">{s.type === 'prompt' ? 'Prompt' : 'Skill.md'}</span>
                        <span className="font-bold">👍 {s.likes}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const PipelineBlueprint = forwardRef<PipelineBlueprintHandle, {
  stages: AIToolchainCategory[];
  selectedStageId: string | null;
  onViewportChange: (state: BlueprintViewportState) => void;
  onSelectStage: (stageId: string) => void;
  onClearSelection: () => void;
}>(function PipelineBlueprint(
  {
    stages,
    selectedStageId,
    onViewportChange,
    onSelectStage,
    onClearSelection,
  },
  ref
) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);

  const NODE_W = 260;
  const NODE_H = 152;

  const [nodes, setNodes] = useState<Record<string, BlueprintNode>>(() => ({}));
  const [edges, setEdges] = useState<BlueprintEdge[]>(() => []);

  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [linkingToPoint, setLinkingToPoint] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    active: boolean;
    nodeId: string | null;
    dx: number;
    dy: number;
    pointerId: number | null;
    startX: number;
    startY: number;
    moved: boolean;
  }>({ active: false, nodeId: null, dx: 0, dy: 0, pointerId: null, startX: 0, startY: 0, moved: false });
  const panRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    camX: number;
    camY: number;
    moved: boolean;
  }>({ active: false, pointerId: null, startX: 0, startY: 0, camX: 0, camY: 0, moved: false });

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    onViewportChange({ camera, scale, nodeW: NODE_W, nodeH: NODE_H, nodes });
  }, [camera, NODE_H, NODE_W, nodes, onViewportChange, scale]);

  useEffect(() => {
    setEdges((prev) => prev.filter((e) => nodes[e.from] && nodes[e.to]));
  }, [nodes]);

  useEffect(() => {
    if (!selectedStageId) return;
    if (nodes[selectedStageId]) return;
    onClearSelection();
  }, [nodes, onClearSelection, selectedStageId]);

  useImperativeHandle(
    ref,
    () => ({
      ensureStage: (stageId: string) => {
        setNodes((prev) => {
          if (prev[stageId]) return prev;
          const stage = stages.find((s) => s.id === stageId);
          if (!stage) return prev;
          const count = Object.keys(prev).length;
          const col = count % 2;
          const row = Math.floor(count / 2);
          const x = 40 + col * 320;
          const y = 40 + row * 190;
          return { ...prev, [stageId]: { id: stageId, title: stage.title, subtitle: stage.summary, x, y } };
        });
      },
    }),
    [stages]
  );

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const nodePos = (id: string) => nodes[id];
  const portPos = (id: string, side: 'in' | 'out') => {
    const n = nodePos(id);
    const x = side === 'in' ? n.x : n.x + NODE_W;
    const y = n.y + Math.round(NODE_H / 2);
    return { x, y };
  };

  const pathFor = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = Math.max(40, Math.abs(to.x - from.x) * 0.45);
    const c1 = { x: from.x + dx, y: from.y };
    const c2 = { x: to.x - dx, y: to.y };
    return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
  };

  return (
    <div
      ref={canvasRef}
      className="relative h-full rounded-xl border border-border bg-surface/55 overflow-hidden cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
        backgroundSize: `${18 * scale}px ${18 * scale}px`,
        backgroundPosition: `${camera.x}px ${camera.y}px`,
      }}
      onWheel={(e) => {
        e.preventDefault();
        const el = canvasRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        const prevScale = scaleRef.current;
        const nextScale = clamp(prevScale * (e.deltaY > 0 ? 0.9 : 1.1), 0.5, 1.6);
        if (nextScale === prevScale) return;

        const cam = cameraRef.current;
        const wx = (sx - cam.x) / prevScale;
        const wy = (sy - cam.y) / prevScale;
        const nextCamX = sx - wx * nextScale;
        const nextCamY = sy - wy * nextScale;
        setScale(nextScale);
        setCamera({ x: Math.round(nextCamX), y: Math.round(nextCamY) });
      }}
      onPointerMove={(e) => {
        if (linkingFrom) {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          const cam = cameraRef.current;
          const sc = scaleRef.current;
          setLinkingToPoint({ x: (sx - cam.x) / sc, y: (sy - cam.y) / sc });
          return;
        }
        if (!panRef.current.active) return;
        if (panRef.current.pointerId !== e.pointerId) return;
        const dx = e.clientX - panRef.current.startX;
        const dy = e.clientY - panRef.current.startY;
        if (!panRef.current.moved) {
          if (Math.abs(dx) + Math.abs(dy) < 6) return;
          panRef.current.moved = true;
        }
        setCamera({ x: panRef.current.camX + dx, y: panRef.current.camY + dy });
      }}
      onPointerDown={() => {
        return;
      }}
      onPointerDownCapture={(e) => {
        if ((e.target as HTMLElement | null)?.closest?.('[data-bp-node]')) return;
        if (e.button !== 0) return;
        if (linkingFrom) {
          setLinkingFrom(null);
          setLinkingToPoint(null);
          return;
        }
        panRef.current.active = true;
        panRef.current.pointerId = e.pointerId;
        panRef.current.startX = e.clientX;
        panRef.current.startY = e.clientY;
        panRef.current.camX = cameraRef.current.x;
        panRef.current.camY = cameraRef.current.y;
        panRef.current.moved = false;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerUp={(e) => {
        if (!panRef.current.active) return;
        if (panRef.current.pointerId !== e.pointerId) return;
        const moved = panRef.current.moved;
        panRef.current.active = false;
        panRef.current.pointerId = null;
        panRef.current.moved = false;
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
        if (!moved) {
          onClearSelection();
        }
      }}
      onPointerCancel={(e) => {
        if (!panRef.current.active) return;
        if (panRef.current.pointerId !== e.pointerId) return;
        panRef.current.active = false;
        panRef.current.pointerId = null;
        panRef.current.moved = false;
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(168,85,247,0.85)" />
                <stop offset="100%" stopColor="rgba(99,102,241,0.85)" />
              </linearGradient>
            </defs>
            {edges.map((e) => {
              const from = portPos(e.from, 'out');
              const to = portPos(e.to, 'in');
              return (
                <path
                  key={e.id}
                  d={pathFor(from, to)}
                  stroke="url(#edgeGrad)"
                  strokeWidth={2.5}
                  fill="none"
                  opacity={0.9}
                />
              );
            })}
            {linkingFrom && linkingToPoint && (
              <path
                d={pathFor(portPos(linkingFrom, 'out'), linkingToPoint)}
                stroke="rgba(168,85,247,0.75)"
                strokeWidth={2.5}
                fill="none"
                strokeDasharray="6 6"
              />
            )}
          </svg>

          {Object.keys(nodes).map((id) => {
            const n = nodes[id];
            const isLinkFrom = linkingFrom === id;
            const isSelected = selectedStageId === id;
            return (
              <div
                key={id}
                className="absolute select-none"
                style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
              >
                <div
                  data-bp-node
                  className={
                    isSelected
                      ? 'h-full rounded-xl border border-primary/40 bg-primary/10 shadow-e1 overflow-hidden'
                      : 'h-full rounded-xl border border-border bg-surface-2/70 shadow-e1 overflow-hidden'
                  }
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    dragRef.current.active = true;
                    dragRef.current.nodeId = id;
                    dragRef.current.pointerId = e.pointerId;
                    const sc = scaleRef.current;
                    dragRef.current.dx = (e.clientX - rect.left) / sc;
                    dragRef.current.dy = (e.clientY - rect.top) / sc;
                    dragRef.current.startX = e.clientX;
                    dragRef.current.startY = e.clientY;
                    dragRef.current.moved = false;
                    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (!dragRef.current.active) return;
                    if (dragRef.current.nodeId !== id) return;
                    if (dragRef.current.pointerId !== e.pointerId) return;
                    const parent = canvasRef.current;
                    if (!parent) return;
                    const pRect = parent.getBoundingClientRect();
                    const sc = scaleRef.current;
                    const cam = cameraRef.current;
                    const sx = e.clientX - pRect.left;
                    const sy = e.clientY - pRect.top;
                    const nextX = (sx - cam.x) / sc - dragRef.current.dx;
                    const nextY = (sy - cam.y) / sc - dragRef.current.dy;
                    if (!dragRef.current.moved) {
                      if (Math.abs(e.clientX - dragRef.current.startX) + Math.abs(e.clientY - dragRef.current.startY) >= 6) {
                        dragRef.current.moved = true;
                      }
                    }
                    setNodes((prev) => ({
                      ...prev,
                      [id]: {
                        ...prev[id],
                        x: clamp(Math.round(nextX), -4000, 4000),
                        y: clamp(Math.round(nextY), -4000, 4000),
                      },
                    }));
                  }}
                  onPointerUp={(e) => {
                    if (!dragRef.current.active) return;
                    if (dragRef.current.nodeId !== id) return;
                    if (dragRef.current.pointerId !== e.pointerId) return;
                    if (!dragRef.current.moved) {
                      onSelectStage(id);
                    }
                    dragRef.current.active = false;
                    dragRef.current.nodeId = null;
                    dragRef.current.pointerId = null;
                    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
                  }}
                >
                  <div className="px-3 py-2.5 border-b border-border bg-surface/50">
                    <div className="text-sm font-semibold text-foreground tracking-tight line-clamp-1">{n.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{n.subtitle}</div>
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="text-xs text-muted-foreground">{isSelected ? '已选择，下面开始对话' : '点击选择，拖动布局'}</div>
                  </div>

                  <button
                    type="button"
                    className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-border bg-surface flex items-center justify-center"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!linkingFrom) return;
                      if (linkingFrom === id) return;
                      const edgeId = `e-${linkingFrom}-${id}-${Date.now()}`;
                      setEdges((prev) => [...prev, { id: edgeId, from: linkingFrom, to: id }]);
                      setLinkingFrom(null);
                      setLinkingToPoint(null);
                    }}
                    aria-label="输入端口"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-border-strong" />
                  </button>

                  <button
                    type="button"
                    className={
                      isLinkFrom
                        ? 'absolute right-[-12px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-primary/40 bg-primary/15 flex items-center justify-center'
                        : 'absolute right-[-12px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-border bg-surface flex items-center justify-center'
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (linkingFrom === id) {
                        setLinkingFrom(null);
                        setLinkingToPoint(null);
                        return;
                      }
                      setLinkingFrom(id);
                      setLinkingToPoint(null);
                    }}
                    aria-label="输出端口"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-primary" />
                  </button>
                </div>
              </div>
            );
          })}
      </div>

          {Object.keys(nodes).length > 0 && (
            <div className="absolute left-4 bottom-4 text-[11px] text-muted-foreground font-bold">
              {linkingFrom ? '选择一个目标节点左侧端口完成连线' : '拖动节点布局；可选：点击右侧端口开始连线'}
            </div>
          )}
    </div>
  );
});

function PipelineResourceCategoriesRail({
  mode = 'rail',
  stageKey,
  groups,
  onOpen,
}: {
  mode?: 'rail' | 'sidebar';
  stageKey: string;
  groups: Array<{ id: string; title: string; resources: PipelineResource[] }>;
  onOpen: (resource: PipelineResource) => void;
}) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  useEffect(() => {
    setOpenIds(groups.map((g) => g.id));
  }, [groups, stageKey]);

  return (
    <div className={mode === 'rail' ? 'ui-panel ui-panel-sticky overflow-hidden flex flex-col w-full' : 'ui-panel overflow-hidden flex flex-col w-full'}>
      <div className="ui-panel-header p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-foreground">流程资源</h3>
          <div className="text-xs font-semibold text-muted-foreground">{groups.length} 类</div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">点击分类展开，再点击资源查看详情</div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 grid gap-3 auto-rows-min content-start"
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        {groups.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-2/40 p-4 text-center">
            <div className="text-sm font-semibold text-foreground">暂无资源</div>
            <div className="mt-2 text-xs text-muted-foreground">后续可为该流程补充资源类别与内容。</div>
          </div>
        ) : (
          groups.map((g) => {
            const isOpen = openIds.includes(g.id);
            return (
              <div key={g.id} className="rounded-xl border border-border bg-surface-2/55 overflow-hidden">
                <button
                  type="button"
                  className="w-full h-14 px-4 flex items-center justify-between gap-3 hover:bg-surface-2 transition-colors"
                  onClick={() =>
                    setOpenIds((prev) => (prev.includes(g.id) ? prev.filter((id) => id !== g.id) : [...prev, g.id]))
                  }
                >
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-semibold text-foreground truncate">{g.title}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <div className="text-[11px] text-muted-foreground font-semibold">{g.resources.length} 条</div>
                    <ChevronDown
                      className={
                        isOpen
                          ? 'w-4 h-4 text-muted-foreground rotate-180 transition-transform'
                          : 'w-4 h-4 text-muted-foreground transition-transform'
                      }
                    />
                  </div>
                </button>

                {isOpen && (
                  <div
                    className="border-t border-border p-2"
                    onWheel={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <div className="grid gap-2 h-44 overflow-y-auto no-scrollbar pr-1">
                      {g.resources.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className="text-left group rounded-xl border border-border bg-surface hover:bg-surface-2 transition-colors overflow-hidden"
                          onClick={() => onOpen(r)}
                        >
                          <div className="px-3 py-2 flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl border border-border bg-surface-2 overflow-hidden shrink-0">
                              {r.coverUrl ? (
                                <img src={r.coverUrl} alt={r.title} className="w-full h-full object-cover" draggable={false} />
                              ) : (
                                <div className="w-full h-full bg-surface-2" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground tracking-tight line-clamp-1">{r.title}</div>
                              <div className="mt-1 text-[11px] text-muted-foreground font-bold line-clamp-1">{r.description}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ModelShowcaseRail({
  models,
  onOpenModel,
  onUseModel,
}: {
  models: StyleModel[];
  onOpenModel: (modelId: string) => void;
  onUseModel: (modelId: string) => void;
}) {
  return (
    <div className="ui-panel ui-panel-sticky overflow-hidden flex flex-col">
      <div className="ui-panel-header p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-foreground">游戏模型</h3>
          <div className="text-xs font-semibold text-muted-foreground">{models.length} 个</div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">选择风格后，可在 AI 对话中生成同风格资产</div>
      </div>

      <div className="flex-1 min-h-0 p-5">
        <div
          className="h-full overflow-y-auto no-scrollbar overscroll-contain"
          onWheel={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="grid gap-3">
            {models.map((m) => (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                className="text-left group rounded-xl border border-border bg-surface hover:border-border-strong hover:shadow-e1 transition-all duration-200 overflow-hidden cursor-pointer"
                onClick={() => onOpenModel(m.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenModel(m.id);
                  }
                }}
              >
                <div className="relative">
                  <img
                    src={m.coverUrl}
                    alt={m.name}
                    className="w-full h-28 object-cover"
                    loading="lazy"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute left-3 right-3 bottom-3">
                    <div className="text-sm font-semibold text-foreground tracking-tight line-clamp-1">{m.name}</div>
                    <div className="mt-1 text-[11px] text-foreground-soft/80 font-bold">{m.images.length} 张场景图</div>
                  </div>
                </div>

                <div className="p-3">
                  <div className="text-xs text-muted-foreground line-clamp-1">{styleModelDescription(m.name)}</div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-muted-foreground font-bold">点击查看细节</div>
                    <button
                      type="button"
                      className="shrink-0 h-8 px-3 rounded-md border border-border bg-surface hover:bg-surface-2 hover:border-border-strong text-xs font-semibold text-foreground transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onUseModel(m.id);
                      }}
                    >
                      使用
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoShowcaseWall({ stageToolIds, compact = false }: { stageToolIds: string[]; compact?: boolean }) {
  const demos = useMemo(() => {
    const ids = new Set(stageToolIds);
    const stageMatches = mockGames.filter((g) => g.tags.some((t) => ids.has(t)));
    const rankedStage = [...stageMatches].sort((a, b) => {
      if (b.playCount !== a.playCount) return b.playCount - a.playCount;
      if (b.likes !== a.likes) return b.likes - a.likes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const rankedGlobal = [...mockGames].sort((a, b) => {
      if (b.playCount !== a.playCount) return b.playCount - a.playCount;
      if (b.likes !== a.likes) return b.likes - a.likes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const list: Game[] = [];
    const seen = new Set<string>();
    for (const g of rankedStage) {
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      list.push(g);
      if (list.length >= 10) break;
    }
    for (const g of rankedGlobal) {
      if (list.length >= 10) break;
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      list.push(g);
    }
    return list;
  }, [stageToolIds]);

  const row = useMemo(() => demos.slice(0, 10), [demos]);

  return (
    <div
      className={
        compact
          ? 'rounded-xl border border-border bg-surface overflow-hidden shadow-e1'
          : 'mt-5 rounded-xl border border-border bg-surface overflow-hidden shadow-e1'
      }
    >
      <div
        className={
          compact
            ? 'px-4 py-3 flex items-center justify-between gap-3 border-b border-border bg-surface'
            : 'px-5 py-4 flex items-center justify-between gap-3 border-b border-border bg-surface'
        }
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground tracking-tight">
            游戏
          </div>
        </div>
        {!compact && (
          <Link
            to="/games"
            className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            查看更多 →
          </Link>
        )}
      </div>

      <div className={compact ? 'px-4 py-3' : 'px-5 py-4 grid gap-3'}>
        <DemoMarqueeRow demos={row} direction={1} />
      </div>
    </div>
  );
}

function DemoMarqueeRow({ demos, direction }: { demos: Game[]; direction: 1 | -1 }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const firstGroupRef = useRef<HTMLDivElement | null>(null);
  const loopWidthRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startLeft: number;
    pointerId: number | null;
    moved: boolean;
    justDraggedAt: number;
  }>({ active: false, startX: 0, startLeft: 0, pointerId: null, moved: false, justDraggedAt: 0 });

  useEffect(() => {
    const group = firstGroupRef.current;
    const el = scrollerRef.current;
    if (!group || !el) return;
    const update = () => {
      loopWidthRef.current = group.scrollWidth ?? 0;
      if (direction < 0 && loopWidthRef.current > 0 && el.scrollLeft < 1) {
        el.scrollLeft = loopWidthRef.current;
      }
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(group);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [direction, demos.length]);

  useEffect(() => {
    if (hovered || dragging) return;
    const el = scrollerRef.current;
    if (!el) return;
    const speedPxPerSecond = 28;
    let last = window.performance.now();
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(48, now - last));
      last = now;
      const loop = loopWidthRef.current;
      if (loop > 0) {
        const dx = (speedPxPerSecond * dt) / 1000;
        if (direction > 0) {
          el.scrollLeft += dx;
          if (el.scrollLeft >= loop) el.scrollLeft -= loop;
        } else {
          el.scrollLeft -= dx;
          if (el.scrollLeft <= 0) el.scrollLeft += loop;
        }
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [direction, dragging, hovered]);

  if (demos.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-2 p-4 text-center text-xs text-muted-foreground">
        暂无匹配 Demo
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl border border-border bg-surface/55 overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={scrollerRef}
        className="overflow-x-auto no-scrollbar"
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (dragRef.current.justDraggedAt === 0) return;
          if (Date.now() - dragRef.current.justDraggedAt > 400) return;
          e.preventDefault();
          e.stopPropagation();
          dragRef.current.justDraggedAt = 0;
        }}
        onPointerDown={(e) => {
          if (e.pointerType === 'touch') return;
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          const el = scrollerRef.current;
          if (!el) return;
          setDragging(true);
          dragRef.current.active = true;
          dragRef.current.pointerId = e.pointerId;
          dragRef.current.startX = e.clientX;
          dragRef.current.startLeft = el.scrollLeft;
          dragRef.current.moved = false;
          dragRef.current.justDraggedAt = 0;
          el.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const el = scrollerRef.current;
          if (!el) return;
          if (!dragRef.current.active) return;
          if (dragRef.current.pointerId !== e.pointerId) return;
          const dx = e.clientX - dragRef.current.startX;
          if (!dragRef.current.moved) {
            if (Math.abs(dx) < 6) return;
            dragRef.current.moved = true;
            dragRef.current.justDraggedAt = Date.now();
          }
          e.preventDefault();
          el.scrollLeft = dragRef.current.startLeft - dx;
        }}
        onPointerUp={(e) => {
          const el = scrollerRef.current;
          if (!el) return;
          if (dragRef.current.pointerId !== e.pointerId) return;
          dragRef.current.active = false;
          dragRef.current.pointerId = null;
          if (dragRef.current.moved) dragRef.current.justDraggedAt = Date.now();
          el.releasePointerCapture(e.pointerId);
          setDragging(false);
        }}
        onPointerCancel={(e) => {
          const el = scrollerRef.current;
          if (!el) return;
          if (dragRef.current.pointerId !== e.pointerId) return;
          dragRef.current.active = false;
          dragRef.current.pointerId = null;
          if (dragRef.current.moved) dragRef.current.justDraggedAt = Date.now();
          el.releasePointerCapture(e.pointerId);
          setDragging(false);
        }}
      >
        <div className="flex items-stretch gap-3 py-3 px-3 w-max">
          <div ref={firstGroupRef} className="flex items-stretch gap-3">
            {demos.map((g) => (
              <DemoTile key={g.id} game={g} />
            ))}
          </div>
          <div className="flex items-stretch gap-3">
            {demos.map((g) => (
              <DemoTile key={`${g.id}-dup`} game={g} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoTile({ game }: { game: Game }) {
  const icon = pickGameIconUrl(game.id);
  const channel = game.playChannel ?? 'webgl';
  const channelLabel = `play in ${channel}`;
  return (
    <Link
      to={`/games/${game.id}`}
      className="group shrink-0 w-rail-right rounded-xl border border-border bg-surface hover:bg-surface-2 hover:border-border-strong hover:shadow-e1 transition-all duration-200 p-4 flex items-center gap-3"
    >
      <div className="w-14 h-14 rounded-xl border border-border bg-surface-2 overflow-hidden flex items-center justify-center">
        <img src={icon ?? game.thumbnail} alt={game.title} className="w-full h-full object-cover" draggable={false} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {game.title}
          </div>
          <Badge
            variant="secondary"
            className={
              channel === '小游戏宿主'
                ? 'shrink-0 whitespace-nowrap bg-primary/15 border border-primary/25 text-primary text-[11px] font-semibold'
                : 'shrink-0 whitespace-nowrap bg-surface border border-border text-muted-foreground text-[11px] font-bold'
            }
          >
            {channelLabel}
          </Badge>
        </div>
        <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{game.description}</div>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground font-bold">
          <span>▶ {game.playCount.toLocaleString()}</span>
          <span>👍 {game.likes.toLocaleString()}</span>
        </div>
      </div>
    </Link>
  );
}

function pickGameIconUrl(seed: string): string | null {
  if (GAME_ICON_URLS.length === 0) return null;
  const idx = hashString(seed) % GAME_ICON_URLS.length;
  return GAME_ICON_URLS[idx] ?? null;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
