import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home, Search, BookOpen, Plug, FolderOpen, ChevronDown, Gift, Zap,
  Plus, Mic, ArrowUp, Clock, ArrowRight, LogOut, Users, Eye, LayoutGrid, Sparkles,
} from 'lucide-react';
import { getAuthUser } from '../lib/supabaseClient';

type UserDashboardProps = {
  onOpenStudio: (prompt?: string, projectId?: string) => void;
  onSignOut: () => void;
  onOpenBillingPortal?: () => void;
};

type ProjectTab = 'my-projects' | 'recent' | 'shared' | 'templates';

export default function UserDashboard({ onOpenStudio, onSignOut, onOpenBillingPortal }: UserDashboardProps) {
  const [prompt, setPrompt] = useState('');
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProjectTab>('my-projects');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    getAuthUser().then(u => {
      setUser(u);
      if (u) {
        fetch('/api/projects').then(r => r.json()).then(data => {
          if (Array.isArray(data)) setProjects(data);
        }).catch(() => {});
      }
    });
  }, []);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    onOpenStudio(prompt);
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Builder';
  const userInitial = userName.charAt(0).toUpperCase();

  const TABS: { id: ProjectTab; label: string }[] = [
    { id: 'my-projects', label: 'Mes projets' },
    { id: 'recent', label: 'Récents' },
    { id: 'shared', label: 'Partagés' },
    { id: 'templates', label: 'Templates' },
  ];

  const TEMPLATES = [
    { name: 'Dashboard SaaS', emoji: '📊', desc: 'KPIs, graphiques et gestion' },
    { name: 'Landing Page', emoji: '🚀', desc: 'Page marketing premium' },
    { name: 'E-commerce', emoji: '🛒', desc: 'Catalogue avec panier' },
    { name: 'CRM Client', emoji: '👥', desc: 'Gestion relation client' },
    { name: 'Portfolio', emoji: '🎨', desc: 'Showcase créatif' },
    { name: 'Blog & CMS', emoji: '📝', desc: 'Contenu dynamique' },
  ];

  return (
    <div className="h-screen flex bg-[#060913] text-white font-sans overflow-hidden selection:bg-blue-500/30">

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`shrink-0 flex flex-col border-r border-white/[0.06] bg-[#060913] transition-all duration-300 ${sidebarCollapsed ? 'w-[68px]' : 'w-[256px]'}`}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06]">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/25">
                <Zap size={15} className="text-white" fill="currentColor" />
              </div>
              <span className="font-black text-[15px] tracking-tight">Huggy<span className="text-blue-500">.</span></span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-600/25">
              <Zap size={15} className="text-white" fill="currentColor" />
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="w-7 h-7 rounded-md hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white transition-colors">
            <LayoutGrid size={14} />
          </button>
        </div>

        {/* Workspace */}
        {!sidebarCollapsed && (
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-[11px] font-bold text-white">{userInitial}</div>
              <span className="text-[13px] font-semibold text-slate-200 truncate flex-1">{userName}'s Huggy</span>
              <ChevronDown size={14} className="text-slate-500" />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 pt-2 space-y-0.5 overflow-y-auto">
          {[
            { icon: Home, label: 'Accueil', active: true },
            { icon: Search, label: 'Recherche', shortcut: '⌘K' },
            { icon: BookOpen, label: 'Ressources' },
            { icon: Plug, label: 'Connecteurs' },
          ].map(item => (
            <button key={item.label} className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${item.active ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'} ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <item.icon size={16} className={item.active ? 'text-blue-400' : 'text-slate-500'} />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && <span className="text-[10px] font-mono text-slate-600 bg-white/[0.05] px-1.5 py-0.5 rounded">{item.shortcut}</span>}
                </>
              )}
            </button>
          ))}
          {!sidebarCollapsed && (
            <div className="pt-5">
              <span className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">Projets</span>
              <button className="w-full flex items-center gap-3 px-2.5 py-2 mt-1 rounded-lg text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors">
                <FolderOpen size={16} className="text-slate-500" />
                <span className="flex-1 text-left">Tous les projets</span>
                <ChevronDown size={14} className="text-slate-600" />
              </button>
            </div>
          )}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-3 space-y-2">
          {!sidebarCollapsed ? (
            <>
              <div className="px-3 py-3 rounded-xl bg-blue-600/5 border border-blue-500/10 flex items-center gap-3 cursor-pointer hover:bg-blue-600/10 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400"><Gift size={16} /></div>
                <div><p className="text-[12px] font-semibold text-slate-200">Partager Huggy</p><p className="text-[11px] text-slate-500">100 crédits / parrainage</p></div>
              </div>
              <button onClick={onOpenBillingPortal} className="w-full px-3 py-3 rounded-xl bg-blue-600/8 border border-blue-500/10 flex items-center gap-3 hover:bg-blue-600/15 transition-all">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400"><Zap size={16} /></div>
                <div className="text-left"><p className="text-[12px] font-semibold text-slate-200">Passer à Pro</p><p className="text-[11px] text-slate-500">Débloquer plus de features</p></div>
              </button>
            </>
          ) : (
            <>
              <button className="w-full flex justify-center py-2 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-blue-400 transition-colors"><Gift size={18} /></button>
              <button onClick={onOpenBillingPortal} className="w-full flex justify-center py-2 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-blue-400 transition-colors"><Zap size={18} /></button>
            </>
          )}
          <div className={`flex items-center pt-2 border-t border-white/[0.06] ${sidebarCollapsed ? 'justify-center' : 'justify-between px-1'}`}>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-[12px] font-bold text-white cursor-pointer">{userInitial}</div>
            {!sidebarCollapsed && (
              <button onClick={onSignOut} className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors" title="Déconnexion"><LogOut size={15} /></button>
            )}
          </div>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Hero */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(135deg, #020617 0%, #0c1a3d 20%, #1e3a6e 35%, #2563eb 50%, #1d9e75 65%, #0ea5e9 80%, #0c1a3d 100%)' }} />
          <div className="absolute inset-0 z-[1] opacity-50" style={{ background: 'radial-gradient(ellipse at 30% 30%, rgba(37,99,235,0.4) 0%, transparent 55%), radial-gradient(ellipse at 70% 50%, rgba(29,158,117,0.3) 0%, transparent 55%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#060913] to-transparent z-[2]" />

          <div className="relative z-10 px-8 pt-10 pb-16 flex flex-col items-center text-center">
            {/* Promo */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[13px] font-medium text-white/90 cursor-pointer hover:bg-white/15 transition-colors">
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-[11px] font-bold text-white">Promo</span>
                Crédits x2 jusqu'au 30 Avril
                <ArrowRight size={14} className="text-white/60" />
              </div>
            </motion.div>

            {/* Heading */}
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-3xl sm:text-4xl md:text-[46px] font-black tracking-tight text-white leading-[1.15] mb-8">
              Que voulez-vous <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">construire</span>,{' '}{userName} ?
            </motion.h1>

            {/* Input */}
            <motion.form initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onSubmit={handleGenerate} className="w-full max-w-[680px]">
              <div className="relative p-[2px] rounded-2xl overflow-hidden group/input">
                <div className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#3b82f6_30%,#10b981_70%,transparent_100%)] opacity-60 group-focus-within/input:opacity-100 transition-opacity duration-500" />
                <div className="relative rounded-[14px] bg-[#0c101c]/90 backdrop-blur-xl border border-white/[0.04] overflow-hidden">
                  <textarea
                    value={prompt} onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(e); } }}
                    placeholder="Demandez à Huggy de créer votre prochaine app..."
                    className="w-full min-h-[56px] max-h-[160px] bg-transparent text-white placeholder-slate-500 px-5 pt-4 pb-1 resize-none outline-none text-[15px] leading-relaxed font-medium"
                    rows={1} autoFocus
                  />
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <button type="button" className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white transition-colors"><Plus size={18} /></button>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-blue-400"><Sparkles size={13} /> Build</span>
                      <button type="button" className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white transition-colors"><Mic size={16} /></button>
                      <button type="submit" disabled={!prompt.trim() || loading} className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:bg-slate-700 flex items-center justify-center text-white transition-all shadow-lg shadow-blue-600/20"><ArrowUp size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.form>
          </div>
        </div>

        {/* Projects */}
        <div className="flex-1 bg-[#060913] overflow-y-auto">
          <div className="max-w-[1100px] mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${activeTab === tab.id ? 'bg-blue-600/10 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'}`}>{tab.label}</button>
                ))}
              </div>
              <button onClick={() => onOpenStudio()} className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400 hover:text-blue-400 transition-colors group">
                Voir tout <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'my-projects' && (
                <motion.div key="projects" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div onClick={() => onOpenStudio()} className="group bg-blue-600/5 border border-dashed border-blue-500/15 rounded-2xl p-5 cursor-pointer hover:bg-blue-600/10 hover:border-blue-500/25 transition-all flex flex-col items-center justify-center min-h-[160px]">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 mb-3 group-hover:bg-blue-500/25 group-hover:scale-110 transition-all"><Plus size={22} /></div>
                      <span className="text-[13px] font-semibold text-blue-300/70 group-hover:text-blue-300 transition-colors">Nouveau projet</span>
                    </div>
                    {projects.map(p => (
                      <div key={p.id} onClick={() => onOpenStudio('', p.id)} className="group bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden cursor-pointer hover:bg-white/[0.04] hover:border-blue-500/15 transition-all">
                        <div className="h-[100px] bg-gradient-to-br from-blue-900/20 to-slate-900/30 flex items-center justify-center border-b border-white/[0.04]">
                          <Eye size={20} className="text-slate-700 group-hover:text-blue-500/50 transition-colors" />
                        </div>
                        <div className="p-4">
                          <h3 className="text-[13px] font-bold text-white truncate group-hover:text-blue-400 transition-colors">{p.name || 'Projet sans titre'}</h3>
                          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500"><Clock size={11} /><span>{new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {projects.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-600/5 border border-blue-500/10 flex items-center justify-center"><FolderOpen size={24} className="text-blue-500/30" /></div>
                      <p className="text-[14px] font-medium text-slate-400">Aucun projet pour le moment</p>
                      <p className="text-[12px] text-slate-600 mt-1">Décrivez votre idée ci-dessus pour commencer</p>
                    </div>
                  )}
                </motion.div>
              )}
              {activeTab === 'templates' && (
                <motion.div key="templates" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {TEMPLATES.map(t => (
                      <div key={t.name} onClick={() => onOpenStudio(`Crée une application : ${t.name} — ${t.desc}`)} className="group bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 cursor-pointer hover:bg-blue-600/5 hover:border-blue-500/15 transition-all">
                        <span className="text-2xl mb-3 block">{t.emoji}</span>
                        <h3 className="text-[14px] font-bold text-white group-hover:text-blue-400 transition-colors">{t.name}</h3>
                        <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed">{t.desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              {(activeTab === 'recent' || activeTab === 'shared') && (
                <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-600/5 border border-blue-500/10 flex items-center justify-center">
                      {activeTab === 'recent' ? <Clock size={24} className="text-blue-500/30" /> : <Users size={24} className="text-blue-500/30" />}
                    </div>
                    <p className="text-[14px] font-medium text-slate-400">{activeTab === 'recent' ? 'Aucun projet récent' : 'Aucun projet partagé'}</p>
                    <p className="text-[12px] text-slate-600 mt-1">{activeTab === 'recent' ? 'Vos projets récents apparaîtront ici' : 'Les projets partagés apparaîtront ici'}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
