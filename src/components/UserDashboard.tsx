import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  Plus,
  Search,
  Layout,
  Layers,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  FolderOpen,
  Clock,
  MoreVertical,
  ArrowUpRight,
  CreditCard,
  History,
  Command,
  PlusCircle,
  Globe,
  Terminal,
  Cpu,
  LayoutGrid
} from 'lucide-react';
import { getAuthUser } from '../lib/supabaseClient';

type UserDashboardProps = {
  onOpenStudio: (prompt?: string, projectId?: string) => void;
  onSignOut: () => void;
  onOpenBillingPortal?: () => void;
};

type ViewMode = 'grid' | 'list';

export default function UserDashboard({
  onOpenStudio,
  onSignOut,
  onOpenBillingPortal,
}: UserDashboardProps) {
  const [prompt, setPrompt] = useState('');
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAuthUser().then(u => {
      setUser(u);
      if (u) {
        fetch(`/api/projects`)
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) setProjects(data);
          })
          .catch(err => console.error("Error loading projects", err));
      }
    });
  }, []);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    onOpenStudio(prompt);
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Creator';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="h-screen flex bg-[#030408] text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* ── BACKGROUND ORB ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-blue-600/5 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-emerald-600/5 rounded-full blur-[140px]" />
      </div>

      {/* ── SLIM FLOATING SIDEBAR ── */}
      <aside className="w-20 flex flex-col items-center py-8 border-r border-white/5 bg-[#030408]/50 backdrop-blur-xl z-50">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 mb-12 group cursor-pointer hover:scale-110 transition-transform">
          <Zap size={22} className="text-white fill-white" />
        </div>

        <nav className="flex-1 flex flex-col gap-6">
          <NavItem icon={Layout} active label="Home" />
          <NavItem icon={History} label="Activity" />
          <NavItem icon={Layers} label="Assets" />
          <NavItem icon={Cpu} label="Compute" />
        </nav>

        <div className="flex flex-col gap-6 mt-auto">
          <NavItem icon={Settings} label="Settings" />
          <div 
            onClick={onSignOut}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-all cursor-pointer"
          >
            <LogOut size={20} />
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-xs font-bold text-white shadow-inner">
            {userInitial}
          </div>
        </div>
      </aside>

      {/* ── MAIN STAGE ── */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* TOP BAR */}
        <header className="h-20 flex items-center justify-between px-10 border-b border-white/5">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500 font-medium">Workspace</span>
            <ChevronRight size={14} className="text-slate-700" />
            <span className="text-slate-200 font-bold">{userName}'s Dashboard</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-semibold text-slate-400 hover:bg-white/10 transition-colors cursor-pointer group">
              <Command size={14} className="group-hover:text-blue-400 transition-colors" />
              <span>⌘ + K</span>
            </div>
            <button 
              onClick={onOpenBillingPortal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs font-bold text-white hover:bg-white/10 transition-all active:scale-95"
            >
              <CreditCard size={14} />
              Upgrade
            </button>
            <button 
              onClick={() => onOpenStudio()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95"
            >
              <Plus size={14} />
              Create New
            </button>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto px-10 py-12 custom-scrollbar">
          
          {/* HERO / PROMPT AREA */}
          <section className="max-w-5xl mx-auto mb-20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 text-center lg:text-left"
            >
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                What's the next <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">masterpiece</span>, {userName}?
              </h2>
              <p className="text-slate-500 text-lg font-medium">Start from an idea or dive back into your recent builds.</p>
            </motion.div>

            {/* HOLOGRAPHIC PROMPT BOX */}
            <motion.form 
              onSubmit={handleGenerate}
              className="relative group"
            >
              <div className={`absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-[24px] blur-xl opacity-20 transition-all duration-500 ${isPromptFocused ? 'opacity-40 scale-105' : 'group-hover:opacity-30'}`} />
              <div className="relative bg-[#080a12] rounded-[22px] border border-white/10 shadow-2xl p-2 transition-all duration-300">
                <div className="flex flex-col">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onFocus={() => setIsPromptFocused(true)}
                    onBlur={() => setIsPromptFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerate(e);
                      }
                    }}
                    placeholder="Describe your vision (e.g. 'A futuristic SaaS dashboard with interactive 3D charts and real-time user flow tracking')..."
                    className="w-full min-h-[120px] bg-transparent text-white placeholder-slate-600 p-6 resize-none outline-none text-xl leading-relaxed font-medium"
                  />
                  
                  <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-[11px] font-black tracking-widest text-slate-500 uppercase">
                        <Sparkles size={14} className="text-blue-500" /> Huggy Engine v2.4
                      </div>
                      <div className="h-4 w-px bg-white/10" />
                      <div className="flex items-center gap-2 text-[11px] font-black tracking-widest text-slate-500 uppercase">
                        <Terminal size={14} className="text-emerald-500" /> Fullstack Sandbox
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!prompt.trim() || loading}
                      className="flex items-center gap-2 px-8 py-3 bg-white text-black hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-black transition-all active:scale-95 shadow-xl"
                    >
                      {loading ? 'Initializing...' : 'Construct App'}
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.form>
          </section>

          {/* PROJECT LIBRARY */}
          <section className="max-w-5xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <FolderOpen size={20} className="text-blue-500" />
                <h3 className="text-xl font-bold text-white tracking-tight">Recent Archives</h3>
              </div>
              <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Layers size={16} />
                </button>
              </div>
            </div>

            {projects.length > 0 ? (
              <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'grid-cols-1 gap-3'}`}>
                {projects.map((p) => (
                  <ProjectCard 
                    key={p.id} 
                    project={p} 
                    mode={viewMode}
                    onClick={() => onOpenStudio('', p.id)} 
                  />
                ))}
                
                {/* EMPTY STATE / NEW PROJECT CALLOUT */}
                {viewMode === 'grid' && (
                  <div 
                    onClick={() => onOpenStudio()}
                    className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/5 hover:border-blue-500/30 hover:bg-blue-500/[0.02] transition-all cursor-pointer group min-h-[220px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all">
                      <PlusCircle size={28} />
                    </div>
                    <p className="text-sm font-bold text-slate-500 group-hover:text-slate-300 transition-colors">Start Fresh Project</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center text-center rounded-3xl border border-white/5 bg-white/[0.01]">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                  <FolderOpen size={32} className="text-slate-700" />
                </div>
                <h4 className="text-xl font-bold text-slate-300 mb-2">No projects found in this galaxy</h4>
                <p className="text-slate-500 max-w-sm mb-8">Deploy your first idea using the command hub above or explore templates to get started.</p>
                <button 
                  onClick={() => onOpenStudio()}
                  className="px-8 py-3 rounded-xl bg-white text-black font-black text-sm hover:bg-slate-200 transition-colors"
                >
                  Begin Creation
                </button>
              </div>
            )}
          </section>

        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}} />
    </div>
  );
}

function NavItem({ icon: Icon, active = false, label }: { icon: any; active?: boolean; label: string }) {
  return (
    <div className="relative group">
      <div 
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          active 
            ? 'bg-blue-600/15 text-blue-400 shadow-[inset_0_0_12px_rgba(37,99,235,0.2)]' 
            : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
        }`}
      >
        <Icon size={20} />
      </div>
      <div className="absolute left-full ml-4 px-2 py-1 rounded bg-slate-800 text-white text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        {label}
      </div>
    </div>
  );
}

