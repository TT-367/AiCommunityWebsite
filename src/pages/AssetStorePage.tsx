import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, Search, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { upsertProject } from '../data/projectAssetsStore';
import { useAuthStore } from '../stores/authStore';

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

type AssetKind = 'style' | 'game' | 'character';

type AssetPack = {
  id: string;
  name: string;
  images: StyleModelImage[];
  coverUrl: string;
  kind: AssetKind;
};

type AssetCategory = 'all' | 'style' | 'game' | 'character';

const styleModelDescription = (name: string) => {
  const map: Record<string, string> = {
    废土生存: '荒凉质感与生存氛围',
    海盗港口: '木质结构与海港元素',
    火山熔岩: '高对比火山岩与热光',
    卡通城市: '明快卡通、轻量阴影',
    魔法地牢: '暗色魔法、石墙与符文',
    维多利亚工业: '金属/蒸汽/复古工业',
  };
  return map[name] ?? '可用于生成同风格场景与资产';
};

const buildPacksFromFolder = (segment: string, urls: Record<string, string>, kind: AssetKind): AssetPack[] => {
  const entries = Object.entries(urls).map(([path, url]) => {
    const after = path.split(`/${segment}/`)[1] ?? '';
    const parts = after.split('/');
    const fileName = parts[parts.length - 1] ?? after;
    const packName =
      parts.length >= 2
        ? (parts[0] ?? '资源')
        : (fileName.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '资源');
    return { path, url, fileName, packName };
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

  const packs: AssetPack[] = [];
  for (const [name, images] of map.entries()) {
    const sorted = [...images].sort((a, b) => toSortKey(a.fileName) - toSortKey(b.fileName));
    const cover = sorted.find((x) => /^1\./.test(x.fileName))?.url ?? sorted[0]?.url ?? '';
    if (!cover) continue;
    packs.push({ id: `${kind}:${name}`, name, images: sorted, coverUrl: cover, kind });
  }

  return packs.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
};

export function AssetStorePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const openModal = useAuthStore((s) => s.openModal);
  const [category, setCategory] = useState<AssetCategory>('all');
  const [q, setQ] = useState('');

  const createNewProject = () => {
    if (!user) {
      openModal('signIn');
      return;
    }
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `p_${Date.now()}`;
    try {
      localStorage.setItem('oc:lastProjectId', id);
    } catch {
      void 0;
    }
    upsertProject({ id, name: `新项目 ${new Date().toLocaleDateString()}` });
    const next = new URLSearchParams();
    next.set('project', id);
    next.set('stage', 'concept');
    navigate({ pathname: '/', search: next.toString() });
  };

  const stylePacks = useMemo<AssetPack[]>(() => buildPacksFromFolder('style-models', STYLE_MODEL_IMAGE_URLS, 'style'), []);
  const gamePacks = useMemo<AssetPack[]>(() => buildPacksFromFolder('game-templates', GAME_TEMPLATE_IMAGE_URLS, 'game'), []);
  const characterPacks = useMemo<AssetPack[]>(
    () => buildPacksFromFolder('character-templates', CHARACTER_TEMPLATE_IMAGE_URLS, 'character'),
    []
  );

  const [packModalId, setPackModalId] = useState<string | null>(null);
  const [packActiveIndex, setPackActiveIndex] = useState(0);
  const [packProcessOpen, setPackProcessOpen] = useState(false);
  const selectedPack = useMemo<AssetPack | null>(() => {
    if (!packModalId) return null;
    return [...stylePacks, ...gamePacks, ...characterPacks].find((p) => p.id === packModalId) ?? null;
  }, [characterPacks, gamePacks, packModalId, stylePacks]);

  const query = q.trim().toLowerCase();
  const hit = useCallback((s: string) => s.toLowerCase().includes(query), [query]);

  const filteredStyle = useMemo(() => {
    if (!query) return stylePacks;
    return stylePacks.filter((p) => hit(p.name) || hit(styleModelDescription(p.name)));
  }, [hit, query, stylePacks]);

  const filteredGame = useMemo(() => {
    if (!query) return gamePacks;
    return gamePacks.filter((p) => hit(p.name));
  }, [gamePacks, hit, query]);

  const filteredCharacter = useMemo(() => {
    if (!query) return characterPacks;
    return characterPacks.filter((p) => hit(p.name));
  }, [characterPacks, hit, query]);

  const items = useMemo(() => {
    if (category === 'style') return filteredStyle;
    if (category === 'game') return filteredGame;
    if (category === 'character') return filteredCharacter;
    return [...filteredStyle, ...filteredGame, ...filteredCharacter];
  }, [category, filteredCharacter, filteredGame, filteredStyle]);

  return (
    <main className="container mx-auto px-4 py-8 max-w-layout">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">资产商店</h1>
          <div className="text-xs text-muted-foreground mt-1">黑白灰基底 + 内容为主的资产网格</div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:w-[360px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-muted-foreground" />
            </div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索资源 / 风格模板 / 游戏模板 / 角色模板"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <CategoryPill active={category === 'all'} onClick={() => setCategory('all')} label="全部" />
        <CategoryPill active={category === 'style'} onClick={() => setCategory('style')} label="风格模板" />
        <CategoryPill active={category === 'game'} onClick={() => setCategory('game')} label="游戏模板" />
        <CategoryPill active={category === 'character'} onClick={() => setCategory('character')} label="角色模板" />
        <div className="ml-auto hidden md:flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={createNewProject}>
            新建项目
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {items.map((p) => (
          <button
            key={p.id}
            type="button"
            className="group text-left flex flex-col gap-2"
            onClick={() => {
              setPackActiveIndex(0);
              setPackProcessOpen(false);
              setPackModalId(p.id);
            }}
          >
            <div className="relative w-full aspect-square overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-e1 group-hover:border-border-strong group-hover:shadow-e2 transition-all">
              <img
                src={p.coverUrl}
                alt={p.name}
                className="block h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                draggable={false}
                loading="lazy"
              />
            </div>
            <div className="px-0.5">
              <div className="text-[12px] font-medium text-muted-foreground truncate">{p.name}</div>
            </div>
          </button>
        ))}
      </div>

      <Dialog
        open={selectedPack !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPackModalId(null);
            setPackProcessOpen(false);
          }
        }}
      >
        <DialogContent
          className="max-w-[1160px] p-0 bg-transparent border-0 shadow-none"
          overlayClassName="bg-background/80 backdrop-blur-md"
          viewportClassName="p-3 sm:p-6 lg:p-10"
          hideCloseButton
        >
          {selectedPack && (
            <div className="relative overflow-hidden rounded-[24px] border border-border bg-surface shadow-e3">
              <div className="relative h-[62vh] min-h-[420px] max-h-[720px] bg-surface-2 overflow-hidden">
                <img
                  src={
                    selectedPack.images[Math.min(packActiveIndex, selectedPack.images.length - 1)]?.url ?? selectedPack.coverUrl
                  }
                  alt={selectedPack.name}
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
                      setPackModalId(null);
                      setPackProcessOpen(false);
                    }}
                  >
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                    返回
                  </button>

                  <div className="min-w-0 flex-1 px-3 hidden sm:block">
                    <div className="text-[13px] font-semibold text-foreground/90 truncate ui-display">{selectedPack.name}</div>
                    <div className="mt-0.5 text-[11px] font-medium text-foreground-soft/70 truncate">
                      {selectedPack.kind === 'style'
                        ? `风格模板 · ${styleModelDescription(selectedPack.name)}`
                        : selectedPack.kind === 'game'
                          ? '游戏模板'
                          : '角色模板'}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-border/60 bg-surface/55 backdrop-blur-md hover:bg-surface-2/60 text-foreground/90"
                    onClick={() => {
                      createNewProject();
                      setPackModalId(null);
                      setPackProcessOpen(false);
                    }}
                  >
                    使用此模板
                  </Button>
                </div>

                {packProcessOpen && (
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
                          onClick={() => setPackProcessOpen(false)}
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
                    onClick={() => setPackProcessOpen((v) => !v)}
                  >
                    查看制作过程
                  </Button>
                </div>
              </div>

              {selectedPack.images.length > 1 && (
                <div className="border-t border-border bg-surface px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-muted-foreground">预览</div>
                    <div className="text-xs font-semibold text-muted-foreground">{selectedPack.images.length} 张</div>
                  </div>
                  <div className="mt-3 overflow-x-auto no-scrollbar">
                    <div className="flex items-stretch gap-3 w-max pr-2">
                      {selectedPack.images.map((img, idx) => (
                        <button
                          key={img.path}
                          type="button"
                          className={
                            idx === packActiveIndex
                              ? 'relative w-28 h-16 rounded-xl overflow-hidden border border-primary/40 bg-surface shadow-e1'
                              : 'relative w-28 h-16 rounded-xl overflow-hidden border border-border bg-surface hover:border-border-strong'
                          }
                          onClick={() => setPackActiveIndex(idx)}
                          aria-label={`预览 ${idx + 1}`}
                        >
                          <img
                            src={img.url}
                            alt={`${selectedPack.name}-${idx + 1}`}
                            className="w-full h-full object-cover"
                            draggable={false}
                            loading="lazy"
                          />
                          {idx === packActiveIndex && <div className="absolute inset-0 ring-1 ring-primary/30" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function CategoryPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? 'h-9 px-3 rounded-full border border-border-strong bg-surface text-foreground text-xs font-semibold'
          : 'h-9 px-3 rounded-full border border-border bg-surface/70 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors text-xs font-semibold'
      }
      onClick={onClick}
    >
      {label}
    </button>
  );
}
