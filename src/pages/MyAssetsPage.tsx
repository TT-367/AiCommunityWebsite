import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ExternalLink, FileText, FolderPlus, Link2, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { useAuthStore } from '../stores/authStore';
import {
  apiAddProjectAsset,
  apiCreateProject,
  apiDeleteProject,
  apiDeleteProjectAsset,
  apiListProjectAssets,
  apiListProjects,
  isApiConfigured,
} from '../lib/apiClient';
import {
  addProjectAsset,
  deleteProject,
  deleteProjectAsset,
  listProjectAssets,
  listProjects,
  makeProjectId,
  upsertProject,
  type ProjectAssetItem,
  type ProjectRecord,
} from '../data/projectAssetsStore';

function useQuery() {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search), [location.search]);
}

function downloadFromDataUrl(fileName: string, dataUrl: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function MyAssetsPage() {
  const navigate = useNavigate();
  const query = useQuery();
  const projectIdFromQuery = (query.get('project') ?? '').trim();
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const openModal = useAuthStore((s) => s.openModal);
  const needsLogin = !user;
  const [projects, setProjects] = useState<ProjectRecord[]>(() => (isApiConfigured() ? [] : listProjects()));
  const [activeProjectId, setActiveProjectId] = useState<string>(projectIdFromQuery);
  const [items, setItems] = useState<ProjectAssetItem[]>(() =>
    isApiConfigured() ? [] : projectIdFromQuery ? listProjectAssets(projectIdFromQuery) : [],
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!needsLogin) return;
    openModal('signIn');
  }, [needsLogin, openModal]);

  useEffect(() => {
    if (needsLogin) return;
    if (!isApiConfigured()) {
      setProjects(listProjects());
      return;
    }
    const token = session?.access_token ?? '';
    if (!token) return;
    apiListProjects({ accessToken: token })
      .then((res) => {
        setProjects(res.data.map((p) => ({ id: p.id, name: p.name, createdAt: p.created_at, updatedAt: p.updated_at })));
      })
      .catch(() => void 0);
  }, [needsLogin, session?.access_token]);

  useEffect(() => {
    if (needsLogin) return;
    if (!projectIdFromQuery) return;
    setActiveProjectId(projectIdFromQuery);
  }, [needsLogin, projectIdFromQuery]);

  useEffect(() => {
    if (needsLogin) return;
    if (!activeProjectId) {
      setItems([]);
      return;
    }
    if (!isApiConfigured()) {
      setItems(listProjectAssets(activeProjectId));
      return;
    }
    const token = session?.access_token ?? '';
    if (!token) return;
    apiListProjectAssets({ accessToken: token, projectId: activeProjectId })
      .then((res) => {
        setItems(
          res.data.map((a) => ({
            id: a.id,
            projectId: a.project_id,
            kind: a.kind,
            title: a.title,
            createdAt: a.created_at,
            updatedAt: a.updated_at,
            fileName: a.file_name ?? undefined,
            mime: a.mime ?? undefined,
            size: typeof a.size === 'number' ? a.size : undefined,
            dataUrl: a.data_url ?? undefined,
            content: a.content ?? undefined,
            url: a.url ?? undefined,
          })),
        );
      })
      .catch(() => void 0);
  }, [activeProjectId, needsLogin, session?.access_token]);

  useEffect(() => {
    if (needsLogin) return;
    const current = (query.get('project') ?? '').trim();
    if (!activeProjectId) {
      if (!current) return;
      const next = new URLSearchParams(query);
      next.delete('project');
      navigate({ pathname: '/my-assets', search: next.toString() }, { replace: true });
      return;
    }
    if (current === activeProjectId) return;
    const next = new URLSearchParams(query);
    next.set('project', activeProjectId);
    navigate({ pathname: '/my-assets', search: next.toString() }, { replace: true });
  }, [activeProjectId, navigate, needsLogin, query]);

  const activeProject = useMemo(() => projects.find((p) => p.id === activeProjectId) ?? null, [activeProjectId, projects]);

  const refresh = () => {
    if (!isApiConfigured()) {
      setProjects(listProjects());
      if (activeProjectId) setItems(listProjectAssets(activeProjectId));
      return;
    }
    const token = session?.access_token ?? '';
    if (!token) return;
    apiListProjects({ accessToken: token })
      .then((res) => {
        setProjects(res.data.map((p) => ({ id: p.id, name: p.name, createdAt: p.created_at, updatedAt: p.updated_at })));
      })
      .catch(() => void 0);
    if (activeProjectId) {
      apiListProjectAssets({ accessToken: token, projectId: activeProjectId })
        .then((res) => {
          setItems(
            res.data.map((a) => ({
              id: a.id,
              projectId: a.project_id,
              kind: a.kind,
              title: a.title,
              createdAt: a.created_at,
              updatedAt: a.updated_at,
              fileName: a.file_name ?? undefined,
              mime: a.mime ?? undefined,
              size: typeof a.size === 'number' ? a.size : undefined,
              dataUrl: a.data_url ?? undefined,
              content: a.content ?? undefined,
              url: a.url ?? undefined,
            })),
          );
        })
        .catch(() => void 0);
    }
  };

  const openWorkspace = (projectId: string) => {
    try {
      localStorage.setItem('oc:lastProjectId', projectId);
    } catch {
      void 0;
    }
    const next = new URLSearchParams();
    next.set('project', projectId);
    navigate({ pathname: '/workspace', search: next.toString() });
  };

  const ensureProject = () => {
    if (activeProjectId) return true;
    setError('请先创建或选择一个项目。');
    return false;
  };

  const onCreateProject = () => {
    const name = createName.trim() || `项目 ${new Date().toLocaleDateString()}`;
    if (!isApiConfigured()) {
      const id = makeProjectId();
      upsertProject({ id, name });
      try {
        localStorage.setItem('oc:lastProjectId', id);
      } catch {
        void 0;
      }
      setCreateOpen(false);
      setCreateName('');
      setError(null);
      setActiveProjectId(id);
      refresh();
      return;
    }
    const token = session?.access_token ?? '';
    if (!token) return;
    apiCreateProject({ accessToken: token, name })
      .then((res) => {
        try {
          localStorage.setItem('oc:lastProjectId', res.data.id);
        } catch {
          void 0;
        }
        setCreateOpen(false);
        setCreateName('');
        setError(null);
        setActiveProjectId(res.data.id);
        refresh();
      })
      .catch(() => setError('创建失败，请稍后重试。'));
  };

  const onPickFile = async (file: File) => {
    if (!ensureProject()) return;
    if (file.size > 1_800_000) {
      setError('文件过大（建议 ≤ 1.8MB）。当前版本采用本地存储，适合保存小文件/截图/配置文本。');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('read_failed'));
      reader.readAsDataURL(file);
    });
    const title = file.name.replace(/\.[^/.]+$/, '');
    if (!isApiConfigured()) {
      const ok = addProjectAsset({
        id: `a_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        projectId: activeProjectId,
        kind: 'file',
        title: title || file.name,
        fileName: file.name,
        mime: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl,
      });
      if (!ok.ok) {
        setError('存储失败：可能超出浏览器存储上限。请尝试更小的文件。');
        return;
      }
      setError(null);
      refresh();
      return;
    }
    const token = session?.access_token ?? '';
    if (!token) return;
    const created = await apiAddProjectAsset({
      accessToken: token,
      projectId: activeProjectId,
      asset: {
        kind: 'file',
        title: title || file.name,
        fileName: file.name,
        mime: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl,
      },
    });
    setItems((prev) => [
      {
        id: created.data.id,
        projectId: created.data.project_id,
        kind: created.data.kind,
        title: created.data.title,
        createdAt: created.data.created_at,
        updatedAt: created.data.updated_at,
        fileName: created.data.file_name ?? undefined,
        mime: created.data.mime ?? undefined,
        size: typeof created.data.size === 'number' ? created.data.size : undefined,
        dataUrl: created.data.data_url ?? undefined,
      },
      ...prev,
    ]);
    setError(null);
  };

  const onAddNote = () => {
    if (!ensureProject()) return;
    const title = noteTitle.trim() || '未命名笔记';
    const content = noteContent.trim();
    if (!isApiConfigured()) {
      const ok = addProjectAsset({
        id: `a_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        projectId: activeProjectId,
        kind: 'note',
        title,
        content,
      });
      if (!ok.ok) {
        setError('存储失败：可能超出浏览器存储上限。');
        return;
      }
      setNoteOpen(false);
      setNoteTitle('');
      setNoteContent('');
      setError(null);
      refresh();
      return;
    }
    const token = session?.access_token ?? '';
    if (!token) return;
    apiAddProjectAsset({ accessToken: token, projectId: activeProjectId, asset: { kind: 'note', title, content } })
      .then((created) => {
        setItems((prev) => [
          {
            id: created.data.id,
            projectId: created.data.project_id,
            kind: created.data.kind,
            title: created.data.title,
            createdAt: created.data.created_at,
            updatedAt: created.data.updated_at,
            content: created.data.content ?? undefined,
          },
          ...prev,
        ]);
        setNoteOpen(false);
        setNoteTitle('');
        setNoteContent('');
        setError(null);
      })
      .catch(() => setError('保存失败，请稍后重试。'));
  };

  const onAddLink = () => {
    if (!ensureProject()) return;
    const title = linkTitle.trim() || '外部资源';
    const url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      setError('请输入以 http:// 或 https:// 开头的链接。');
      return;
    }
    if (!isApiConfigured()) {
      const ok = addProjectAsset({
        id: `a_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        projectId: activeProjectId,
        kind: 'link',
        title,
        url,
      });
      if (!ok.ok) {
        setError('存储失败：可能超出浏览器存储上限。');
        return;
      }
      setLinkOpen(false);
      setLinkTitle('');
      setLinkUrl('');
      setError(null);
      refresh();
      return;
    }
    const token = session?.access_token ?? '';
    if (!token) return;
    apiAddProjectAsset({ accessToken: token, projectId: activeProjectId, asset: { kind: 'link', title, url } })
      .then((created) => {
        setItems((prev) => [
          {
            id: created.data.id,
            projectId: created.data.project_id,
            kind: created.data.kind,
            title: created.data.title,
            createdAt: created.data.created_at,
            updatedAt: created.data.updated_at,
            url: created.data.url ?? undefined,
          },
          ...prev,
        ]);
        setLinkOpen(false);
        setLinkTitle('');
        setLinkUrl('');
        setError(null);
      })
      .catch(() => setError('保存失败，请稍后重试。'));
  };

  if (needsLogin) {
    return (
      <main className="container mx-auto px-4 py-10 max-w-layout">
        <div className="ui-panel-muted p-6 md:p-8">
          <div className="text-lg font-semibold text-foreground tracking-tight">请先登录</div>
          <div className="text-sm text-muted-foreground mt-2">登录后才能创建项目并使用资产库。</div>
          <div className="mt-6 flex items-center gap-3">
            <Button onClick={() => openModal('signIn')}>去登录</Button>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              返回首页
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-14 2xl:px-20 pt-6 pb-14">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[24px] leading-tight font-semibold text-foreground/90 tracking-tight ui-display">我的资产库</div>
          <div className="mt-1 text-sm text-foreground-soft/75">
            按项目管理文件与资产
          </div>
        </div>
        {activeProject && (
          <Button
            size="sm"
            variant="primary"
            className="h-9 rounded-full shadow-e3 bg-primary/90 hover:bg-primary text-primary-foreground"
            onClick={() => openWorkspace(activeProject.id)}
          >
            进入工作空间
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-border bg-surface-2/40 p-4 text-sm text-foreground-soft/85">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3">
          <div className="ui-panel overflow-hidden">
            <div className="ui-panel-header px-5 py-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground/90 tracking-tight">项目</div>
                <div className="mt-1 text-xs text-muted-foreground">选择后独立存储</div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="border border-border-strong/70 bg-surface/55 hover:bg-surface-2/75 text-foreground/90"
                onClick={() => setCreateOpen(true)}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                新建
              </Button>
            </div>
            <div className="p-3 grid gap-2">
              {projects.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface-2/40 p-4 text-center">
                  <div className="text-sm font-semibold text-foreground/90">暂无项目</div>
                  <div className="mt-2 text-xs text-muted-foreground">点击右上角“新建”创建第一个项目。</div>
                </div>
              ) : (
                projects.map((p) => {
                  const isActive = p.id === activeProjectId;
                  return (
                    <div
                      key={p.id}
                      className={
                        isActive
                          ? 'w-full rounded-xl border border-primary/25 bg-primary/10 px-3 py-3 flex items-center gap-2'
                          : 'w-full rounded-xl border border-border bg-surface hover:bg-surface-2 px-3 py-3 flex items-center gap-2'
                      }
                    >
                      <button
                        type="button"
                        className="flex-1 min-w-0 text-left"
                        onClick={() => {
                          setError(null);
                          setActiveProjectId(p.id);
                          try {
                            localStorage.setItem('oc:lastProjectId', p.id);
                          } catch {
                            void 0;
                          }
                        }}
                      >
                        <div className="text-sm font-semibold text-foreground/90 truncate">{p.name}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground font-semibold truncate">
                          最近更新 {new Date(p.updatedAt).toLocaleString()}
                        </div>
                      </button>
                      <Button
                        size="sm"
                        variant={isActive ? 'primary' : 'outline'}
                        className={
                          isActive
                            ? 'rounded-full h-8 px-3 shadow-e2 bg-primary/90 hover:bg-primary text-primary-foreground'
                            : 'rounded-full h-8 px-3 shadow-e1 bg-surface/55 hover:bg-surface-2/75 border-border-strong/70 text-foreground/90'
                        }
                        onClick={() => openWorkspace(p.id)}
                      >
                        进入
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <section className="lg:col-span-9 min-w-0">
          <div className="ui-panel overflow-hidden">
            <div className="ui-panel-header px-5 py-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground/90 tracking-tight truncate">
                  {activeProject ? activeProject.name : '未选择项目'}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">文件、笔记、外部链接会按项目隔离</div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.currentTarget.files?.[0] ?? null;
                    e.currentTarget.value = '';
                    if (!f) return;
                    try {
                      await onPickFile(f);
                    } catch {
                      setError('读取文件失败。');
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="border border-border-strong/70 bg-surface/55 hover:bg-surface-2/75 text-foreground/90"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  导入文件
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="border border-border-strong/70 bg-surface/55 hover:bg-surface-2/75 text-foreground/90"
                  onClick={() => setNoteOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新建笔记
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="border border-border-strong/70 bg-surface/55 hover:bg-surface-2/75 text-foreground/90"
                  onClick={() => setLinkOpen(true)}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  添加链接
                </Button>
                {activeProject && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="shadow-e2"
                    onClick={() => {
                      if (!isApiConfigured()) {
                        deleteProject(activeProject.id);
                        setError(null);
                        setActiveProjectId('');
                        refresh();
                        return;
                      }
                      const token = session?.access_token ?? '';
                      if (!token) return;
                      apiDeleteProject({ accessToken: token, id: activeProject.id })
                        .then(() => {
                          setError(null);
                          setActiveProjectId('');
                          refresh();
                        })
                        .catch(() => setError('删除失败，请稍后重试。'));
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除项目
                  </Button>
                )}
              </div>
            </div>

            <div className="p-5">
              {!activeProject ? (
                <div className="rounded-xl border border-border bg-surface-2/40 p-6 text-center">
                  <div className="text-base font-semibold text-foreground/90">请选择一个项目</div>
                  <div className="mt-2 text-sm text-muted-foreground">每个项目的文件与资产会单独保存。</div>
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface-2/40 p-6 text-center">
                  <div className="text-base font-semibold text-foreground/90">暂无内容</div>
                  <div className="mt-2 text-sm text-muted-foreground">可导入文件、新建笔记或添加外部链接。</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((it) => (
                    <div key={it.id} className="rounded-2xl border border-border bg-surface hover:bg-surface-2 transition-colors overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground/90 truncate">{it.title}</div>
                            <div className="mt-1 text-[11px] text-muted-foreground font-semibold">
                              {it.kind === 'file' ? '文件' : it.kind === 'note' ? '笔记' : '链接'} ·{' '}
                              {new Date(it.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="w-9 h-9 rounded-xl border border-border bg-surface/70 hover:bg-surface transition-colors inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              if (!isApiConfigured()) {
                                deleteProjectAsset(it.projectId, it.id);
                                refresh();
                                return;
                              }
                              const token = session?.access_token ?? '';
                              if (!token) return;
                              apiDeleteProjectAsset({ accessToken: token, projectId: it.projectId, assetId: it.id })
                                .then(() => {
                                  setItems((prev) => prev.filter((x) => x.id !== it.id));
                                })
                                .catch(() => setError('删除失败，请稍后重试。'));
                            }}
                            aria-label="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {it.kind === 'note' && (
                          <div className="mt-3 text-xs text-foreground-soft/80 whitespace-pre-wrap line-clamp-6">{it.content ?? ''}</div>
                        )}
                        {it.kind === 'link' && (
                          <a
                            href={it.url ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-foreground-soft/80 hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span className="truncate">{it.url}</span>
                          </a>
                        )}
                        {it.kind === 'file' && (
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div className="min-w-0 text-xs text-muted-foreground font-semibold truncate">
                              {it.fileName ?? 'file'}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (!it.dataUrl || !it.fileName) return;
                                downloadFromDataUrl(it.fileName, it.dataUrl);
                              }}
                            >
                              下载
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => setCreateOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建项目</DialogTitle>
            <DialogDescription>项目用于隔离你的文件与资产。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="grid gap-3">
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="项目名称（可选）" />
              <Button onClick={onCreateProject}>创建</Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={(open) => setNoteOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建笔记</DialogTitle>
            <DialogDescription>保存需求、链接、指令、设计说明等。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="grid gap-3">
              <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="标题" />
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="内容"
                className="min-h-[140px] resize-none"
              />
              <Button onClick={onAddNote}>保存</Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={(open) => setLinkOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加链接</DialogTitle>
            <DialogDescription>保存外部素材、文档、网盘、仓库等。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="grid gap-3">
              <Input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="标题（可选）" />
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
              <Button onClick={onAddLink}>保存</Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
