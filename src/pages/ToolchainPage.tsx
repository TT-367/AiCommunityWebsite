import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { aiToolchainData } from '../data/aiToolchain';
import { ToolDetailDialog } from '../components/ToolDetailDialog';
import { toolLogoFallbackUrl } from '../lib/toolLogos';

export function ToolchainPage() {
  const location = useLocation();
  const [toolOpen, setToolOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<null | { id: string; name: string; logo: string; url: string; description: string; engine?: string[] }>(null);

  const filteredData = useMemo(() => aiToolchainData.filter(cat => cat.tools.length > 0), []);
  const queryCategoryId = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const raw = sp.get('category');
    return raw ? raw.trim() : '';
  }, [location.search]);
  const [activeStep, setActiveStep] = useState(() => {
    if (!queryCategoryId) return 0;
    const idx = filteredData.findIndex((c) => c.id === queryCategoryId);
    return idx >= 0 ? idx : 0;
  });
  const categoryLabelById: Record<string, string> = {
    concept: '立项',
    art: '美术',
    dev: '程序',
    audio: '音效',
    engine_agent: '引擎助手',
  };

  // 按钮切换模式：不再使用滑动与拖拽逻辑
  useEffect(() => {
    if (!queryCategoryId) return;
    const idx = filteredData.findIndex((c) => c.id === queryCategoryId);
    if (idx >= 0) setActiveStep(idx);
  }, [filteredData, queryCategoryId]);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden relative">
      {/* 顶部 Header 区：固定不随横向滚动 */}
      <div className="shrink-0 bg-surface border-b border-border shadow-e1 z-10 relative">
        <div className="container mx-auto px-6 py-4 max-w-layout">
          {/* 返回与标题 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl font-extrabold text-foreground tracking-tight">AI 游戏开发工具库</h1>
                <p className="text-xs text-muted-foreground mt-0.5">点击下方领域按钮切换工具集</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 领域按钮切换 */}
      <div className="shrink-0 bg-surface z-10 relative border-b border-border py-4">
        <div className="container mx-auto px-6 max-w-layout">
          <div className="w-full max-w-layout mx-auto flex gap-2 overflow-x-auto hide-scrollbar py-0.5">
            {filteredData.map((cat, idx) => {
              const active = idx === activeStep;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveStep(idx)}
                  className={`${active ? 'bg-primary text-primary-foreground border-primary shadow-e2 ring-1 ring-primary/30' : 'bg-surface-2 text-muted-foreground hover:text-foreground border-border hover:bg-surface'} relative shrink-0 border rounded-full px-4 py-2 text-sm font-extrabold tracking-wide transition-all active:scale-[0.98]`}
                  aria-pressed={active}
                >
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-primary-foreground/20 to-transparent opacity-0 transition-opacity" style={{ opacity: active ? 1 : 0 }} />
                  <span className="relative">{categoryLabelById[cat.id] ?? cat.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 主内容区：按钮切换显示当前工具集 */}
      <div className="flex-1 bg-background overflow-y-auto">
        {filteredData[activeStep] && (
          <section className="w-full h-full">
            <div className="container mx-auto px-4 py-6 max-w-layout">
              <div className="max-w-2xl mb-4 bg-surface/50 p-4 rounded-xl border border-primary/10">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <span className="text-primary">0{activeStep + 1}.</span> {filteredData[activeStep].title}
                  <span className="bg-primary/10 text-primary text-[10px] py-0.5 px-2 rounded-full font-bold">
                    {filteredData[activeStep].tools.length} 个工具
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{filteredData[activeStep].summary}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-24">
                {filteredData[activeStep].tools.map(tool => (
                  <button
                    key={tool.id}
                    type="button"
                    className="group flex flex-col bg-surface p-3.5 rounded-xl border border-border shadow-e1 hover:shadow-e2 hover:border-primary/40 transition-all duration-300 hover:-translate-y-0.5 relative text-left"
                    onClick={() => {
                      setSelectedTool(tool);
                      setToolOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-surface-2 rounded-lg p-2 border border-border group-hover:bg-surface group-hover:shadow-e1 transition-all duration-300 relative z-10">
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
                      <div className="w-6 h-6 rounded-full bg-surface-2 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-1">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-3">
                      {tool.description}
                    </p>
                    {tool.engine && tool.engine.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-auto pt-3 border-t border-border">
                        {tool.engine.map(e => (
                          <span key={e} className="px-1.5 py-0.5 bg-surface-2 border border-border text-muted-foreground text-[9px] font-bold uppercase rounded group-hover:bg-primary/10 group-hover:border-primary/20 group-hover:text-primary transition-colors">
                            {e}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      <ToolDetailDialog open={toolOpen} onOpenChange={setToolOpen} tool={selectedTool} />
    </div>
  );
}
