import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, FolderOpen, LogOut, Sparkles, TerminalSquare, Zap, Clock, Plus } from 'lucide-react';
import { getAuthUser } from '../lib/supabaseClient';

type UserDashboardProps = {
  onOpenStudio: (prompt?: string, projectId?: string) => void;
  onSignOut: () => void;
  onOpenBillingPortal?: () => void;
};

export default function UserDashboard({
  onOpenStudio,
  onSignOut,
  onOpenBillingPortal,
}: UserDashboardProps) {
  const [prompt, setPrompt] = useState('');
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAuthUser().then(u => {
      setUser(u);
      if (u) {
        // Fetch real projects from the API
        fetch(`/api/projects`) // We use the standard /api/projects endpoint if it exists
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

  return (
    <div className="min-h-screen bg-[#060913] text-white flex flex-col font-sans selection:bg-blue-500/30">
      {/* Top Navbar */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Huggy<span className="text-blue-500">.</span></span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onOpenBillingPortal} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
            Facturation
          </button>
          <div className="w-px h-4 bg-white/10" />
          <button onClick={onSignOut} className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
            <LogOut size={14} />
            Déconnexion
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-24 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-3xl z-10 flex flex-col items-center">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-[54px] leading-tight font-black text-center tracking-tight mb-10"
          >
            Que voulez-vous <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">construire</span> aujourd'hui ?
          </motion.h1>

          <motion.form 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleGenerate}
            className="w-full relative group/input p-[2px] rounded-[25px] overflow-hidden shadow-2xl shadow-blue-900/20"
          >
            <div className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#3b82f6_30%,#10b981_70%,transparent_100%)] opacity-80 group-focus-within/input:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-[#0c101c] rounded-[23px] overflow-hidden transition-all">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate(e);
                  }
                }}
                placeholder="Décrivez l'application de vos rêves (ex: Un dashboard CRM avec mode sombre...)"
                className="w-full min-h-[140px] bg-transparent text-white placeholder-slate-500 p-6 resize-none outline-none text-lg leading-relaxed font-medium"
                autoFocus
              />
              <div className="flex items-center justify-between px-4 py-3 bg-[#111727] border-t border-white/5">
                <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-blue-400" /> Huggy AI</span>
                  <span className="flex items-center gap-1.5"><TerminalSquare size={14} /> Fullstack App</span>
                </div>
                <button
                  type="submit"
                  disabled={!prompt.trim() || loading}
                  className="px-6 py-2.5 bg-white text-slate-900 hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-white rounded-xl text-sm font-black flex items-center gap-2 transition-all active:scale-95"
                >
                  {loading ? 'Génération...' : 'Créer l\'app'}
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </motion.form>

          {/* Quick Actions / Templates */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-3 mt-6"
          >
            {[
              "🚀 Landing Page SaaS",
              "📊 Dashboard Analytics",
              "🛒 Application E-commerce",
              "📝 Gestionnaire de tâches"
            ].map(suggestion => (
              <button 
                key={suggestion}
                type="button"
                onClick={() => setPrompt(suggestion)}
                className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </motion.div>

          {/* Recent Projects */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full mt-20 pb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold flex items-center gap-2 text-slate-200">
                <FolderOpen size={16} className="text-blue-400" />
                Vos projets
              </h2>
              <button 
                onClick={() => onOpenStudio()} 
                className="text-sm font-medium text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                Ouvrir un espace vierge <ArrowUpRight size={14} />
              </button>
            </div>
            
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Always show a "New Project" card */}
                <div onClick={() => onOpenStudio()} className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-5 cursor-pointer hover:bg-blue-600/20 transition-all flex flex-col items-center justify-center min-h-[120px] group">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                    <Plus size={20} />
                  </div>
                  <span className="font-bold text-sm text-blue-100">Nouveau Projet</span>
                </div>

                {projects.map(p => (
                  <div key={p.id} onClick={() => onOpenStudio('', p.id)} className="bg-[#0c101c] border border-white/10 rounded-2xl p-5 cursor-pointer hover:border-white/20 hover:bg-[#111727] transition-all group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-800 group-hover:bg-blue-500 transition-colors" />
                    <h3 className="font-bold text-white mb-2 group-hover:text-blue-400 transition-colors truncate">{p.name || 'Projet sans titre'}</h3>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1"><Clock size={12} /> {new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-white/10 border-dashed rounded-3xl bg-[#0c101c]/50">
                <FolderOpen size={32} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-300 font-medium text-sm">Aucun projet pour le moment.</p>
                <p className="text-slate-500 text-xs mt-1">Lancez-vous en décrivant votre idée ci-dessus !</p>
              </div>
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}
