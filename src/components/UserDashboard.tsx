import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  LayoutTemplate, 
  Folder, 
  Globe, 
  Keyboard,
  Plus,
  LogOut,
  Moon,
  Sun,
  Sparkles,
  Search,
  ChevronRight,
  Zap,
  Trash2,
  ExternalLink,
  Clock,
  LayoutGrid,
  Settings,
  Bell,
  User as UserIcon,
  Library,
  Loader2
} from 'lucide-react';
import HuggyChatInput from './HuggyChatInput';
import { useTheme } from '../contexts/ThemeContext';

interface UserDashboardProps {
  user: any;
  credits: number | null;
  onOpenStudio: (prompt?: string, projectId?: string) => void;
  onLogout: () => void;
}

interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  slug?: string;
}

const TEMPLATES = [
  { id: '1', title: 'Dashboard SaaS', desc: 'Interface d\'administration haute performance.', prompt: 'Crée un SaaS dashboard avec sidebar, graphiques de revenus, KPIs et table des utilisateurs récents', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80' },
  { id: '2', title: 'Landing Page', desc: 'Conversion optimisée pour startups.', prompt: 'Crée une landing page startup premium avec hero animé, section features, pricing et CTA', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80' },
  { id: '3', title: 'E-commerce', desc: 'Boutique minimaliste & checkout fluide.', prompt: 'Crée une boutique e-commerce minimaliste avec grille de produits, panier et checkout', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&q=80' },
  { id: '4', title: 'Portfolio', desc: 'Présentation élégante pour créatifs.', prompt: 'Crée un portfolio personnel élégant avec section hero, projets en grille et formulaire de contact', image: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=400&q=80' },
  { id: '5', title: 'Système CRM', desc: 'Gestion client et pipeline de ventes.', prompt: 'Crée un CRM avec liste de contacts, pipeline de ventes, timeline et notes', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=400&q=80' },
  { id: '6', title: 'Link in Bio', desc: 'Page de liens optimisée pour mobile.', prompt: 'Crée une page Link in Bio mobile-first avec avatar, liens stylés et stats', image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=400&q=80' },
];

const SHORTCUTS = [
  { keys: ['Ctrl', 'Enter'], action: 'Envoyer le message' },
  { keys: ['Ctrl', 'E'], action: 'Exporter en ZIP' },
  { keys: ['Ctrl', '⇧', 'P'], action: 'Publier le projet' },
  { keys: ['Esc'], action: 'Fermer les modales' },
];

export default function UserDashboard({ user, credits, onOpenStudio, onLogout }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'template' | 'projects' | 'gallery' | 'shortcuts'>('home');
  const [projects, setProjects] = useState<Project[]>([]);
  const [galleryProjects, setGalleryProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('huggy_onboarded');
  });
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!user?.id || activeTab !== 'projects') return;
    setLoadingProjects(true);
    fetch(`/api/projects?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        setProjects(Array.isArray(data.projects) ? data.projects : []);
      })
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [user?.id, activeTab]);

  useEffect(() => {
    if (activeTab !== 'gallery') return;
    setLoadingGallery(true);
    fetch(`/api/gallery`)
      .then(r => r.json())
      .then(data => {
        setGalleryProjects(Array.isArray(data.projects) ? data.projects : []);
      })
      .catch(() => setGalleryProjects([]))
      .finally(() => setLoadingGallery(false));
  }, [activeTab]);

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      }
    } catch (e) {
      console.error('Failed to delete project', e);
    }
  };

  const dismissOnboarding = () => {
    localStorage.setItem('huggy_onboarded', '1');
    setShowOnboarding(false);
  };

  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const timeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `il y a ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs}h`;
    return `il y a ${Math.floor(hrs / 24)}j`;
  };

  return (
    <div className="flex h-screen bg-white dark:bg-[#070708] text-slate-900 dark:text-slate-300 font-sans overflow-hidden transition-colors duration-500">
      
      {/* ── Onboarding Overlay ── */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-[12px] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
              className="bg-[#0D0D0E] border border-white/5 rounded-[40px] p-10 max-w-xl w-full shadow-2xl relative overflow-hidden"
            >
              {/* Decorative light */}
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-600/40 animate-pulse">
                  <Zap size={32} fill="currentColor" className="text-white" />
                </div>
                <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Bienvenue sur Huggy <span className="text-blue-500">Elite</span> ⚡</h2>
                <p className="text-slate-400 mb-8 leading-relaxed text-sm font-medium">
                  Votre nouveau studio de création IA. Transformez n'importe quelle idée en une application de classe mondiale en quelques secondes.
                </p>
                <div className="space-y-5 mb-10">
                  {[
                    { text: 'Décrivez votre vision dans le chat intelligent', icon: '✍️' },
                    { text: 'Visualisez le code s\'assembler en temps réel', icon: '✨' },
                    { text: 'Personnalisez chaque détail dans le Studio', icon: '🛠️' },
                    { text: 'Déployez sur votre propre domaine en un clic', icon: '🌍' },
                  ].map((step, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: 0.2 + (i * 0.1) }}
                      className="flex items-center gap-4 text-xs font-bold text-slate-300"
                    >
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-blue-400 text-xs shadow-inner shrink-0">{step.icon}</div>
                      {step.text}
                    </motion.div>
                  ))}
                </div>
                <button
                  onClick={dismissOnboarding}
                  className="w-full py-4 bg-white hover:bg-slate-100 text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-xl active:scale-[0.98]"
                >
                  Démarrer l'aventure →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside className="w-[280px] flex flex-col shrink-0 border-r border-slate-100 dark:border-white/[0.03] bg-slate-50/30 dark:bg-[#0B0B0C] transition-all duration-300 relative z-20">
        {/* Brand */}
        <div className="h-20 flex items-center px-8">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
              <Zap size={18} fill="currentColor" />
            </div>
            <span className="text-slate-900 dark:text-white text-lg font-black tracking-tighter uppercase group-hover:tracking-normal transition-all">Huggy</span>
          </div>
        </div>

        {/* Create Button */}
        <div className="px-6 py-4">
          <button
            onClick={() => onOpenStudio()}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            Nouveau Projet
          </button>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <p className="px-5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Navigation</p>
          {[
            { id: 'home', label: 'Dashboard', icon: LayoutGrid },
            { id: 'template', label: 'Bibliothèque', icon: Library },
            { id: 'projects', label: 'Mes Archives', icon: Folder },
            { id: 'gallery', label: 'Inspiration', icon: Globe },
            { id: 'shortcuts', label: 'Expert Tips', icon: Keyboard },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all relative group ${
                activeTab === id 
                  ? 'bg-blue-600/5 dark:bg-white/5 text-blue-600 dark:text-white' 
                  : 'text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.02]'
              }`}
            >
              {activeTab === id && (
                <motion.div layoutId="navIndicator" className="absolute left-0 w-1 h-5 bg-blue-600 rounded-full" />
              )}
              <Icon size={18} className={`transition-transform group-hover:scale-110 ${activeTab === id ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              {label}
            </button>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-slate-100 dark:bg-white/[0.03] rounded-3xl border border-slate-200 dark:border-white/5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Crédits IA</span>
              <span className="text-[10px] font-black text-blue-600 dark:text-white">{credits ?? 0}/100</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((credits ?? 0) / 100) * 100, 100)}%` }}
                className="h-full bg-blue-600 rounded-full"
              />
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all group"
          >
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-slate-900 dark:group-hover:text-white">Thème</span>
            {theme === 'dark' ? <Moon size={16} className="text-blue-400" /> : <Sun size={16} className="text-amber-500" />}
          </button>
        </div>

        {/* Profile */}
        <div className="p-6 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {(user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.email?.split('@')[0] || 'Utilisateur'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 truncate">{user?.email}</p>
            </div>
            <button onClick={onLogout} title="Déconnexion" className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-20 flex items-center justify-between px-10 border-b border-slate-100 dark:border-white/[0.03] bg-white/50 dark:bg-[#070708]/50 backdrop-blur-xl shrink-0 z-10">
          <div className="flex items-center gap-6 flex-1 max-w-xl">
            <div className="relative w-full group">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un projet, un template..."
                className="w-full pl-12 pr-4 py-2.5 bg-slate-100 dark:bg-white/[0.03] border border-transparent dark:border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:bg-white dark:focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all relative">
              <Bell size={18} />
              <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#070708]" />
            </button>
            <div className="w-[1px] h-6 bg-slate-200 dark:bg-white/10 mx-2" />
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{user?.email?.split('@')[0] || 'Utilisateur'}</p>
                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">Membre Elite</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xs shadow-xl shadow-blue-600/20">
                {(user?.email || 'U')[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {/* Home Tab */}
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-10 space-y-12"
              >
                {/* Elite Stats Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Projets Actifs', value: projects.length, icon: Folder, color: 'text-blue-500' },
                    { label: 'Crédits Elite', value: credits ?? 0, icon: Zap, color: 'text-amber-500' },
                    { label: 'Apps Déployées', value: projects.filter(p => p.slug).length, icon: Globe, color: 'text-emerald-500' },
                    { label: 'Niveau Compte', value: 'Elite', icon: Sparkles, color: 'text-indigo-500' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 bg-white/[0.03] border border-white/5 rounded-[32px] flex items-center gap-5 hover:bg-white/[0.05] transition-all group"
                    >
                      <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                        <stat.icon size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-xl font-black text-white tracking-tight">{stat.value}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Hero Greeting */}
                <section className="relative py-16 rounded-[48px] overflow-hidden bg-slate-900 dark:bg-[#0D0D0F] border border-white/5 flex flex-col items-center justify-center text-center px-6 shadow-2xl">
                  {/* Decorative background effects */}
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.15),transparent)] pointer-events-none" />
                  <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative z-10 w-full"
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                      <Sparkles size={12} />
                      HUGGY ENGINE v1.0
                    </div>
                    <h1 className="text-4xl md:text-7xl font-black text-white mb-8 tracking-tighter leading-[0.95] italic">
                      Quelle est votre <br /> prochaine <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">révolution ?</span>
                    </h1>
                    
                    <div className="w-full max-w-2xl mx-auto relative group">
                      <div className="absolute -inset-1 bg-blue-600/20 rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                      <div className="bg-black/40 backdrop-blur-3xl rounded-[32px] p-2 border border-white/10 shadow-2xl relative z-10">
                        <HuggyChatInput
                          onSend={(prompt) => onOpenStudio(prompt)}
                          placeholder="Décrivez votre application en quelques mots..."
                          modelLabel="HUGGY ELITE"
                        />
                      </div>
                    </div>
                  </motion.div>
                </section>

                {/* Recent Projects Section */}
                {projects.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-8 px-2">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-8 bg-blue-600 rounded-full" />
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Reprendre vos travaux</h2>
                      </div>
                      <button 
                        onClick={() => setActiveTab('projects')} 
                        className="group flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-blue-500 uppercase tracking-widest transition-all"
                      >
                        Voir tout l'historique
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {projects.slice(0, 3).map((proj) => (
                        <motion.div
                          key={proj.id}
                          whileHover={{ y: -8 }}
                          onClick={() => onOpenStudio(undefined, proj.id)}
                          className="group relative p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-blue-500/50 dark:hover:border-blue-500/30 rounded-[32px] transition-all cursor-pointer shadow-sm hover:shadow-2xl overflow-hidden"
                        >
                          {/* Card Glow */}
                          <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-600/5 rounded-full blur-[40px] group-hover:bg-blue-600/20 transition-all" />
                          
                          <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="w-12 h-12 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                              <Zap size={18} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-widest">Actif</div>
                          </div>
                          
                          <h3 className="text-slate-900 dark:text-white font-black text-base mb-1 truncate relative z-10">
                            {proj.name || 'Projet Alpha'}
                          </h3>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest relative z-10">
                            <Clock size={12} />
                            {timeAgo(proj.updated_at || proj.created_at)}
                          </div>
                          
                          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Ouvrir le Studio</span>
                            <ChevronRight size={16} className="text-blue-600 dark:text-blue-400" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Quick Templates Chips */}
                <section className="pb-10">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 text-center">Idées de démarrage rapide</h3>
                  <div className="flex flex-wrap gap-3 justify-center max-w-3xl mx-auto">
                    {TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => onOpenStudio(t.prompt)}
                        className="px-6 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:border-blue-500/30 transition-all shadow-sm uppercase tracking-widest"
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {/* Templates Tab */}
            {activeTab === 'template' && (
              <motion.div
                key="templates"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-10"
              >
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-8 bg-blue-600 rounded-full" />
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Bibliothèque de Templates</h1>
                  </div>
                  <span className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{TEMPLATES.length} Designs Certifiés</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {TEMPLATES.map((tpl, i) => (
                    <motion.div
                      key={tpl.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group cursor-pointer"
                      onClick={() => onOpenStudio(tpl.prompt)}
                    >
                      <div className="aspect-video bg-slate-200 dark:bg-[#0D0D0F] rounded-[32px] overflow-hidden mb-5 border border-slate-100 dark:border-white/5 relative shadow-xl">
                        <img
                          src={tpl.image}
                          alt={tpl.title}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                          <button className="flex items-center gap-3 px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-widest rounded-2xl shadow-2xl">
                            <Plus size={16} strokeWidth={3} /> Utiliser ce modèle
                          </button>
                        </div>
                      </div>
                      <div className="px-2">
                        <h3 className="text-slate-900 dark:text-white font-black text-lg mb-1 tracking-tight group-hover:text-blue-600 transition-colors">{tpl.title}</h3>
                        <p className="text-slate-500 dark:text-slate-500 text-xs font-medium line-clamp-1">{tpl.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-10"
              >
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-8 bg-blue-600 rounded-full" />
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Mes Archives</h1>
                  </div>
                  <button
                    onClick={() => onOpenStudio()}
                    className="flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95"
                  >
                    <Plus size={16} strokeWidth={3} /> Nouveau Projet
                  </button>
                </div>

                {loadingProjects ? (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                    <Loader2 size={32} className="animate-spin text-blue-600 mb-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Accès à la base de données...</span>
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="text-center py-32 bg-slate-50 dark:bg-white/[0.01] rounded-[48px] border border-dashed border-slate-200 dark:border-white/5">
                    <div className="w-20 h-20 bg-white dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Folder size={32} className="text-slate-300 dark:text-white/10" />
                    </div>
                    <p className="text-slate-900 dark:text-white font-black text-lg mb-2 uppercase tracking-tight">
                      {searchQuery ? 'Aucun résultat correspondant' : 'Zone de création vierge'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-500 text-xs font-medium max-w-xs mx-auto mb-8">
                      {searchQuery ? 'Ajustez vos filtres de recherche' : 'Votre génie n\'a pas encore frappé. Commencez par créer votre première application IA.'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => onOpenStudio()}
                        className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl"
                      >
                        Lancer le Studio →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredProjects.map((proj, i) => (
                      <motion.div
                        key={proj.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group relative p-6 bg-white dark:bg-[#0D0D0F] hover:bg-slate-50 dark:hover:bg-[#111114] border border-slate-200 dark:border-white/5 hover:border-blue-500/50 dark:hover:border-blue-500/30 rounded-[32px] transition-all cursor-pointer shadow-sm hover:shadow-2xl"
                        onClick={() => onOpenStudio(undefined, proj.id)}
                      >
                        <div className="flex items-start justify-between mb-8">
                          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-600/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Zap size={20} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex items-center gap-1">
                            {(proj.slug || proj.custom_domain) && (
                              <button
                                onClick={e => { e.stopPropagation(); window.open(proj.custom_domain ? `https://${proj.custom_domain}` : `/live/${proj.slug}`, '_blank'); }}
                                className="w-9 h-9 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
                                title="Voir en ligne"
                              >
                                <ExternalLink size={16} className="text-slate-400" />
                              </button>
                            )}
                            <button
                              onClick={e => handleDeleteProject(e, proj.id)}
                              className="w-9 h-9 flex items-center justify-center hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-slate-900 dark:text-white font-black text-base mb-2 truncate tracking-tight">
                          {proj.name || `Projet ${proj.id.slice(0, 8)}`}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          <Clock size={12} />
                          <span>Modifié {timeAgo(proj.updated_at || proj.created_at)}</span>
                        </div>

                        <div className="mt-8 flex items-center gap-2">
                           <div className="h-1 flex-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full w-full bg-blue-600/20" />
                           </div>
                           <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Prêt</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Gallery Tab */}
            {activeTab === 'gallery' && (
              <motion.div
                key="gallery"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-10"
              >
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-8 bg-blue-600 rounded-full" />
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Inspiration Communautaire</h1>
                  </div>
                  <span className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Showcase Huggy Elite</span>
                </div>

                {loadingGallery ? (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                    <Loader2 size={32} className="animate-spin text-blue-600 mb-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Exploration des mondes...</span>
                  </div>
                ) : galleryProjects.length === 0 ? (
                  <div className="text-center py-32">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Globe size={32} className="text-slate-300 dark:text-white/10" />
                    </div>
                    <p className="text-slate-900 dark:text-white font-black text-lg mb-2 uppercase tracking-tight">Silence dans la galerie</p>
                    <p className="text-slate-500 dark:text-slate-500 text-xs font-medium max-w-xs mx-auto">Soyez le premier à publier un chef-d'œuvre et inspirez le monde entier.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {galleryProjects.map((proj, i) => (
                      <motion.div
                        key={proj.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -5 }}
                        className="group bg-white dark:bg-[#0D0D0F] border border-slate-200 dark:border-white/5 rounded-[32px] overflow-hidden flex flex-col shadow-sm hover:shadow-2xl transition-all cursor-pointer"
                        onClick={() => window.open(proj.custom_domain ? `https://${proj.custom_domain}` : `/live/${proj.slug}`, '_blank')}
                      >
                        <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-[#111] flex items-center justify-center relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 group-hover:scale-110 transition-transform duration-700" />
                          <Globe size={48} className="text-slate-300 dark:text-white/5 group-hover:text-blue-500/20 transition-colors" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-sm">
                            <span className="px-5 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl">Visiter l'App</span>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-900 dark:text-white font-black text-sm truncate pr-2 tracking-tight group-hover:text-blue-600 transition-colors">
                              {proj.name || `Concept ${proj.id.slice(0, 4)}`}
                            </h3>
                            <ExternalLink size={14} className="text-slate-400" />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[8px] font-black text-slate-500">{(proj.author || 'A')[0].toUpperCase()}</div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-tighter truncate">
                              {proj.author ? proj.author.split('@')[0] : 'Innovateur'} • {timeAgo(proj.created_at)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Shortcuts Tab */}
            {activeTab === 'shortcuts' && (
              <motion.div
                key="shortcuts"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-10"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-2 h-8 bg-blue-600 rounded-full" />
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Expert Workflow</h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-12 ml-6">Maîtrisez les raccourcis clavier pour une productivité Elite</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                  {SHORTCUTS.map((s, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-6 bg-white dark:bg-[#0D0D0F] border border-slate-200 dark:border-white/5 rounded-[24px] shadow-sm hover:shadow-xl transition-all group"
                    >
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-black uppercase tracking-widest group-hover:text-blue-600 transition-colors">{s.action}</span>
                      <div className="flex items-center gap-2">
                        {s.keys.map((k, j) => (
                          <kbd key={j} className="min-w-[32px] h-8 px-2 flex items-center justify-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] text-slate-600 dark:text-slate-400 font-black shadow-inner">
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>


      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
      `}</style>
    </div>
  );
}
