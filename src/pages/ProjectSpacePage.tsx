import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { apiCreateProject, apiListProjects, isApiConfigured } from '../lib/apiClient';
import { listProjects, makeProjectId, upsertProject, type ProjectRecord } from '../data/projectAssetsStore';

function seededVariant(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 6;
}

export function ProjectSpacePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const openModal = useAuthStore((s) => s.openModal);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);

  useEffect(() => {
    if (!user) return;
    if (!isApiConfigured()) {
      setProjects(listProjects());
      return;
    }
    const token = session?.access_token ?? '';
    if (!token) return;
    apiListProjects({ accessToken: token })
      .then((res) => {
        const next: ProjectRecord[] = res.data.map((p) => ({
          id: p.id,
          name: p.name,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));
        setProjects(next);
      })
      .catch(() => void 0);
  }, [session?.access_token, user]);

  const openWorkspace = (projectId: string) => {
    if (!user) {
      openModal('signIn');
      return;
    }
    try {
      localStorage.setItem('oc:lastProjectId', projectId);
    } catch {
      void 0;
    }
    const next = new URLSearchParams();
    next.set('project', projectId);
    navigate({ pathname: '/workspace', search: next.toString() });
  };

  const createProject = () => {
    if (!user) {
      openModal('signIn');
      return;
    }
    const name = `新项目 ${new Date().toLocaleDateString()}`;
    if (!isApiConfigured()) {
      const id = makeProjectId();
      upsertProject({ id, name });
      setProjects(listProjects());
      openWorkspace(id);
      return;
    }
    const token = session?.access_token ?? '';
    if (!token) return;
    apiCreateProject({ accessToken: token, name })
      .then((res) => {
        setProjects((prev) => [
          { id: res.data.id, name: res.data.name, createdAt: res.data.created_at, updatedAt: res.data.updated_at },
          ...prev,
        ]);
        openWorkspace(res.data.id);
      })
      .catch(() => void 0);
  };

  const cardStyleFor = useMemo(() => {
    return (seed: string) => {
      const v = seededVariant(seed);
      const base =
        v === 0
          ? 'radial-gradient(520px circle at 20% 25%, rgba(var(--brand-2) / 0.32), transparent 60%), radial-gradient(520px circle at 80% 70%, rgba(var(--brand-3) / 0.22), transparent 62%)'
          : v === 1
            ? 'radial-gradient(520px circle at 15% 80%, rgba(var(--brand-2) / 0.28), transparent 62%), radial-gradient(520px circle at 85% 20%, rgba(var(--brand-1) / 0.18), transparent 58%)'
            : v === 2
              ? 'radial-gradient(520px circle at 30% 15%, rgba(var(--brand-3) / 0.22), transparent 60%), radial-gradient(520px circle at 80% 80%, rgba(var(--brand-2) / 0.22), transparent 64%)'
              : v === 3
                ? 'radial-gradient(520px circle at 10% 20%, rgba(var(--brand-1) / 0.20), transparent 58%), radial-gradient(520px circle at 90% 60%, rgba(var(--brand-2) / 0.20), transparent 62%)'
                : v === 4
                  ? 'radial-gradient(520px circle at 25% 75%, rgba(var(--brand-2) / 0.26), transparent 62%), radial-gradient(520px circle at 85% 25%, rgba(var(--brand-3) / 0.18), transparent 58%)'
                  : 'radial-gradient(520px circle at 35% 25%, rgba(var(--brand-3) / 0.20), transparent 62%), radial-gradient(520px circle at 75% 75%, rgba(var(--brand-1) / 0.16), transparent 60%)';
      return {
        backgroundImage: `${base}, linear-gradient(180deg, rgba(var(--surface-2) / 0.65), rgba(var(--surface) / 0.85))`,
      } as const;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-10 2xl:px-12 pt-6 pb-14">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/85 hover:text-foreground transition-colors">
            返回
          </Link>
          <div className="w-px h-5 bg-border/70" />
          <div className="text-[18px] font-semibold text-foreground/90 tracking-tight ui-display truncate">全部项目</div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        <button
          type="button"
          onClick={createProject}
          className="group relative rounded-[22px] border border-border/60 bg-surface-2/35 hover:bg-surface-2/45 hover:border-border-strong/80 transition-all overflow-hidden aspect-[4/4.6] flex items-center justify-center"
        >
          <div className="absolute inset-0 pointer-events-none opacity-70" style={{ backgroundImage: 'radial-gradient(800px circle at 30% 20%, rgba(var(--foreground) / 0.06), transparent 55%)' }} />
          <div className="relative flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border border-border/70 bg-surface/55 backdrop-blur-sm flex items-center justify-center shadow-e2">
              <Plus className="w-6 h-6 text-foreground/90" />
            </div>
            <div className="text-sm font-semibold text-foreground/90">新建项目</div>
          </div>
        </button>

        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => openWorkspace(p.id)}
            className="group text-left rounded-[22px] border border-border/60 bg-surface-2/30 hover:bg-surface-2/45 hover:border-border-strong/80 transition-all overflow-hidden"
          >
            <div className="p-3">
              <div className="relative rounded-[16px] overflow-hidden border border-border/55 bg-surface-2/45 aspect-[4/3]" style={cardStyleFor(p.id)}>
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(640px_circle_at_50%_-10%,rgba(var(--foreground)/0.10),transparent_62%)] opacity-60" />
              </div>
              <div className="mt-3 px-1">
                <div className="text-sm font-semibold text-foreground/90 truncate">{p.name}</div>
                <div className="mt-1 text-[11px] font-semibold text-muted-foreground truncate">
                  编辑于 {new Date(p.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">还没有项目，点击左上角新建开始创作。</div>
      ) : null}
    </div>
  );
}
