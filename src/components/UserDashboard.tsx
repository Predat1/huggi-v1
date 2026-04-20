import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  Search,
  BookOpen,
  Plug,
  FolderOpen,
  ChevronDown,
  Gift,
  Zap,
  Plus,
  Mic,
  ArrowUp,
  Clock,
  ArrowRight,
  LogOut,
  CreditCard,
  Sparkles,
  Settings,
  Users,
  Eye,
  LayoutGrid,
} from 'lucide-react';
import { getAuthUser } from '../lib/supabaseClient';

type UserDashboardProps = {
  onOpenStudio: (prompt?: string, projectId?: string) => void;
  onSignOut: () => void;
  onOpenBillingPortal?: () => void;
};

type ProjectTab = 'my-projects' | 'recent' | 'shared' | 'templates';

export default function UserDashboard({
  onOpenStudio,
  onSignOut,
  onOpenBillingPortal,
}: UserDashboardProps) {
  const [prompt, setPrompt] = useState('');
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProjectTab>('my-projects');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    getAuthUser().then(u => {
      setUser(u);
      if (u) {
        fetch(`/api/projects`)
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) {
              setProjects(data);
            }
          })
          .catch(err => console.error("Erreur chargement projets", err));
      }
    });
  }, []);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    onOpenStudio(prompt);
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  const TABS: { id: ProjectTab; label: string }[] = [
    { id: 'my-projects', label: 'Mes projets' },
    { id: 'recent', label: 'Récemment vus' },
    { id: 'shared', label: 'Partagés avec moi' },
    { id: 'templates', label: 'Templates' },
  ];

  const TEMPLATES = [
    { name: 'Dashboard SaaS', emoji: '📊', desc: 'KPIs, graphiques et gestion de données' },
    { name: 'Landing Page', emoji: '🚀', desc: 'Conversion-optimized marketing page' },
    { name: 'E-commerce', emoji: '🛒', desc: 'Catalogue produits avec panier' },
    { name: 'CRM Client', emoji: '👥', desc: 'Gestion de la relation client' },
    { name: 'Portfolio', emoji: '🎨', desc: 'Showcase professionnel créatif' },
    { name: 'Blog & CMS', emoji: '📝', desc: 'Gestion de contenu dynamique' },
  ];

  return (
    <div className="h-screen flex bg-[#0a0a0a] text-white font-sans overflow-hidden selection:bg-purple-500/30">

      {/* ═══════ SIDEBAR ═══════ */}
      <aside
        className={`shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0a0a0a] transition-all duration-300 ${
          sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06]">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Zap size={14} className="text-white" />
              </div>
              <span className="font-bold text-[15px] tracking-tight text-white">Huggy</span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
              <Zap size={14} className="text-white" />
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-7 h-7 rounded-md hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white transition-colors"
          >
            <LayoutGrid size={14} />
          </button>
        </div>

        {/* User Workspace Selector */}
        {!sidebarCollapsed && (
          <div className="px-3 pt-3 pb-1">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
                {userInitial}
              </div>
              <span className="text-[13px] font-semibold text-slate-200 truncate flex-1 text-left">
                {userName}'s Huggy
              </span>
              <ChevronDown size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
            </button>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 px-3 pt-2 space-y-0.5 overflow-y-auto">
          {[
            { icon: Home, label: 'Accueil', active: true },
            { icon: Search, label: 'Recherche', shortcut: '⌘K' },
            { icon: BookOpen, label: 'Ressources' },
            { icon: Plug, label: 'Connecteurs' },
          ].map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                item.active
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <item.icon size={16} className={item.active ? 'text-white' : 'text-slate-500'} />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-[10px] font-mono text-slate-600 bg-white/[0.06] px-1.5 py-0.5 rounded">
                      {item.shortcut}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}

          {/* Projects Section */}
          {!sidebarCollapsed && (
            <div className="pt-5">
              <div className="flex items-center justify-between px-2.5 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Projets</span>
              </div>
              <button
                onClick={() => {}}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                <FolderOpen size={16} className="text-slate-500" />
                <span className="flex-1 text-left">Tous les projets</span>
                <ChevronDown size={14} className="text-slate-600" />
              </button>
            </div>
          )}
        </nav>

        {/* Bottom Cards */}
        <div className="px-3 pb-3 space-y-2">
          {!sidebarCollapsed ? (
            <>
              {/* Share Card */}
              <div className="px-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-3 cursor-pointer hover:bg-white/[0.06] transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/25 transition-colors">
                  <Gift size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-200">Partager Huggy</p>
                  <p className="text-[11px] text-slate-500">100 crédits par parrainage</p>
                </div>
              </div>

              {/* Upgrade Card */}
              <button
                onClick={onOpenBillingPortal}
                className="w-full px-3 py-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/15 flex items-center gap-3 cursor-pointer hover:from-purple-500/15 hover:to-pink-500/15 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/30 transition-colors">
                  <Zap size={16} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[12px] font-semibold text-slate-200">Passer à Business</p>
                  <p className="text-[11px] text-slate-500">Débloquer plus de fonctionnalités</p>
                </div>
              </button>
            </>
          ) : (
            <>
              <button className="w-full flex justify-center py-2 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-purple-400 transition-colors">
                <Gift size={18} />
              </button>
              <button
                onClick={onOpenBillingPortal}
                className="w-full flex justify-center py-2 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-purple-400 transition-colors"
              >
                <Zap size={18} />
              </button>
            </>
          )}

          {/* User Avatar Row */}
          <div className={`flex items-center pt-2 border-t border-white/[0.06] ${sidebarCollapsed ? 'justify-center' : 'justify-between px-1'}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[12px] font-bold text-white cursor-pointer">
              {userInitial}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={onSignOut}
                className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
                title="Déconnexion"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* ── HERO SECTION with gradient ── */}
        <div className="relative flex-shrink-0">
          {/* Gradient Background */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background: 'linear-gradient(135deg, #1a0533 0%, #3b0764 20%, #7c3aed 35%, #a855f7 45%, #ec4899 55%, #f97316 70%, #3b82f6 85%, #06b6d4 100%)',
            }}
          />
          {/* Noise/mesh overlay for depth */}
          <div className="absolute inset-0 z-[1] opacity-40" style={{
            background: 'radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.5) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(236, 72, 153, 0.4) 0%, transparent 50%), radial-gradient(ellipse at 50% 90%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
          }} />
          {/* Blur softener at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0f0f0f] to-transparent z-[2]" />

          <div className="relative z-10 px-8 pt-10 pb-16 flex flex-col items-center text-center">
            {/* Promo Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[13px] font-medium text-white/90 cursor-pointer hover:bg-white/15 transition-colors">
                <span className="px-2 py-0.5 rounded-full bg-purple-500 text-[11px] font-bold text-white">Promo</span>
                Les crédits comptent double jusqu'au 30 Avril
                <ArrowRight size={14} className="text-white/60" />
              </div>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-3xl sm:text-4xl md:text-[46px] font-bold tracking-tight text-white leading-[1.15] mb-8"
            >
              Que voulez-vous créer,{' '}
              <span className="text-white/90">{userName}</span> ?
            </motion.h1>

            {/* AI Prompt Input */}
            <motion.form
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleGenerate}
              className="w-full max-w-[680px]"
            >
              <div className="relative rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/40 overflow-hidden hover:border-white/[0.12] transition-colors focus-within:border-white/[0.15]">
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate(e);
                    }
                  }}
                  placeholder="Demandez à Huggy d'analyser vos données et..."
                  className="w-full min-h-[56px] max-h-[160px] bg-transparent text-white placeholder-slate-500 px-5 pt-4 pb-1 resize-none outline-none text-[15px] leading-relaxed font-medium"
                  rows={1}
                  autoFocus
                />
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      Build
                      <ChevronDown size={13} />
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                    >
                      <Mic size={16} />
                    </button>
                    <button
                      type="submit"
                      disabled={!prompt.trim() || loading}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 flex items-center justify-center text-white transition-all border border-white/10"
                    >
                      <ArrowUp size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.form>
          </div>
        </div>

        {/* ── PROJECTS SECTION (dark bottom) ── */}
        <div className="flex-1 bg-[#0f0f0f] overflow-y-auto">
          <div className="max-w-[1100px] mx-auto px-8 py-6">

            {/* Tabs Row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onOpenStudio()}
                className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400 hover:text-white transition-colors group"
              >
                Voir tout
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'my-projects' && (
                <motion.div
                  key="my-projects"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* New Project Card */}
                    <div
                      onClick={() => onOpenStudio()}
                      className="group relative bg-white/[0.03] border border-dashed border-white/[0.08] rounded-2xl p-5 cursor-pointer hover:bg-white/[0.05] hover:border-white/[0.12] transition-all flex flex-col items-center justify-center min-h-[160px]"
                    >
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all">
                        <Plus size={22} />
                      </div>
                      <span className="text-[13px] font-semibold text-slate-400 group-hover:text-white transition-colors">
                        Nouveau projet
                      </span>
                    </div>

                    {/* Project Cards */}
                    {projects.map(p => (
                      <div
                        key={p.id}
                        onClick={() => onOpenStudio('', p.id)}
                        className="group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden cursor-pointer hover:bg-white/[0.05] hover:border-white/[0.10] transition-all"
                      >
                        {/* Project Preview Area */}
                        <div className="h-[100px] bg-gradient-to-br from-slate-800/50 to-slate-900/50 flex items-center justify-center border-b border-white/[0.04]">
                          <Eye size={20} className="text-slate-600 group-hover:text-slate-500 transition-colors" />
                        </div>
                        <div className="p-4">
                          <h3 className="text-[13px] font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                            {p.name || 'Projet sans titre'}
                          </h3>
                          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                            <Clock size={11} />
                            <span>{new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {projects.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                        <FolderOpen size={24} className="text-slate-600" />
                      </div>
                      <p className="text-[14px] font-medium text-slate-400">Aucun projet pour le moment</p>
                      <p className="text-[12px] text-slate-600 mt-1">Décrivez votre idée ci-dessus pour commencer</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'templates' && (
                <motion.div
                  key="templates"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {TEMPLATES.map(t => (
                      <div
                        key={t.name}
                        onClick={() => onOpenStudio(`Crée une application : ${t.name} — ${t.desc}`)}
                        className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 cursor-pointer hover:bg-white/[0.05] hover:border-white/[0.10] transition-all"
                      >
                        <span className="text-2xl mb-3 block">{t.emoji}</span>
                        <h3 className="text-[14px] font-semibold text-white group-hover:text-purple-300 transition-colors">
                          {t.name}
                        </h3>
                        <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed">{t.desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {(activeTab === 'recent' || activeTab === 'shared') && (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                      {activeTab === 'recent' ? (
                        <Clock size={24} className="text-slate-600" />
                      ) : (
                        <Users size={24} className="text-slate-600" />
                      )}
                    </div>
                    <p className="text-[14px] font-medium text-slate-400">
                      {activeTab === 'recent' ? 'Aucun projet récent' : 'Aucun projet partagé'}
                    </p>
                    <p className="text-[12px] text-slate-600 mt-1">
                      {activeTab === 'recent'
                        ? 'Vos projets consultés récemment apparaîtront ici'
                        : 'Les projets partagés avec vous apparaîtront ici'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </main>

      {/* Click-away for user menu */}
      {showUserMenu && (
        <div className="fixed inset-0 z-[100]" onClick={() => setShowUserMenu(false)} />
      )}
    </div>
  );
}