function ProjectCard({ project, onClick, mode }: { project: any; onClick: () => void; mode: ViewMode; key?: React.Key }) {
  if (mode === 'list') {
    return (
      <div 
        onClick={onClick}
        className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer group"
      >
        <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400">
          <Globe size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">{project.name || 'Untitled Project'}</h4>
          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <Clock size={10} /> Edited {new Date(project.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
          <span className="px-2 py-0.5 rounded bg-emerald-500/5 text-emerald-500/70 border border-emerald-500/10">Active</span>
          <ArrowUpRight size={16} className="text-slate-700 group-hover:text-blue-400 transition-colors" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="flex flex-col rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-blue-500/20 transition-all cursor-pointer group relative overflow-hidden"
    >
      {/* CARD HEADER / PREVIEW AREA */}
      <div className="aspect-[16/10] bg-[#0c101c] flex items-center justify-center relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-700 group-hover:scale-110 group-hover:text-blue-500 transition-all duration-500">
          <Globe size={24} />
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4 px-2 py-1 rounded-md bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-black text-emerald-400 tracking-widest uppercase">
          Deployed
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors truncate flex-1 pr-4">
            {project.name || 'Untitled Design'}
          </h4>
          <button className="text-slate-600 hover:text-white transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <Clock size={12} />
            {new Date(project.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 group-hover:text-blue-400 transition-colors">
            Live Preview <ArrowUpRight size={12} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
