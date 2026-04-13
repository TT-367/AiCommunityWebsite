import { useMemo, useState } from 'react';
import { Plus, Copy, ThumbsUp, Download, Flame, MessageSquare } from 'lucide-react';
import { Button } from './ui/Button';
import { mockSkills } from '../data/mock';
import { Link } from 'react-router-dom';
import { SkillComments } from './SkillComments';
import { canonicalizeTag, canonicalizeTags, getTagDisplayName, normalizeTagAlias } from '../lib/tags';

const MOCK_SKILLS = mockSkills;
const EMPTY_TAGS: string[] = [];

export function SkillMarket(props: { tags?: string[]; keyword?: string } = {}) {
  const filterTags = props.tags ?? EMPTY_TAGS;
  const keyword = (props.keyword ?? '').trim().toLowerCase();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'all' | 'prompt' | 'skill.md'>('all');
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);

  const handleCopy = (id: string, content: string) => {
    setCopiedId(id);
    navigator.clipboard?.writeText(content);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const displayedSkills = useMemo(() => {
    const base = activeType === 'all' ? MOCK_SKILLS : MOCK_SKILLS.filter(s => s.type === activeType);
    const tokens = keyword.length === 0 ? [] : keyword.split(/\s+/).map((t) => t.trim()).filter(Boolean);
    const filtered = base.filter((s) => {
      if (filterTags.length === 0 && keyword.length === 0) return true;
      const slugs = canonicalizeTags((s.tags ?? []).map((t) => String(t)));
      const overlap = filterTags.length > 0 ? slugs.some((t) => filterTags.includes(t)) : false;
      const text = `${s.title} ${s.description}`.toLowerCase();
      const kwHit =
        tokens.length === 0
          ? false
          : tokens.every((tok) => {
              const tl = tok.toLowerCase();
              const slug = canonicalizeTag(tok);
              const normTok = normalizeTagAlias(tl);
              const normTokValid = normTok.length > 0;
              const textHit = text.includes(tl) || (normTokValid ? normalizeTagAlias(text).includes(normTok) : false);
              const tagHit = slug ? slugs.includes(slug) : false;
              return textHit || tagHit;
            });
      return overlap || kwHit;
    });
    return filtered;
  }, [activeType, filterTags, keyword]);

  const hotIdSet = useMemo(() => {
    const top = [...displayedSkills].sort((a, b) => b.likes - a.likes).slice(0, 5);
    return new Set(top.map(s => s.id));
  }, [displayedSkills]);

  return (
    <div className="space-y-4">
      {/* 头部区域 */}
      <div className="bg-surface rounded-xl border border-border/50 shadow-e1 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">AI 技能市场</h2>
          <p className="text-sm text-muted-foreground mt-1">发现、分享与下载优质的 Prompt 与 Skill.md，加速你的游戏开发工作流。</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={activeType === 'all' ? 'secondary' : 'outline'}
              className={activeType === 'all' ? 'border border-border-strong' : 'border-border-strong'}
              onClick={() => setActiveType('all')}
            >
              全部
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeType === 'prompt' ? 'secondary' : 'outline'}
              className={activeType === 'prompt' ? 'border border-border-strong' : 'border-border-strong'}
              onClick={() => setActiveType('prompt')}
            >
              Prompt
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeType === 'skill.md' ? 'secondary' : 'outline'}
              className={activeType === 'skill.md' ? 'border border-border-strong' : 'border-border-strong'}
              onClick={() => setActiveType('skill.md')}
            >
              Skill.md
            </Button>
          </div>
        </div>
        <Button className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          提交技能
        </Button>
      </div>

      {/* 列表区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedSkills.map(skill => (
          <div key={skill.id} className="relative bg-surface rounded-xl border border-border/50 shadow-e1 p-5 hover:shadow-e2 hover:border-border transition-all flex flex-col h-full overflow-hidden">
            {hotIdSet.has(skill.id) && (
              <span className="absolute top-3 right-3 inline-flex items-center justify-center w-7 h-7 rounded-full bg-warning/10 border border-warning/20 text-warning">
                <Flame className="w-4 h-4" />
              </span>
            )}
            <div className="flex items-start justify-between mb-3">
              <div className="flex flex-col gap-2 w-full">
                <span className={`self-start px-2 py-0.5 text-[10px] font-bold rounded uppercase shrink-0 ${
                  skill.type === 'prompt' ? 'bg-info/10 text-info' : 'bg-primary/10 text-primary'
                }`}>
                  {skill.type}
                </span>
                <Link to={`/skills/${skill.id}`} className="hover:text-primary transition-colors">
                  <h3 className="font-semibold text-foreground leading-snug break-words">{skill.title}</h3>
                </Link>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
              {skill.description}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {canonicalizeTags(skill.tags.map((t) => String(t))).map(tag => (
                <span key={tag} className="px-2 py-1 bg-surface-2 text-muted-foreground text-[11px] rounded-md border border-border/50 shrink-0">
                  {getTagDisplayName(tag)}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto flex-wrap gap-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-surface-2 to-border flex items-center justify-center text-[10px] text-muted-foreground font-bold shrink-0">
                    {skill.author.charAt(0)}
                  </div>
                  <span className="truncate max-w-text-sm">{skill.author}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0" title="点赞数">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{skill.likes}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0" title="使用/下载数">
                  <Download className="w-3.5 h-3.5" />
                  <span>{skill.downloads}</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0"
                onClick={() => setOpenCommentsId(prev => (prev === skill.id ? null : skill.id))}
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                评论
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 ml-auto"
                onClick={() => handleCopy(skill.id, skill.content)}
              >
                {copiedId === skill.id ? (
                  <span className="text-success font-medium">已复制</span>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    获取
                  </>
                )}
              </Button>
            </div>

            <SkillComments skillId={skill.id} open={openCommentsId === skill.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
