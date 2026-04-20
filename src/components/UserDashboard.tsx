import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  LayoutTemplate, 
  Folder, 
  BookOpen, 
  Star, 
  LogOut, 
  Github, 
  Figma, 
  Zap,
  Check,
  Plus,
  Clock,
  ExternalLink,
  Trash2,
  Globe,
  Download,
  Keyboard,
  ChevronRight,
  Search,
  Sparkles
} from 'lucide-react';
import HuggyChatInput from './HuggyChatInput';

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
  { id: '1', title: 'SaaS Dashboard', desc: 'Admin dashboard with charts and KPIs.', prompt: 'Crée un SaaS dashboard avec sidebar, graphiques de revenus, KPIs et table des utilisateurs récents', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80' },
  { id: '2', title: 'Landing Page', desc: 'High-converting startup landing page.', prompt: 'Crée une landing page startup premium avec hero animé, section features, pricing et CTA', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80' },
  { id: '3', title: 'E-commerce', desc: 'Minimalist storefront with cart.', prompt: 'Crée une boutique e-commerce minimaliste avec grille de produits, panier et checkout', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&q=80' },
  { id: '4', title: 'Portfolio', desc: 'Sleek personal portfolio.', prompt: 'Crée un portfolio personnel élégant avec section hero, projets en grille et formulaire de contact', image: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=400&q=80' },
  { id: '5', title: 'CRM System', desc: 'Customer management interface.', prompt: 'Crée un CRM avec liste de contacts, pipeline de ventes, timeline et notes', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=400&q=80' },
  { id: '6', title: 'Link in Bio', desc: 'Mobile-first social link page.', prompt: 'Crée une page Link in Bio mobile-first avec avatar, liens stylés et stats', image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=400&q=80' },
  { id: '7', title: 'Analytics Board', desc: 'Data visualization dashboard.', prompt: 'Crée un tableau de bord analytics avec graphiques en temps réel, heatmap et filtres par période', image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=400&q=80' },
  { id: '8', title: 'Kanban Board', desc: 'Project management with drag & drop.', prompt: 'Crée un tableau Kanban avec colonnes Todo/In Progress/Done, cartes de tâches et drag & drop', image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=400&q=80' },
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

  // Load user's projects
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

  // Load gallery projects
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
    <div className="flex h-screen bg-[#0A0A0A] text-slate-300 font-sans overflow-hidden">
      
      {/* ── Onboarding Overlay ── */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            >
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                <Zap size={28} fill="currentColor" className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Bienvenue sur Huggy Studio ⚡</h2>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Décrivez votre idée en français et Huggy génère une application complète en quelques secondes. Vous pouvez ensuite modifier, exporter ou publier directement.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  '🧠 Décrivez votre app en une phrase',
                  '⚡ Huggy génère le code React + Tailwind',
                  '🎨 Affinez avec des instructions supplémentaires',
                  '🚀 Publiez en un clic sous votre domaine',
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">{i + 1}</div>
                    {step}
                  </div>
                ))}
              </div>
              <button
                onClick={dismissOnboarding}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-colors"
              >
                Commencer à construire →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside className="w-[240px] flex flex-col shrink-0 border-r border-white/5 bg-[#0F0F0F]">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <Zap size={16} fill="currentColor" />
            </div>
            <span className="text-white text-base font-bold tracking-tight">Huggy Studio</span>
          </div>
        </div>

        {/* New Project Button */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => onOpenStudio()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(37,99,235,0.2)]"
          >
            <Plus size={16} />
            Nouveau projet
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {[
            { id: 'home', label: 'Dashboard', icon: Home },
            { id: 'template', label: 'Templates', icon: LayoutTemplate },
            { id: 'gallery', label: 'Galerie Publique', icon: Globe },
            { id: 'projects', label: 'Mes projets', icon: Folder },
            { id: 'shortcuts', label: 'Raccourcis', icon: Keyboard },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {/* Credits */}
        <div className="px-4 mb-3">
          <div className="bg-white/5 border border-white/8 rounded-2xl p-3.5">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-blue-400" />
                <span className="text-xs font-bold text-white">Crédits</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">{credits ?? 0} restants</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((credits ?? 0) / 100) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[9px] text-slate-500">Réinitialisés quotidiennement à minuit.</p>
          </div>
        </div>

        {/* Profile */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {(user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.email?.split('@')[0] || 'Utilisateur'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <button onClick={onLogout} title="Déconnexion" className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <main className="flex-1 flex flex-col relative overflow-hidden">

        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A] to-[#071020]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-10"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Que souhaitez-vous<br className="hidden md:block" /> construire ?
              </h1>
              <p className="text-slate-400 text-base max-w-md mx-auto">
                Décrivez votre idée. Huggy génère une application complète en quelques secondes.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-2xl"
            >
              <div className="bg-white rounded-[20px] shadow-2xl shadow-blue-900/20 overflow-hidden">
                <HuggyChatInput
                  onSend={(prompt) => onOpenStudio(prompt)}
                  placeholder="Ex: Un dashboard SaaS avec graphiques de revenus..."
                  modelLabel="Huggy AI"
                />
              </div>
              <div className="flex items-center justify-center gap-8 mt-6">
                {[['React & Tailwind', '⚛️'], ['Code exportable', '📦'], ['Preview instantanée', '⚡']].map(([label, icon]) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{icon}</span>{label}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick template chips */}
            <div className="flex flex-wrap gap-2 mt-8 justify-center max-w-2xl">
              {TEMPLATES.slice(0, 4).map(t => (
                <button
                  key={t.id}
                  onClick={() => onOpenStudio(t.prompt)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-slate-400 hover:text-white transition-all"
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'template' && (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">Templates</h1>
              <span className="text-xs text-slate-500">{TEMPLATES.length} templates disponibles</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {TEMPLATES.map((tpl, i) => (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group cursor-pointer"
                  onClick={() => onOpenStudio(tpl.prompt)}
                >
                  <div className="aspect-video bg-slate-800 rounded-2xl overflow-hidden mb-3 border border-white/5 relative">
                    <img
                      src={tpl.image}
                      alt={tpl.title}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <div className="flex items-center gap-2 text-white text-sm font-bold">
                        <Plus size={16} /> Utiliser ce template
                      </div>
                    </div>
                  </div>
                  <h3 className="text-white font-bold text-sm mb-1">{tpl.title}</h3>
                  <p className="text-slate-500 text-xs line-clamp-1">{tpl.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">Mes Projets</h1>
              <button
                onClick={() => onOpenStudio()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors"
              >
                <Plus size={16} /> Nouveau
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un projet..."
                className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>

            {loadingProjects ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mr-3" />
                Chargement…
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Folder size={28} className="text-slate-600" />
                </div>
                <p className="text-slate-500 font-medium mb-2">
                  {searchQuery ? 'Aucun projet trouvé' : 'Pas encore de projets'}
                </p>
                <p className="text-slate-600 text-sm mb-6">
                  {searchQuery ? 'Essayez un autre terme' : 'Créez votre premier projet depuis le Dashboard.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => onOpenStudio()}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    Créer un projet →
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((proj, i) => (
                  <motion.div
                    key={proj.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-2xl transition-all cursor-pointer"
                    onClick={() => onOpenStudio(undefined, proj.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/20 rounded-xl flex items-center justify-center">
                        <Zap size={16} className="text-blue-400" />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(proj.slug || proj.custom_domain) && (
                          <button
                            onClick={e => { e.stopPropagation(); window.open(proj.custom_domain ? `https://${proj.custom_domain}` : `/live/${proj.slug}`, '_blank'); }}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            title="Voir en ligne"
                          >
                            <ExternalLink size={13} className="text-slate-400" />
                          </button>
                        )}
                        <button
                          onClick={e => handleDeleteProject(e, proj.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors group/del"
                          title="Supprimer"
                        >
                          <Trash2 size={13} className="text-slate-400 group-hover/del:text-red-400" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-white font-bold text-sm mb-1 truncate">
                      {proj.name || `Projet ${proj.id.slice(0, 8)}`}
                    </h3>
                    <div className="flex items-center gap-1 text-[10px] text-slate-600">
                      <Clock size={10} />
                      <span>Modifié {timeAgo(proj.updated_at || proj.created_at)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">Galerie Publique</h1>
              <span className="text-xs text-slate-500">Projets publiés par la communauté</span>
            </div>

            {loadingGallery ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mr-3" />
                Chargement de la galerie…
              </div>
            ) : galleryProjects.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Globe size={28} className="text-slate-600" />
                </div>
                <p className="text-slate-500 font-medium mb-2">Aucun projet public</p>
                <p className="text-slate-600 text-sm mb-6">Publiez votre projet pour qu'il apparaisse ici !</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {galleryProjects.map((proj, i) => (
                  <motion.div
                    key={proj.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-2xl transition-all cursor-pointer flex flex-col"
                    onClick={() => window.open(proj.custom_domain ? `https://${proj.custom_domain}` : `/live/${proj.slug}`, '_blank')}
                  >
                    <div className="aspect-[4/3] w-full bg-[#111] rounded-xl mb-4 flex items-center justify-center overflow-hidden relative border border-white/5">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
                      <Globe size={32} className="text-slate-700 relative z-10" />
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white font-bold text-sm truncate pr-2">
                        {proj.name || `Projet ${proj.id.slice(0, 8)}`}
                      </h3>
                      <ExternalLink size={13} className="text-slate-500 shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      Par {proj.author ? proj.author.split('@')[0] : 'Anonyme'} • {timeAgo(proj.created_at)}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shortcuts Tab */}
        {activeTab === 'shortcuts' && (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <h1 className="text-2xl font-bold text-white mb-2">Raccourcis clavier</h1>
            <p className="text-slate-500 text-sm mb-8">Accélérez votre workflow dans Huggy Studio.</p>
            <div className="max-w-lg space-y-3">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                  <span className="text-sm text-slate-300 font-medium">{s.action}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, j) => (
                      <kbd key={j} className="px-2 py-1 bg-white/10 border border-white/10 rounded-lg text-xs text-slate-300 font-mono">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
