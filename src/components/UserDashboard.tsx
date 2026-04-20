import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Home, 
  LayoutTemplate, 
  Folder, 
  BookOpen, 
  Star, 
  LogOut, 
  Github, 
  Figma, 
  MoreHorizontal,
  ChevronRight,
  Zap,
  Check
} from 'lucide-react';
import HuggyChatInput from './HuggyChatInput';

interface UserDashboardProps {
  user: any;
  credits: number | null;
  onOpenStudio: (prompt?: string) => void;
  onLogout: () => void;
}

const TEMPLATES = [
  { id: '1', title: 'SaaS Dashboard', desc: 'A modern admin dashboard with charts and tables.', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80' },
  { id: '2', title: 'Landing Page', desc: 'High-converting SaaS landing page with dark mode.', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80' },
  { id: '3', title: 'E-commerce', desc: 'Minimalist storefront with product grid and cart.', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&q=80' },
  { id: '4', title: 'Portfolio', desc: 'Sleek personal portfolio for designers and devs.', image: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=400&q=80' },
  { id: '5', title: 'CRM System', desc: 'Customer relationship management interface.', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=400&q=80' },
  { id: '6', title: 'Link in Bio', desc: 'Mobile-first link aggregation page for social media.', image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=400&q=80' },
];

export default function UserDashboard({ user, credits, onOpenStudio, onLogout }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'template' | 'projects'>('home');

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-slate-300 font-sans overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-[260px] flex flex-col shrink-0 border-r border-white/5 bg-[#0F0F0F]">
        {/* Logo */}
        <div className="h-20 flex items-center px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <Zap size={18} fill="currentColor" />
            </div>
            <span className="text-white text-lg font-bold tracking-tight">Huggy Studio</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1">
          <button 
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'home' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Home size={18} />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('template')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'template' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <LayoutTemplate size={18} />
            Templates
          </button>
          <button 
            onClick={() => setActiveTab('projects')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'projects' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Folder size={18} />
            All Projects
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <BookOpen size={18} />
            Learn
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <Star size={18} />
            Starred
          </button>
        </nav>

        {/* Credits */}
        <div className="px-5 mb-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-white">Crédits</span>
              <span className="text-[10px] text-slate-400">{credits ?? 0} restants</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-blue-500 rounded-full" 
                style={{ width: `${Math.min(((credits ?? 0) / 100) * 100, 100)}%` }} 
              />
            </div>
            <p className="text-[9px] text-slate-500">Les crédits sont réinitialisés quotidiennement.</p>
          </div>
        </div>

        {/* Profile */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm shrink-0 border border-white/10">
              {(user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.email?.split('@')[0] || 'Utilisateur'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A] to-[#0A1929]">
        {/* Top bar */}
        <header className="h-20 flex items-center justify-between px-8 shrink-0">
          <div>
            {activeTab === 'template' && <h1 className="text-2xl font-bold text-white">Templates</h1>}
            {activeTab === 'projects' && <h1 className="text-2xl font-bold text-white">Vos Projets</h1>}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-colors">
              <Github size={16} />
              GitHub
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-colors">
              <Figma size={16} />
              Figma
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
          {activeTab === 'home' && (
            <div className="h-full flex flex-col items-center justify-center -mt-20">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-10"
              >
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Bienvenue sur Huggy</h1>
                <p className="text-slate-400 text-lg max-w-lg mx-auto">
                  Construisez des applications, des dashboards et des automatisations plus rapidement grâce à l'IA.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="w-full max-w-2xl"
              >
                {/* Embedded Chat Input with inverted styling context */}
                <div className="bg-white p-2 rounded-[24px] shadow-2xl shadow-blue-900/20">
                  <HuggyChatInput 
                    onSend={(prompt) => onOpenStudio(prompt)}
                    placeholder="Décrivez l'application que vous souhaitez créer..."
                    modelLabel="Huggy 4.5"
                    className="text-slate-900"
                  />
                </div>
                
                <div className="flex items-center justify-center gap-6 mt-8">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Check size={16} className="text-blue-500" />
                    React & Tailwind
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Check size={16} className="text-blue-500" />
                    Code exportable
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Check size={16} className="text-blue-500" />
                    Preview instantanée
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {(activeTab === 'template' || activeTab === 'projects') && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {TEMPLATES.map((tpl, i) => (
                <div key={tpl.id} className="group cursor-pointer">
                  <div className="aspect-video bg-slate-800 rounded-2xl overflow-hidden mb-3 border border-white/5 relative">
                    <img 
                      src={tpl.image} 
                      alt={tpl.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <button 
                        onClick={() => onOpenStudio(`Crée-moi un clone de ce template : ${tpl.title}`)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors"
                      >
                        Utiliser ce template
                      </button>
                    </div>
                  </div>
                  <h3 className="text-white font-bold text-sm mb-1">{tpl.title}</h3>
                  <p className="text-slate-400 text-xs line-clamp-1">{tpl.desc}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
    </div>
  );
}
