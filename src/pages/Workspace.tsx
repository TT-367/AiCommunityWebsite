import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ReactFlow,
  addEdge,
  Background,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import {
  AlignLeft,
  ArrowUp,
  Boxes,
  Clapperboard,
  Coins,
  MessageCircle,
  Music2,
  Sparkles,
  Pilcrow,
  Share2,
  Plus,
  X,
  Layers,
  Shapes,
  MessageSquare,
  Clock,
  Settings,
  User,
  Pencil,
  Image as ImageIcon,
  Video,
  LayoutTemplate,
  Maximize2
} from 'lucide-react';
import { listProjects, upsertProject } from '../data/projectAssetsStore';

const STYLE_TEMPLATE_IMAGE_URLS = import.meta.glob('../assets/style-models/**/*.{png,jpg,jpeg,webp}', {
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

type TemplateKind = 'style' | 'game' | 'character';
type TemplateImage = { url: string; fileName: string; path: string };
type TemplatePack = {
  id: string;
  name: string;
  images: TemplateImage[];
  coverUrl: string;
  kind: TemplateKind;
};

const buildTemplatePacksFromFolder = (segment: string, urls: Record<string, string>, kind: TemplateKind): TemplatePack[] => {
  const entries = Object.entries(urls).map(([path, url]) => {
    const after = path.split(`/${segment}/`)[1] ?? '';
    const parts = after.split('/');
    const fileName = parts[parts.length - 1] ?? after;
    const packName =
      parts.length >= 2 ? (parts[0] ?? '资源') : (fileName.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '资源');
    return { path, url, fileName, packName };
  });

  const map = new Map<string, TemplateImage[]>();
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

  const packs: TemplatePack[] = [];
  for (const [name, images] of map.entries()) {
    const sorted = [...images].sort((a, b) => toSortKey(a.fileName) - toSortKey(b.fileName));
    const cover = sorted.find((x) => /^1\./.test(x.fileName))?.url ?? sorted[0]?.url ?? '';
    if (!cover) continue;
    packs.push({ id: `${kind}:${name}`, name, images: sorted, coverUrl: cover, kind });
  }

  return packs.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
};

function isLikelyImageUrl(input: string) {
  const v = input.trim();
  if (!v) return false;
  if (v.startsWith('data:image/')) return true;
  if (/\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(v)) return true;
  if (v.startsWith('blob:')) return true;
  if (v.startsWith('/')) return true;
  return false;
}

type BlueprintKind =
  | 'prototype'
  | 'art'
  | 'audio'
  | 'templates'
  | 'text'
  | 'image'
  | 'video'
  | 'media-audio'
  | 'model3d'
  | 'animation';

type BlueprintMessage = { id: string; role: 'user' | 'assistant'; content: string };
type BlueprintRecord = { id: string; input: string; output: string; createdAt: number };
type BlueprintInstance = {
  id: string;
  kind: BlueprintKind;
  pos: { x: number; y: number };
  records: BlueprintRecord[];
  chatInput: string;
  chatMessages: BlueprintMessage[];
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type BlueprintNodeData = {
  blueprint: BlueprintInstance;
  updateBlueprint: (nodeId: string, updater: (bp: BlueprintInstance) => BlueprintInstance) => void;
  sendChat: (nodeId: string) => void;
};

type FlowNode = Node<BlueprintNodeData, 'blueprint' | 'image'>;

const blueprintHeaderLabel = (kind: BlueprintKind) =>
  kind === 'text'
    ? 'Text'
    : kind === 'image'
      ? 'Image'
      : kind === 'video'
        ? 'Video'
        : kind === 'media-audio'
          ? 'Audio'
          : kind === 'model3d'
            ? '3D'
            : kind === 'animation'
              ? 'Animation'
              : kind === 'templates'
                ? 'Templates'
                : kind === 'art'
                  ? 'Art'
                  : kind === 'audio'
                    ? 'Audio'
                    : 'Prototype';

function BlueprintFlowNode({ id, data, selected }: NodeProps<BlueprintNodeData>) {
  const bp = data.blueprint;
  const hasRecords = bp.records.length > 0;
  return (
    <div className="w-[520px] max-w-[90vw]">
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: 'rgb(var(--border-strong) / 0.9)', border: '1px solid rgb(var(--border-strong) / 0.9)' }} />
      <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, background: 'rgb(var(--border-strong) / 0.9)', border: '1px solid rgb(var(--border-strong) / 0.9)' }} />
      <div className={`rounded-[30px] border backdrop-blur-xl p-4 transition-[border-color,box-shadow,background-color,opacity] duration-200 ${selected ? 'border-primary/42 bg-surface/72 shadow-e3 ring-1 ring-primary/20' : 'border-border/55 bg-surface/58 shadow-e2 opacity-95'}`}>
        <div className="flex items-center justify-center gap-2 select-none text-foreground/90">
          <AlignLeft className="w-4 h-4 text-muted-foreground" />
          <div className="text-lg font-semibold tracking-tight">{blueprintHeaderLabel(bp.kind)}</div>
        </div>
        <div className="mt-3 rounded-[26px] border border-border-strong/60 bg-surface-2/40 min-h-[320px]">
          {!hasRecords ? (
            <div className="p-7">
              <div className="text-2xl font-semibold text-muted-foreground/70 tracking-tight">开启你的创作...</div>
            </div>
          ) : (
            <div className="p-5 max-h-[320px] overflow-y-auto no-scrollbar space-y-3">
              {bp.records.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border/65 bg-surface/45 px-4 py-3">
                  <div className="text-[11px] font-semibold text-muted-foreground">输入</div>
                  <div className="mt-1 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{r.input}</div>
                  <div className="mt-3 text-[11px] font-semibold text-muted-foreground">输出</div>
                  <div className="mt-1 text-sm text-foreground-soft/90 whitespace-pre-wrap leading-relaxed">{r.output}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4">
          <textarea
            value={bp.chatInput}
            onChange={(e) => data.updateBlueprint(id, (prev) => ({ ...prev, chatInput: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                data.sendChat(id);
              }
            }}
            placeholder="描述任何你想要生成的内容"
            className="nodrag w-full h-[72px] resize-none rounded-3xl border border-border/60 bg-surface/30 px-5 py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground/85">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <div className="text-sm font-semibold">Gemini 3.1 Flash Lite</div>
            </div>
            <button
              type="button"
              className="nodrag w-11 h-11 inline-flex items-center justify-center rounded-2xl border border-border/55 bg-surface-2/70 hover:bg-surface-2/85 transition-colors disabled:opacity-50"
              aria-label="发送"
              onClick={() => data.sendChat(id)}
              disabled={bp.chatInput.trim().length === 0}
            >
              <ArrowUp className="w-4 h-4 text-foreground/90" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageFlowNode({ id, data, selected }: NodeProps<BlueprintNodeData>) {
  const bp = data.blueprint;
  const firstRecord = bp.records[0] ?? null;
  const imageSrc = firstRecord?.output ?? '';
  const imageTitle = (firstRecord?.input ?? '').trim();
  return (
    <div className="w-[260px] max-w-[78vw]">
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: 'rgb(var(--border-strong) / 0.9)', border: '1px solid rgb(var(--border-strong) / 0.9)' }} />
      <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, background: 'rgb(var(--border-strong) / 0.9)', border: '1px solid rgb(var(--border-strong) / 0.9)' }} />
      <div className={`rounded-[26px] border backdrop-blur-xl overflow-hidden transition-[border-color,box-shadow,background-color,opacity] duration-200 ${selected ? 'border-primary/42 bg-surface/72 shadow-e3 ring-1 ring-primary/15' : 'border-border/60 bg-surface/58 shadow-e2 opacity-95'}`}>
        <div className="px-3 py-2 border-b border-border/60 bg-surface/55 flex items-center gap-2 select-none">
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
          <div className="text-sm font-semibold tracking-tight text-foreground/90 truncate">{imageTitle || 'Image'}</div>
        </div>
        <div className="relative w-full aspect-[4/3] bg-surface-2/55">
          {isLikelyImageUrl(imageSrc) ? <img src={imageSrc} alt={imageTitle || 'template-image'} className="absolute inset-0 w-full h-full object-cover" draggable={false} /> : null}
        </div>
        <div className="px-3 py-2 border-t border-border/60 bg-surface/55">
          <div className="text-[11px] font-semibold text-foreground/85 truncate">{imageTitle || bp.kind}</div>
        </div>
      </div>
      <button type="button" className="sr-only nodrag" onClick={() => data.sendChat(id)} aria-label="noop" />
    </div>
  );
}

export function Workspace() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const templateId = searchParams.get('template');
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('Untitled');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const addMenuCloseTimerRef = useRef<number | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const templatePacks = useMemo<TemplatePack[]>(
    () => [
      ...buildTemplatePacksFromFolder('style-models', STYLE_TEMPLATE_IMAGE_URLS, 'style'),
      ...buildTemplatePacksFromFolder('game-templates', GAME_TEMPLATE_IMAGE_URLS, 'game'),
      ...buildTemplatePacksFromFolder('character-templates', CHARACTER_TEMPLATE_IMAGE_URLS, 'character'),
    ],
    [],
  );
  const activeTemplatePack = useMemo<TemplatePack | null>(() => {
    if (!templateId) return null;
    return templatePacks.find((p) => p.id === templateId) ?? null;
  }, [templateId, templatePacks]);
  const templateInitRef = useRef<string | null>(null);

  const cancelAddMenuClose = () => {
    if (addMenuCloseTimerRef.current === null) return;
    window.clearTimeout(addMenuCloseTimerRef.current);
    addMenuCloseTimerRef.current = null;
  };

  const scheduleAddMenuClose = () => {
    cancelAddMenuClose();
    addMenuCloseTimerRef.current = window.setTimeout(() => setAddMenuOpen(false), 140);
  };

  const updateBlueprint = useCallback(
    (nodeId: string, updater: (bp: BlueprintInstance) => BlueprintInstance) => {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== nodeId) return n;
          const nextBlueprint = updater(n.data.blueprint);
          return { ...n, data: { ...n.data, blueprint: nextBlueprint } };
        }),
      );
    },
    [setNodes],
  );

  const sendChat = useCallback(
    (nodeId: string) => {
      updateBlueprint(nodeId, (bp) => {
        const text = bp.chatInput.trim();
        if (!text) return bp;
        const nextRecords: BlueprintRecord[] = [
          ...bp.records,
          {
            id: uid(),
            input: text,
            output: '已记录：将基于你的输入生成蓝图节点与步骤（示例输出）。',
            createdAt: Date.now(),
          },
        ];
        const nextMsgs: BlueprintMessage[] = [
          ...bp.chatMessages,
          { id: uid(), role: 'user', content: text },
          { id: uid(), role: 'assistant', content: `收到：${text}` },
        ];
        return { ...bp, chatInput: '', records: nextRecords, chatMessages: nextMsgs };
      });
    },
    [updateBlueprint],
  );

  const makeNode = useCallback(
    (bp: BlueprintInstance): FlowNode => ({
      id: bp.id,
      type: bp.kind === 'image' ? 'image' : 'blueprint',
      position: bp.pos,
      data: { blueprint: bp, updateBlueprint, sendChat },
    }),
    [sendChat, updateBlueprint],
  );

  const makeEdge = useCallback(
    (source: string, target: string): Edge => ({
      id: `e_${source}_${target}_${uid()}`,
      source,
      target,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'rgb(var(--border-strong) / 0.9)' },
      style: { stroke: 'rgb(var(--border-strong) / 0.9)', strokeWidth: 1.5 },
    }),
    [],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'rgb(var(--border-strong) / 0.9)' },
            style: { stroke: 'rgb(var(--border-strong) / 0.9)', strokeWidth: 1.5 },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const openBlueprint = (kind: BlueprintKind) => {
    const id = uid();
    const center = reactFlowRef.current
      ? reactFlowRef.current.screenToFlowPosition({ x: viewportSize.w / 2, y: viewportSize.h / 2 })
      : { x: 120, y: 120 };
    const offset = Math.min(7, nodes.length) * 28;
    const next: BlueprintInstance = {
      id,
      kind,
      pos: { x: center.x + offset, y: center.y + offset },
      records: [],
      chatInput: '',
      chatMessages: [{ id: uid(), role: 'assistant', content: '我在。把你的目标说清楚，我会帮你把蓝图拆成可执行步骤。' }],
    };
    setNodes((prev) => [...prev, makeNode(next)]);
    if (selectedNodeId) setEdges((prev) => [...prev, makeEdge(selectedNodeId, id)]);
    setSelectedNodeId(id);
    setAddMenuOpen(false);
    cancelAddMenuClose();
  };

  useEffect(() => {
    if (!projectId) return;
    if (!activeTemplatePack) return;
    if (nodes.length > 0) return;
    if (templateInitRef.current === activeTemplatePack.id) return;
    templateInitRef.current = activeTemplatePack.id;

    const now = Date.now();
    const summaryId = uid();
    const groupWidth = Math.min(520, viewportSize.w - 24);
    const summaryX = Math.max(12, (viewportSize.w - groupWidth) / 2);
    const summaryY = 86;
    const imageCardW = 260;
    const imageCardH = 236;
    const gap = 24;
    const startX = Math.max(96, summaryX - 120);
    const startY = 360;
    const cols = Math.max(2, Math.floor((viewportSize.w - startX - 36) / (imageCardW + gap)));

    const nextBlueprints: BlueprintInstance[] = [
      {
        id: summaryId,
        kind: 'templates',
        pos: { x: summaryX, y: summaryY },
        records: [
          {
            id: uid(),
            input: `模板：${activeTemplatePack.name}`,
            output: `已加载 ${activeTemplatePack.images.length} 张素材，已生成图片蓝图节点并按网格排列。`,
            createdAt: now,
          },
        ],
        chatInput: '',
        chatMessages: [
          {
            id: uid(),
            role: 'assistant',
            content: '模板素材已导入。你可以拖拽图片节点重新排布，也可以继续在这里补充需求，我会把蓝图拆解成步骤。',
          },
        ],
      },
      ...activeTemplatePack.images.map((img, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const name = img.fileName.replace(/\.(png|jpg|jpeg|webp)$/i, '');
        return {
          id: uid(),
          kind: 'image',
          pos: { x: startX + col * (imageCardW + gap), y: startY + row * (imageCardH + gap) },
          records: [{ id: uid(), input: name, output: img.url, createdAt: now + idx }],
          chatInput: '',
          chatMessages: [],
        };
      }),
    ];

    setNodes(nextBlueprints.map(makeNode));
    setEdges(() => {
      const imageNodes = nextBlueprints.filter((b) => b.kind === 'image');
      return imageNodes.map((b) => makeEdge(summaryId, b.id));
    });
    setSelectedNodeId(summaryId);
    window.setTimeout(() => reactFlowRef.current?.fitView({ padding: 0.22, duration: 480 }), 0);
  }, [activeTemplatePack, makeEdge, makeNode, nodes.length, projectId, setEdges, setNodes, viewportSize.h, viewportSize.w]);

  useEffect(() => {
    setIsEditingName(false);
    setNameDraft('');
    if (!projectId) {
      setProjectName('Untitled');
      return;
    }
    const projects = listProjects();
    const project = projects.find((p) => p.id === projectId);
    setProjectName(project?.name ?? 'Untitled');
  }, [projectId]);

  useEffect(() => {
    if (!isEditingName) return;
    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  }, [isEditingName]);

  const startEditName = () => {
    if (!projectId) return;
    setNameDraft(projectName);
    setIsEditingName(true);
  };

  const cancelEditName = () => {
    setIsEditingName(false);
    setNameDraft('');
  };

  const commitEditName = () => {
    if (!projectId) {
      cancelEditName();
      return;
    }
    const nextName = (nameInputRef.current?.value ?? nameDraft).trim();
    if (!nextName) {
      cancelEditName();
      return;
    }
    const updated = upsertProject({ id: projectId, name: nextName });
    setProjectName(updated.name);
    setIsEditingName(false);
    setNameDraft('');
  };

  useEffect(() => {
    if (!addMenuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddMenuOpen(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (addMenuRef.current?.contains(target)) return;
      if (addButtonRef.current?.contains(target)) return;
      setAddMenuOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [addMenuOpen]);

  useEffect(() => {
    const onResize = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const nodeTypes = useMemo(() => ({ blueprint: BlueprintFlowNode, image: ImageFlowNode }), []);
  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'rgb(var(--border-strong) / 0.9)' },
      style: { stroke: 'rgb(var(--border-strong) / 0.9)', strokeWidth: 1.5 },
    }),
    [],
  );
  const hasBlueprint = nodes.length > 0;

  return (
    <div className="relative flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden font-sans">

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between h-14 px-4 border-b border-border/70 bg-surface/65 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="ui-display text-[22px] leading-none font-semibold tracking-tight text-foreground/95 hover:text-foreground transition-colors"
            aria-label="AiGo"
          >
            AiGo
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-surface-2/60 transition-colors">
            {isEditingName ? (
              <input
                ref={nameInputRef}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEditName();
                  if (e.key === 'Escape') cancelEditName();
                }}
                onBlur={commitEditName}
                className="w-[16rem] max-w-[42vw] bg-transparent text-sm font-medium text-foreground/90 outline-none placeholder:text-muted-foreground"
                placeholder="请输入项目名称"
              />
            ) : (
              <span className="text-sm font-medium text-foreground/90">{projectName}</span>
            )}
            {!!projectId && !isEditingName ? (
              <button
                type="button"
                onClick={startEditName}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2/60 transition-colors"
                aria-label="编辑项目名"
                title="编辑项目名"
              >
                <Pencil className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Token Counter (Disabled) */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/55 border border-border/70 opacity-50 cursor-not-allowed">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-medium">100</span>
          </div>
          
          {/* Community Button */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-surface-2/70 hover:bg-surface-2/85 border border-border/70 transition-colors text-sm font-medium text-foreground/90"
          >
            <MessageCircle className="w-4 h-4" />
            社区
          </button>

          {/* Share Button */}
          <button className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-2/70 hover:bg-surface-2/85 border border-border/70 transition-colors text-foreground/90">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative flex">
        
        {/* Left Sidebar (Floating Pill) */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <div className="flex flex-col items-center gap-4 p-3 rounded-full bg-surface/45 border border-border/65 backdrop-blur-xl shadow-e3 relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none opacity-60"
              style={{
                backgroundImage: 'radial-gradient(700px circle at 30% -20%, rgb(var(--foreground) / 0.08), transparent 55%)',
              }}
            />

            <button
              ref={addButtonRef}
              className="relative w-10 h-10 rounded-full bg-surface-2/70 border border-border/70 text-foreground flex items-center justify-center hover:bg-surface-2/85 hover:border-border-strong/70 transition-all shadow-e2"
              type="button"
              onMouseEnter={() => {
                cancelAddMenuClose();
                setAddMenuOpen(true);
              }}
              onMouseLeave={scheduleAddMenuClose}
              onFocus={() => setAddMenuOpen(true)}
              onBlur={scheduleAddMenuClose}
              onPointerDown={() => setAddMenuOpen((v) => !v)}
              aria-label={addMenuOpen ? '关闭' : '添加'}
            >
              {addMenuOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>
            <div className="relative w-6 h-[1px] bg-border/70 my-1" />
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-2/60 transition-all">
              <Layers className="w-5 h-5" />
            </button>
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-2/60 transition-all">
              <Shapes className="w-5 h-5" />
            </button>
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-2/60 transition-all">
              <MessageSquare className="w-5 h-5" />
            </button>
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-2/60 transition-all">
              <Clock className="w-5 h-5" />
            </button>
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-2/60 transition-all">
              <Settings className="w-5 h-5" />
            </button>
            <div className="relative w-6 h-[1px] bg-border/70 my-1" />
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center bg-surface-2/60 border border-border/70 hover:border-border-strong/80 transition-all overflow-hidden shadow-e1">
              <User className="w-5 h-5 text-foreground/80" />
            </button>
          </div>

          {addMenuOpen ? (
            <div
              ref={addMenuRef}
              className="absolute left-16 top-0 -translate-y-2 w-[304px] rounded-3xl border border-border/65 bg-surface/65 backdrop-blur-xl shadow-e3 overflow-hidden"
              role="dialog"
              aria-label="添加节点"
              onMouseEnter={cancelAddMenuClose}
              onMouseLeave={scheduleAddMenuClose}
            >
              <div className="px-5 pt-5 pb-4">
                <div className="text-sm font-semibold text-foreground/90 tracking-tight">添加节点</div>
              </div>
              <div className="px-3 pb-4 grid gap-1">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-2/55 transition-colors text-left"
                  onClick={() => openBlueprint('text')}
                >
                  <span className="w-9 h-9 rounded-2xl border border-border/70 bg-surface-2/55 inline-flex items-center justify-center">
                    <Pilcrow className="w-4 h-4 text-foreground/80" />
                  </span>
                  <span className="text-sm font-semibold text-foreground/90">文本</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-2/55 transition-colors text-left"
                  onClick={() => openBlueprint('image')}
                >
                  <span className="w-9 h-9 rounded-2xl border border-border/70 bg-surface-2/55 inline-flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-foreground/80" />
                  </span>
                  <span className="text-sm font-semibold text-foreground/90">图片</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-2/55 transition-colors text-left"
                  onClick={() => openBlueprint('video')}
                >
                  <span className="w-9 h-9 rounded-2xl border border-border/70 bg-surface-2/55 inline-flex items-center justify-center">
                    <Video className="w-4 h-4 text-foreground/80" />
                  </span>
                  <span className="text-sm font-semibold text-foreground/90">视频</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-2/55 transition-colors text-left"
                  onClick={() => openBlueprint('media-audio')}
                >
                  <span className="w-9 h-9 rounded-2xl border border-border/70 bg-surface-2/55 inline-flex items-center justify-center">
                    <Music2 className="w-4 h-4 text-foreground/80" />
                  </span>
                  <span className="text-sm font-semibold text-foreground/90">音频</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-2/55 transition-colors text-left"
                  onClick={() => openBlueprint('model3d')}
                >
                  <span className="w-9 h-9 rounded-2xl border border-border/70 bg-surface-2/55 inline-flex items-center justify-center">
                    <Boxes className="w-4 h-4 text-foreground/80" />
                  </span>
                  <span className="text-sm font-semibold text-foreground/90">3D模型</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-2/55 transition-colors text-left"
                  onClick={() => openBlueprint('animation')}
                >
                  <span className="w-9 h-9 rounded-2xl border border-border/70 bg-surface-2/55 inline-flex items-center justify-center">
                    <Clapperboard className="w-4 h-4 text-foreground/80" />
                  </span>
                  <span className="text-sm font-semibold text-foreground/90">动画</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="absolute inset-0 z-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            minZoom={0.35}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            onInit={(instance) => {
              reactFlowRef.current = instance;
            }}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            className="bg-transparent"
          >
            <Background variant="dots" gap={24} size={1.4} color="rgb(var(--muted-foreground) / 0.28)" />
            <MiniMap
              position="bottom-right"
              pannable
              zoomable
              style={{
                backgroundColor: 'rgb(var(--surface) / 0.92)',
                border: '1px solid rgb(var(--border) / 0.85)',
                borderRadius: 16,
                boxShadow: '0 22px 60px -18px rgb(0 0 0 / 0.72)',
              }}
              maskColor="rgb(var(--background) / 0.82)"
              nodeColor={(n) => (n.type === 'image' ? 'rgb(var(--muted-foreground) / 0.75)' : 'rgb(var(--foreground) / 0.85)')}
              nodeStrokeColor={() => 'rgb(var(--border-strong) / 0.95)'}
              nodeBorderRadius={10}
            />
          </ReactFlow>
        </div>

        {!hasBlueprint ? (
          <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground bg-surface/45 px-6 py-2.5 rounded-full border border-border/60 backdrop-blur-sm cursor-pointer hover:bg-surface-2/55 hover:text-foreground/80 transition-all">
              <Maximize2 className="w-4 h-4" />
              <span className="text-sm font-medium tracking-wide">双击画布自由生成, 或查看模板</span>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/55 hover:bg-surface-2/65 border border-border/75 transition-all text-sm font-medium text-foreground/85"
                type="button"
                onClick={() => openBlueprint('prototype')}
              >
                <Shapes className="w-4 h-4 text-indigo-400" />
                游戏玩法与原型设计
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/55 hover:bg-surface-2/65 border border-border/75 transition-all text-sm font-medium text-foreground/85"
                type="button"
                onClick={() => openBlueprint('art')}
              >
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                美术资产生成
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/55 hover:bg-surface-2/65 border border-border/75 transition-all text-sm font-medium text-foreground/85"
                type="button"
                onClick={() => openBlueprint('audio')}
              >
                <Music2 className="w-4 h-4 text-amber-400" />
                游戏音频生成
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/55 hover:bg-surface-2/65 border border-border/75 transition-all text-sm font-medium text-foreground/85"
                type="button"
                onClick={() => openBlueprint('templates')}
              >
                <LayoutTemplate className="w-4 h-4 text-blue-400" />
                热门模板
              </button>
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}
