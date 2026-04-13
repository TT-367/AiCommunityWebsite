import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { useAuthStore } from '../stores/authStore';
import { mockSkillComments } from '../data/mock';

type SkillComment = {
  id: string;
  authorId: string | null;
  authorName: string;
  content: string;
  createdAt: string;
};

const STORAGE_KEY = 'skill_comments_v1';

function safeNowIso() {
  return new Date().toISOString();
}

function loadAll(): Record<string, SkillComment[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, SkillComment[]>;
  } catch {
    return {};
  }
}

function saveAll(next: Record<string, SkillComment[]>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function ensureSeed(skillId: string) {
  const all = loadAll();
  if (Array.isArray(all[skillId]) && all[skillId].length > 0) return;
  const seed = mockSkillComments[skillId] ?? [];
  if (seed.length === 0) return;
  all[skillId] = seed.map((s, idx) => ({
    id: `seed-${skillId}-${idx + 1}`,
    authorId: null,
    authorName: s.authorName,
    content: s.content,
    createdAt: s.createdAt,
  }));
  saveAll(all);
}

export function SkillComments({ skillId, open }: { skillId: string; open: boolean }) {
  const user = useAuthStore(s => s.user);
  const openModal = useAuthStore(s => s.openModal);

  const [comments, setComments] = useState<SkillComment[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!open) return;
    ensureSeed(skillId);
    const all = loadAll();
    setComments(Array.isArray(all[skillId]) ? all[skillId] : []);
  }, [open, skillId]);

  const count = comments.length;

  const viewerName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const displayName = typeof meta.display_name === 'string' ? meta.display_name : '';
    return displayName || user?.email || '用户';
  }, [user?.email, user?.user_metadata]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    if (!user) {
      openModal('signIn');
      return;
    }

    const next: SkillComment = {
      id: `c-${skillId}-${Date.now()}`,
      authorId: user.id,
      authorName: viewerName,
      content: text,
      createdAt: safeNowIso(),
    };
    const all = loadAll();
    const list = Array.isArray(all[skillId]) ? all[skillId] : [];
    const updated = [next, ...list].slice(0, 50);
    all[skillId] = updated;
    saveAll(all);
    setComments(updated);
    setDraft('');
  };

  if (!open) return null;

  return (
    <div className="mt-4 rounded-xl border border-border/50 bg-surface-2/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          评论
          <span className="text-xs font-bold text-muted-foreground bg-surface px-2 py-0.5 rounded-full border border-border">
            {count}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={user ? '写下你的看法…' : '登录后发表评论…'}
          className="min-h-[72px]"
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!user) {
                openModal('signIn');
                return;
              }
              submit();
            }}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            发表评论
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {comments.length === 0 ? (
          <div className="text-sm text-muted-foreground">暂无评论</div>
        ) : (
          comments.slice(0, 8).map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-surface px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-foreground truncate">{c.authorName}</div>
                <div className="text-[10px] text-muted-foreground shrink-0">{new Date(c.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap break-words">{c.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

