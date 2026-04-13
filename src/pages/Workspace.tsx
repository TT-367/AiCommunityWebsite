import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  AlignLeft,
  ArrowUp,
  Boxes,
  Clapperboard,
  Coins,
  MessageCircle,
  Music2,
  Mic,
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
  ZoomIn,
  ZoomOut,
  Play,
  Maximize2
} from 'lucide-react';
import { listProjects, upsertProject } from '../data/projectAssetsStore';

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

export function Workspace() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('Untitled');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const addMenuCloseTimerRef = useRef<number | null>(null);
  const [blueprints, setBlueprints] = useState<BlueprintInstance[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(null);
  const [chatAppearId, setChatAppearId] = useState<string | null>(null);
  const [chatAppear, setChatAppear] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [viewportSize, setViewportSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const blueprintDragRef = useRef<{
    active: boolean;
    dragging: boolean;
    blueprintId: string;
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    active: false,
    dragging: false,
    blueprintId: '',
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const cancelAddMenuClose = () => {
    if (addMenuCloseTimerRef.current === null) return;
    window.clearTimeout(addMenuCloseTimerRef.current);
    addMenuCloseTimerRef.current = null;
  };

  const scheduleAddMenuClose = () => {
    cancelAddMenuClose();
    addMenuCloseTimerRef.current = window.setTimeout(() => setAddMenuOpen(false), 140);
  };

  const openBlueprint = (kind: BlueprintKind) => {
    const id = uid();
    const groupWidth = Math.min(920, window.innerWidth - 24);
    const x = Math.max(12, (window.innerWidth - groupWidth) / 2);
    const y = 70;
    setBlueprints((prev) => {
      const offset = Math.min(7, prev.length) * 18;
      const next: BlueprintInstance = {
        id,
        kind,
        pos: { x: x + offset, y: y + offset },
        records: [],
        chatInput: '',
        chatMessages: [{ id: uid(), role: 'assistant', content: '我在。把你的目标说清楚，我会帮你把蓝图拆成可执行步骤。' }],
      };
      return [...prev, next];
    });
    setSelectedBlueprintId(id);
    setAddMenuOpen(false);
    cancelAddMenuClose();
  };

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

  useEffect(() => {
    if (!selectedBlueprintId) {
      setChatAppear(false);
      setChatAppearId(null);
      return;
    }
    setChatAppearId(selectedBlueprintId);
    setChatAppear(false);
    const raf = window.requestAnimationFrame(() => setChatAppear(true));
    return () => window.cancelAnimationFrame(raf);
  }, [selectedBlueprintId]);

  const getBlueprintTitle = (kind: BlueprintKind) =>
    kind === 'prototype'
      ? '游戏玩法与原型设计'
      : kind === 'art'
        ? '美术资产生成'
        : kind === 'audio'
          ? '游戏音频生成'
          : kind === 'templates'
            ? '热门模板'
            : kind === 'text'
              ? '文本'
              : kind === 'image'
                ? '图片'
                : kind === 'video'
                  ? '视频'
                  : kind === 'media-audio'
                    ? '音频'
                    : kind === 'model3d'
                      ? '3D模型'
                      : '动画';

  const getBlueprintHeaderLabel = (kind: BlueprintKind) =>
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

  const aiToolName = 'Gemini 3.1 Flash Lite';
  const aiCostPerSend = 1;

  const updateBlueprintSelection = (target: Node | null) => {
    if (blueprints.length === 0) return;
    const el = target instanceof HTMLElement ? target : null;
    const hit = el?.closest('[data-blueprint-hit="true"][data-blueprint-id]');
    const id = hit?.getAttribute('data-blueprint-id');
    setSelectedBlueprintId(id ?? null);
  };

  const sendBlueprintChat = (blueprintId: string) => {
    setBlueprints((prev) =>
      prev.map((bp) => {
        if (bp.id !== blueprintId) return bp;
        const text = bp.chatInput.trim();
        if (!text) return bp;
        const title = getBlueprintTitle(bp.kind);
        const nextRecords: BlueprintRecord[] = [
          ...bp.records,
          {
            id: uid(),
            input: text,
            output: `已记录：将基于「${title}」生成蓝图节点与步骤（示例输出）。`,
            createdAt: Date.now(),
          },
        ];
        const nextMsgs: BlueprintMessage[] = [...bp.chatMessages, { id: uid(), role: 'user', content: text }, { id: uid(), role: 'assistant', content: `收到：${text}` }];
        return { ...bp, chatInput: '', records: nextRecords, chatMessages: nextMsgs };
      }),
    );
  };

  const startBlueprintDrag = (e: ReactPointerEvent, blueprintId: string) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('textarea, input, button, a, select, [contenteditable="true"], [data-no-drag="true"]')) return;
    const bp = blueprints.find((b) => b.id === blueprintId);
    if (!bp) return;
    blueprintDragRef.current = {
      active: true,
      dragging: false,
      blueprintId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: bp.pos.x,
      originY: bp.pos.y,
    };

    const onMove = (ev: PointerEvent) => {
      const d = blueprintDragRef.current;
      if (!d.active || d.pointerId !== ev.pointerId) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (!d.dragging) {
        if (Math.abs(dx) + Math.abs(dy) < 4) return;
        d.dragging = true;
        setSelectedBlueprintId(d.blueprintId);
      }
      ev.preventDefault();
      setBlueprints((prev) =>
        prev.map((b) =>
          b.id === d.blueprintId ? { ...b, pos: { x: d.originX + dx / zoom, y: d.originY + dy / zoom } } : b,
        ),
      );
    };

    const end = (ev: PointerEvent) => {
      const d = blueprintDragRef.current;
      if (d.pointerId !== ev.pointerId) return;
      blueprintDragRef.current.active = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  const getBlueprintHeaderClass = (selected: boolean) =>
    `flex items-center justify-center gap-2 select-none cursor-grab active:cursor-grabbing transition-colors ${selected ? 'text-foreground/92' : 'text-foreground/72'}`;
  const getBlueprintPanelClass = (selected: boolean) =>
    `rounded-[30px] border backdrop-blur-xl p-4 transition-[border-color,box-shadow,background-color,opacity] duration-200 ${
      selected ? 'border-primary/35 bg-surface/60 shadow-e3 ring-1 ring-primary/20' : 'border-border/40 bg-surface/45 shadow-e2 opacity-90'
    }`;
  const blueprintChatClass = 'w-[920px] max-w-[92vw] rounded-[30px] border border-primary/30 bg-surface/60 backdrop-blur-xl shadow-e3 ring-1 ring-primary/15 px-6 py-4';
  const hasBlueprint = blueprints.length > 0;
  const zoomPct = Math.round(zoom * 100);
  const canvasTransform = `translate3d(${(1 - zoom) * (viewportSize.w / 2)}px, ${(1 - zoom) * (viewportSize.h / 2)}px, 0) scale(${zoom})`;
  const setZoomClamped = (next: number) => setZoom(Math.max(0.5, Math.min(2, Number(next.toFixed(3)))));
  const dotOpacity = Math.max(0.28, Math.min(0.55, 0.55 * Math.pow(zoom, 1.15)));
  const dotAlpha = Math.max(0.18, Math.min(0.42, 0.42 * Math.pow(zoom, 1.25)));

  return (
    <div
      className="relative flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden font-sans"
      onPointerDownCapture={(e) => {
        updateBlueprintSelection(e.target as Node | null);
      }}
      onMouseDownCapture={(e) => {
        updateBlueprintSelection(e.target as Node | null);
      }}
      onTouchStartCapture={(e) => {
        updateBlueprintSelection(e.target as Node | null);
      }}
      onWheel={(e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const delta = e.deltaY;
        const next = delta > 0 ? zoom * 0.92 : zoom * 1.08;
        setZoomClamped(next);
      }}
    >
      {/* Dot Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: dotOpacity,
          backgroundImage: `radial-gradient(rgb(var(--muted-foreground) / ${dotAlpha}) 1.35px, transparent 1.35px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${(1 - zoom) * (viewportSize.w / 2)}px ${(1 - zoom) * (viewportSize.h / 2)}px`,
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between h-14 px-4 border-b border-border/60 bg-surface/55 backdrop-blur-md">
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
          <div className="flex flex-col items-center gap-4 p-3 rounded-full bg-surface/35 border border-border/55 backdrop-blur-xl shadow-e3 relative overflow-hidden">
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
              className="absolute left-16 top-0 -translate-y-2 w-[304px] rounded-3xl border border-border/55 bg-surface/55 backdrop-blur-xl shadow-e3 overflow-hidden"
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
                  <span className="w-9 h-9 rounded-2xl border border-border/60 bg-surface-2/45 inline-flex items-center justify-center">
                    <Pilcrow className="w-4 h-4 text-foreground/80" />
                  </span>
                  <span className="text-sm font-semibold text-foreground/90">文本</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-2/55 transition-colors text-left"
                  onClick={() => openBlueprint('image')}
                >
                  <span className="w-9 h-9 rounded-2xl border border-border/60 bg-surface-2/45 inline-flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-foreground/80" />
                  </span>
                  <span className="text-sm font-semibold text-foreground/90">图片</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-2/55 transition-colors text-left"
                  onClick={() => openBlueprint('video')}
                >
                  <span className="w-9 h-9 rounded-2xl border border-border/60 bg-surface-2/45 inline-flex items-center justify-center">
                    <Video className="w-4 h-4 text-foreground/80" />
                  </span>
                  <span className="text-sm font-semibold text-foreground/90">视频</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-2/55 transition-colors text-left"
                  onClick={() => openBlueprint('media-audio')}
                >
                  <span className="w-9 h-9 rounded-2xl border border-border/60 bg-surface-2/45 inline-flex items-center justify-center">
                    <Music2 className="w-4 h-4 text-foreground/80" />
                  </span>
                  <span className="text-sm font-semibold text-foreground/90">音频</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-2/55 transition-colors text-left"
                  onClick={() => openBlueprint('model3d')}
                >
                  <span className="w-9 h-9 rounded-2xl border border-border/60 bg-surface-2/45 inline-flex items-center justify-center">
                    <Boxes className="w-4 h-4 text-foreground/80" />
                  </span>
                  <span className="text-sm font-semibold text-foreground/90">3D模型</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-2/55 transition-colors text-left"
                  onClick={() => openBlueprint('animation')}
                >
                  <span className="w-9 h-9 rounded-2xl border border-border/60 bg-surface-2/45 inline-flex items-center justify-center">
                    <Clapperboard className="w-4 h-4 text-foreground/80" />
                  </span>
                  <span className="text-sm font-semibold text-foreground/90">动画</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Canvas Center */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-0">
          {!hasBlueprint ? (
            <>
              <div className="flex items-center gap-2 text-muted-foreground bg-surface/45 px-6 py-2.5 rounded-full border border-border/60 backdrop-blur-sm cursor-pointer hover:bg-surface-2/55 hover:text-foreground/80 transition-all">
                <Maximize2 className="w-4 h-4" />
                <span className="text-sm font-medium tracking-wide">双击画布自由生成, 或查看模板</span>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/45 hover:bg-surface-2/55 border border-border/70 transition-all text-sm font-medium text-foreground/85"
                  type="button"
                  onClick={() => openBlueprint('prototype')}
                >
                  <Shapes className="w-4 h-4 text-indigo-400" />
                  游戏玩法与原型设计
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/45 hover:bg-surface-2/55 border border-border/70 transition-all text-sm font-medium text-foreground/85"
                  type="button"
                  onClick={() => openBlueprint('art')}
                >
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  美术资产生成
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/45 hover:bg-surface-2/55 border border-border/70 transition-all text-sm font-medium text-foreground/85"
                  type="button"
                  onClick={() => openBlueprint('audio')}
                >
                  <Music2 className="w-4 h-4 text-amber-400" />
                  游戏音频生成
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/45 hover:bg-surface-2/55 border border-border/70 transition-all text-sm font-medium text-foreground/85"
                  type="button"
                  onClick={() => openBlueprint('templates')}
                >
                  <LayoutTemplate className="w-4 h-4 text-blue-400" />
                  热门模板
                </button>
              </div>
            </>
          ) : null}
        </div>

        {/* Bottom Left Controls */}
        <div className="absolute left-24 bottom-6 z-10 flex items-center gap-3">
          <div className="flex items-center gap-1 bg-surface/45 border border-border/70 rounded-full p-1 backdrop-blur-md shadow-e2">
            <button
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-2/60 transition-colors"
              onClick={() => setZoomClamped(zoom * 0.9)}
              aria-label="缩小"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-border/80 mx-1" />
            <span className="text-xs font-medium text-foreground/80 w-12 text-center">{zoomPct}%</span>
            <div className="w-[1px] h-4 bg-border/80 mx-1" />
            <button
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-2/60 transition-colors"
              onClick={() => setZoomClamped(zoom * 1.1)}
              aria-label="放大"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          <button className="w-10 h-10 rounded-full bg-surface/45 border border-border/70 flex items-center justify-center text-foreground/85 hover:text-foreground hover:bg-surface-2/55 backdrop-blur-md transition-colors shadow-e2">
            <Play className="w-4 h-4 ml-0.5" />
          </button>
        </div>

      </div>

      {hasBlueprint ? (
        <div className="absolute inset-0 z-[1] pointer-events-none">
          <div className="absolute inset-0 pointer-events-none" style={{ transform: canvasTransform, transformOrigin: '0 0' }}>
            {blueprints.map((bp) => {
              const selected = selectedBlueprintId === bp.id;
              const blueprintChatMotionClass =
                selected && chatAppearId === bp.id && chatAppear
                  ? 'mt-3 max-h-[260px] opacity-100 translate-y-0 pointer-events-auto'
                  : 'mt-0 max-h-0 opacity-0 -translate-y-3 pointer-events-none';

              return (
                <div
                  key={bp.id}
                  className="absolute left-0 top-0 pointer-events-auto"
                  style={{ transform: `translate3d(${bp.pos.x}px, ${bp.pos.y}px, 0)` }}
                >
                <div className="w-[920px] max-w-[92vw] touch-none group" onPointerDown={(e) => startBlueprintDrag(e, bp.id)}>
                    <div className={getBlueprintHeaderClass(selected)} data-blueprint-hit="true" data-blueprint-id={bp.id}>
                      <AlignLeft className="w-4 h-4 text-muted-foreground" />
                      <div className="text-lg font-semibold tracking-tight">{getBlueprintHeaderLabel(bp.kind)}</div>
                    </div>

                  <div className="relative mt-3 w-[520px] max-w-[90vw] mx-auto" data-blueprint-hit="true" data-blueprint-id={bp.id}>
                    <button
                      type="button"
                      data-no-drag="true"
                      aria-label="添加"
                      className={`absolute left-[-64px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-border/60 bg-surface/30 backdrop-blur-md shadow-e2 inline-flex items-center justify-center transition-[opacity,transform,background-color,border-color,color] duration-150 ${
                        selected
                          ? 'opacity-100 scale-100 pointer-events-auto -translate-x-0 text-foreground/80'
                          : 'opacity-0 scale-90 pointer-events-none -translate-x-2 text-foreground/60 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto group-hover:-translate-x-0'
                      } hover:bg-surface-2/55 hover:border-border-strong/70 hover:text-foreground`}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      data-no-drag="true"
                      aria-label="添加"
                      className={`absolute right-[-64px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-border/60 bg-surface/30 backdrop-blur-md shadow-e2 inline-flex items-center justify-center transition-[opacity,transform,background-color,border-color,color] duration-150 ${
                        selected
                          ? 'opacity-100 scale-100 pointer-events-auto translate-x-0 text-foreground/80'
                          : 'opacity-0 scale-90 pointer-events-none translate-x-2 text-foreground/60 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto group-hover:translate-x-0'
                      } hover:bg-surface-2/55 hover:border-border-strong/70 hover:text-foreground`}
                    >
                      <Plus className="w-5 h-5" />
                    </button>

                    <div className={getBlueprintPanelClass(selected)}>
                      <div className="rounded-[26px] border border-border-strong/60 bg-surface-2/40 min-h-[320px]">
                        {bp.records.length === 0 ? (
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
                    </div>
                  </div>

                    <div
                      data-blueprint-hit="true"
                      data-blueprint-id={bp.id}
                      className={`overflow-hidden transition-[transform,opacity,max-height,margin] duration-150 ease-out will-change-transform ${blueprintChatMotionClass}`}
                    >
                      <div className={blueprintChatClass}>
                        <textarea
                          value={bp.chatInput}
                          onChange={(e) =>
                            setBlueprints((prev) => prev.map((b) => (b.id === bp.id ? { ...b, chatInput: e.target.value } : b)))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendBlueprintChat(bp.id);
                            }
                          }}
                          placeholder="描述任何你想要生成的内容"
                          className="w-full h-[72px] resize-none rounded-3xl border border-border/60 bg-surface/30 px-5 py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        />

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-foreground/85">
                            <Sparkles className="w-4 h-4 text-muted-foreground" />
                            <div className="text-sm font-semibold">{aiToolName}</div>
                          </div>

                          <div className="flex items-center gap-3 text-muted-foreground">
                            <button
                              type="button"
                              className="w-10 h-10 rounded-2xl border border-border/55 bg-surface/30 hover:bg-surface-2/55 transition-colors inline-flex items-center justify-center"
                              aria-label="语音输入"
                            >
                              <Mic className="w-4 h-4" />
                            </button>
                            <div className="w-px h-6 bg-border/70" />
                            <div className="text-sm font-semibold">1×</div>
                            <div className="flex items-center rounded-2xl border border-border/55 bg-surface-2/55 overflow-hidden">
                              <div className="flex items-center gap-2 px-3 py-2 text-foreground/85">
                                <Coins className="w-4 h-4 text-muted-foreground" />
                                <div className="text-sm font-semibold">{aiCostPerSend}</div>
                              </div>
                              <button
                                type="button"
                                className="w-11 h-11 inline-flex items-center justify-center bg-surface-2/70 hover:bg-surface-2/85 transition-colors disabled:opacity-50"
                                aria-label="发送"
                                onClick={() => sendBlueprintChat(bp.id)}
                                disabled={bp.chatInput.trim().length === 0}
                              >
                                <ArrowUp className="w-4 h-4 text-foreground/90" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
