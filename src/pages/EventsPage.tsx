import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronDown, Clock, Search, Trophy, User, Heart } from 'lucide-react';
import { mockGames } from '../data/mock';
import { mockEvents, type MockEvent } from '../data/mockEvents';
import { useLocation } from 'react-router-dom';

// --- Components ---

function EventCard({ event, onClick }: { event: MockEvent; onClick: () => void }) {
  const isOngoing = event.status === 'ongoing';
  
  return (
    <div 
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-[20px] bg-surface-2 cursor-pointer ring-1 ring-border/50 hover:ring-border transition-all h-[280px]"
    >
      <img src={event.coverUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
      
      {/* Top Badge */}
      <div className="absolute top-4 left-4 flex items-center z-10">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold backdrop-blur-md border ${
          isOngoing 
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
            : 'bg-surface/55 text-foreground-soft/80 border-border/70'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          {event.statusText}
        </div>
      </div>

      {/* Bottom Gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/92 via-background/30 to-transparent z-0" />
      
      {/* Bottom Content */}
      <div className="absolute bottom-0 inset-x-0 p-5 flex flex-col gap-3 z-10">
        <div>
          <h3 className="text-xl font-bold text-foreground leading-snug line-clamp-2 mb-1.5">{event.title}</h3>
          <p className="text-[13px] text-foreground-soft/70 line-clamp-1">{event.subtitle}</p>
        </div>
        
        <div className="flex items-center">
           <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface/55 backdrop-blur-md border border-border/70 text-xs font-medium text-foreground-soft/85">
             <Trophy className="w-3.5 h-3.5 text-yellow-400/80" />
             {event.prize}
           </div>
        </div>
      </div>
    </div>
  );
}

function EventDetailModal({ event, onClose }: { event: MockEvent; onClose: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-12">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-[1200px] h-full overflow-y-auto bg-surface border border-border rounded-[24px] shadow-e3 flex flex-col custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Section */}
        <div className="sticky top-0 z-20 bg-surface/90 backdrop-blur-xl border-b border-border px-6 sm:px-10 py-6 sm:py-8 flex flex-col gap-8">
          <button onClick={onClose} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-fit group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            返回
          </button>
          
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
            <div className="flex flex-col gap-4 flex-1">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">{event.title}</h2>
              <div className="flex items-center gap-4 flex-wrap">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border ${
                  event.status === 'ongoing'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-surface-2/60 text-foreground-soft/80 border-border/70'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {event.statusText}
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  竞技场时间 {event.timeRange}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <button className="h-11 px-6 rounded-full border border-border bg-transparent text-sm font-semibold text-foreground hover:bg-surface-2/40 transition-all active:scale-95">
                去创作
              </button>
              <button className="h-11 px-8 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 hover:shadow-e2 transition-all active:scale-95">
                立即报名
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 sm:px-10 py-10 flex flex-col gap-16 pb-24">
          
          {/* Description */}
          <div className="flex flex-col items-start bg-surface-2/40 border border-border/60 rounded-2xl p-6 sm:p-8">
            <div className={`text-[15px] text-foreground-soft/80 leading-loose max-w-4xl w-full whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
              {event.description}
            </div>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-6 flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors bg-surface/50 hover:bg-surface-2/60 px-4 py-2 rounded-full border border-border/60"
            >
              {isExpanded ? '收起详情' : '展开详情'}
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Submissions Section */}
          <div className="flex flex-col gap-8 w-full">
            <h3 className="text-2xl font-bold text-foreground tracking-tight">参赛作品</h3>
            
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="flex items-center gap-8">
                <button className="text-[15px] font-semibold text-foreground border-b-2 border-foreground pb-4 -mb-[17px]">全部作品</button>
                <button className="text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors pb-4 -mb-[17px]">入围作品</button>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="h-9 px-4 rounded-full bg-surface/50 border border-border/60 text-[13px] font-medium text-foreground-soft/80 flex items-center gap-2 hover:bg-surface-2/60 transition-colors">
                  全部类型 <ChevronDown className="w-4 h-4" />
                </button>
                <div className="relative group">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-foreground transition-colors" />
                  <input 
                    type="text" 
                    placeholder="搜索作品..." 
                    className="h-9 pl-10 pr-4 rounded-full bg-surface/50 border border-border/60 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-ring/40 transition-all w-full sm:w-56"
                  />
                </div>
              </div>
            </div>

            {/* Submissions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {mockGames.slice(0, 8).map(game => (
                <div key={game.id} className="group relative rounded-[16px] overflow-hidden bg-surface-2/55 border border-border/60 cursor-pointer hover:border-border-strong hover:shadow-e3 transition-all duration-300">
                  <div className="aspect-[4/3] w-full relative">
                    <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/92 via-background/25 to-transparent" />
                    
                    <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col gap-2">
                      <div className="text-[11px] font-medium text-foreground-soft/70 flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-surface/70 flex items-center justify-center overflow-hidden border border-border/60">
                           <User className="w-2.5 h-2.5 text-foreground-soft/80" />
                        </div>
                        {game.author?.name || '匿名创作者'}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[15px] font-bold text-foreground truncate group-hover:text-foreground transition-colors">{game.title}</div>
                        <div className="flex items-center gap-1 text-[12px] font-semibold text-muted-foreground shrink-0 bg-surface/55 px-2 py-1 rounded-md backdrop-blur-sm border border-border/60">
                          <Heart className="w-3.5 h-3.5 text-rose-400/80" />
                          {game.likes || Math.floor(Math.random() * 500) + 10}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<MockEvent | null>(null);
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { eventId?: string } | null;
    if (!state?.eventId) return;
    const evt = mockEvents.find((e) => e.id === state.eventId) ?? null;
    if (!evt) return;
    setSelectedEvent(evt);
  }, [location.state]);

  return (
    <div className="min-h-screen bg-background text-foreground pt-10 pb-20">
      <div className="container mx-auto px-4 max-w-layout">
        <div className="flex items-center justify-between mb-8">
           <h1 className="text-[28px] font-bold tracking-tight text-foreground">竞技场</h1>
           <div className="flex gap-2">
             <button className="h-9 px-4 rounded-full border border-border/40 bg-surface-2/40 text-[13px] font-medium text-foreground transition-all">进行中</button>
             <button className="h-9 px-4 rounded-full border border-transparent bg-transparent text-[13px] font-medium text-muted-foreground hover:bg-surface-2/40 transition-all">已结束</button>
           </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockEvents.map(event => (
            <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
          ))}
        </div>
      </div>

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
