import { useMemo, useState } from 'react';
import { ChevronRight, ExternalLink, Gamepad2, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { aiToolchainData } from '../data/aiToolchain';
import { ToolDetailDialog } from './ToolDetailDialog';
import { toolLogoFallbackUrl } from '../lib/toolLogos';

const ENGINES = ['All', 'Unity', 'UE', 'Godot', 'Cocos', 'Tuanjie'];

export function AIToolchainSidebar(props?: { mode?: 'sidebar' | 'drawer' }) {
  const mode = props?.mode ?? 'sidebar';
  const [activeSubEngine, setActiveSubEngine] = useState('All');
  const [toolOpen, setToolOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<null | { id: string; name: string; logo: string; url: string; description: string; engine?: string[] }>(null);

  const filteredData = useMemo(() => {
    return aiToolchainData.map(cat => {
      // 只有引擎内置辅助分类才应用内部筛选
      if (cat.id === 'engine_agent') {
        if (activeSubEngine === 'All') {
          return cat;
        }
        return {
          ...cat,
          tools: cat.tools.filter(t => t.engine && t.engine.includes(activeSubEngine))
        };
      }
      return cat;
    });
  }, [activeSubEngine]);

  return (
    <div
      className={`bg-surface border border-border shadow-e1 flex flex-col h-full overflow-hidden w-full max-w-full text-foreground ${mode === 'drawer' ? 'rounded-none' : 'rounded-xl md:max-h-[calc(100vh-8rem)] md:sticky md:top-24'}`}
    >
      {/* 头部与引擎筛选 */}
      <div className="p-4 border-b border-border shrink-0 bg-surface-2/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-e1">
            <Settings2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground leading-none">AI 工具链</h2>
            <span className="text-[10px] text-muted-foreground font-medium mt-1 inline-block">覆盖游戏开发全流程</span>
          </div>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto custom-scrollbar bg-background ${mode === 'drawer' ? 'p-3 space-y-3' : 'p-2 space-y-2'}`}>
        {filteredData.map(cat => {
          const toolsSorted = [...cat.tools].sort((a, b) => {
            const ax = a.isTop ? 1 : 0;
            const bx = b.isTop ? 1 : 0;
            if (ax !== bx) return bx - ax;
            return a.name.localeCompare(b.name);
          });
          const displayTools = toolsSorted.slice(0, 3);
          const link = cat.id === 'engine_agent' && activeSubEngine !== 'All'
            ? `/toolchain?category=${encodeURIComponent(cat.id)}&engine=${encodeURIComponent(activeSubEngine)}`
            : `/toolchain?category=${encodeURIComponent(cat.id)}`;

          return (
            <div key={cat.id} className="rounded-xl border border-border bg-surface shadow-e1 overflow-hidden">
              <div className="px-3 py-3 border-b border-border bg-surface-2/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-extrabold text-foreground truncate">{cat.title}</div>
                      <span className="text-[10px] font-bold text-muted-foreground bg-surface px-2 py-0.5 rounded-full border border-border">
                        {cat.tools.length}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{cat.summary}</div>
                  </div>
                  <Link
                    to={link}
                    className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors"
                  >
                    查看全部
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {cat.id === 'engine_agent' && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {ENGINES.map((eng) => (
                      <button
                        key={eng}
                        type="button"
                        onClick={() => setActiveSubEngine(eng)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-colors ${
                          activeSubEngine === eng
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-surface-2'
                        }`}
                      >
                        {eng}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3">
                {displayTools.length === 0 ? (
                  <div className="text-xs text-muted-foreground">暂无工具</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {displayTools.map(tool => (
                      <button
                        key={tool.id}
                        type="button"
                        className="group/tool relative flex flex-col items-center justify-center p-2 rounded-xl bg-surface-2/80 hover:bg-surface border border-transparent hover:border-primary/30 hover:shadow-e1 transition-all text-center"
                        onClick={() => {
                          setSelectedTool(tool);
                          setToolOpen(true);
                        }}
                      >
                        <div className="w-9 h-9 flex items-center justify-center bg-surface rounded-lg shadow-e1 border border-border mb-1.5 group-hover/tool:border-primary/40 p-1.5">
                          <img
                            src={tool.logo}
                            alt={tool.name}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (img.dataset.fallbackApplied === '1') return;
                              img.dataset.fallbackApplied = '1';
                              img.src = toolLogoFallbackUrl();
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground group-hover/tool:text-primary leading-tight line-clamp-1 w-full">
                          {tool.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* 底部全量入口 */}
      <div className="p-3 border-t border-border bg-surface-2 shrink-0">
        <Link
          to="/toolchain"
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-foreground bg-surface border border-border-strong rounded-lg hover:bg-surface-2 hover:text-primary transition-colors shadow-e1"
        >
          <span className="flex items-center gap-1.5"><Gamepad2 className="w-3.5 h-3.5" /> 完整工具库</span>
          <ExternalLink className="w-3 h-3 text-muted-foreground" />
        </Link>
      </div>

      <ToolDetailDialog open={toolOpen} onOpenChange={setToolOpen} tool={selectedTool} />
    </div>
  );
}
