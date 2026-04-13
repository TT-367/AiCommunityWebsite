import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, ThumbsUp, ExternalLink, Copy, Settings2, ChevronRight } from 'lucide-react';
import { mockSkills } from '../data/mock';
import { Button } from '../components/ui/Button';
import { aiToolchainData, type AITool } from '../data/aiToolchain';
import { useMemo } from 'react';

export function SkillDetail() {
  const { id } = useParams<{ id: string }>();
  const skill = mockSkills.find((s) => s.id === id);

  const associatedTools = useMemo(() => {
    if (!skill) return [];
    const found: AITool[] = [];
    for (const cat of aiToolchainData) {
      for (const tool of cat.tools) {
        if (skill.tags.includes(tool.id)) found.push(tool);
      }
    }
    return found;
  }, [skill]);

  const associatedTool = associatedTools[0] ?? null;

  if (!skill) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-10 max-w-3xl">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回首页
          </Link>
          <div className="mt-6 bg-surface rounded-xl border border-border shadow-e1 p-6">
            <div className="text-lg font-extrabold">Skill 不存在</div>
            <div className="text-sm text-muted-foreground mt-2">该技能可能已被删除或尚未同步。</div>
          </div>
        </div>
      </div>
    );
  }

  const fileBaseName = skill.title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const fileName = `${fileBaseName || 'skill'}${skill.type === 'skill.md' ? '.md' : '.txt'}`;
  const mime = skill.type === 'skill.md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';

  const download = () => {
    const blob = new Blob([skill.content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回首页
        </Link>

        <div className="mt-6 bg-surface rounded-xl border border-border shadow-e1 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold px-2 py-1 rounded-md bg-surface-2 border border-border text-muted-foreground uppercase">
                {skill.type}
              </div>
              <h1 className="text-xl font-extrabold mt-3">{skill.title}</h1>
              <div className="text-sm text-muted-foreground mt-2">{skill.description}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {skill.tags.map((t) => (
                  <span key={t} className="text-[11px] px-2 py-1 rounded-md bg-surface-2 border border-border text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4" />
                {skill.likes}
              </div>
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                {skill.downloads}
              </div>
            </div>
          </div>

          {associatedTools.length > 0 && (
            <div className="mt-6 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <div className="text-[11px] font-extrabold text-primary uppercase mb-3 flex items-center gap-2">
                <Settings2 className="w-3 h-3" />
                推荐工具流 (Workflow)
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {associatedTools.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/toolchain?id=${t.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary/40 hover:shadow-e1 transition-all"
                    >
                      <img src={t.logo} alt={t.name} className="w-4 h-4 object-contain" />
                      <span className="text-xs font-bold text-foreground">{t.name}</span>
                    </Link>
                    {i < associatedTools.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-border bg-surface-2/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                内容预览
              </div>
              <div className="text-xs text-muted-foreground">{fileName}</div>
            </div>
            <pre className="mt-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words max-h-[340px] overflow-auto custom-scrollbar">
              {skill.content}
            </pre>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            {skill.type === 'prompt' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(skill.content);
                  }}
                  className="gap-2"
                >
                  <Copy className="w-3 h-3" />
                  仅复制
                </Button>
                {associatedTool && (
                  <Button
                    onClick={() => {
                      navigator.clipboard?.writeText(skill.content);
                      window.open(associatedTool.url, '_blank', 'noopener,noreferrer');
                    }}
                    className="gap-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    复制并前往 {associatedTool.name}
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={download} className="gap-2">
                <Download className="w-4 h-4" />
                下载文件
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
