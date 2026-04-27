import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Globe, Plus, Trash2, CheckCircle2, Loader2, Zap, Settings, ShieldCheck, ChevronRight } from 'lucide-react';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  userId?: string;
}

export function SettingsModal({ isOpen, onClose, projectId, userId }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'domain' | 'secrets'>('domain');
  const [domain, setDomain] = useState('');
  const [secrets, setSecrets] = useState<{key: string, value: string}[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && projectId) {
      fetch(`/api/projects/${projectId}?userId=${userId || ''}`)
        .then(res => res.json())
        .then(data => {
          if (data.project) {
            setDomain(data.project.custom_domain || '');
            if (data.secrets) setSecrets(data.secrets);
          }
        })
        .catch(() => setError("Impossible de charger les paramètres."));
    }
  }, [isOpen, projectId, userId]);

  const handleSaveDomain = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/projects/${projectId}/domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, domain })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setSuccess("Configuration du domaine mise à jour avec succès.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSecret = async () => {
    if (!newKey || !newValue) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, key: newKey, value: newValue })
      });
      if (!res.ok) throw new Error('Erreur');
      setSecrets([...secrets, { key: newKey, value: newValue }]);
      setNewKey(''); setNewValue('');
    } catch (e) {
      setError('Erreur lors de l\'ajout du secret.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSecret = async (key: string) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, key, value: null })
      });
      if (!res.ok) throw new Error('Erreur');
      setSecrets(secrets.filter(s => s.key !== key));
    } catch (e) {
      setError('Erreur lors de la suppression.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'domain', label: 'Domaine', icon: Globe },
    { id: 'secrets', label: 'Secrets', icon: ShieldCheck }
  ] as const;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 backdrop-blur-[12px]">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 dark:bg-black/60"
          onClick={onClose}
        />
        
        {/* Neon Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }} 
          className="relative w-full max-w-xl bg-white dark:bg-[#0B0B0B] rounded-[32px] shadow-[0_0_80px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden border border-slate-200 dark:border-white/5"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/25">
                <Settings size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Configuration Projet</h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">Personnalisez votre infrastructure</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90"
            >
              <X size={18} />
            </button>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex p-2 bg-slate-100 dark:bg-white/5 mx-8 mt-6 rounded-[20px] border border-slate-200 dark:border-white/10 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
                className={`relative flex-1 py-2.5 flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabSettings"
                    className="absolute inset-0 bg-white dark:bg-white/10 rounded-xl shadow-lg shadow-black/5 dark:shadow-none"
                  />
                )}
                <tab.icon size={14} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-8 flex-1 min-h-[380px]">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-2xl flex items-center gap-3"
                >
                  <Zap size={14} className="animate-pulse" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-2xl flex items-center gap-3"
                >
                  <CheckCircle2 size={14} />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'domain' ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 ml-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Domaine Personnalisé</label>
                    </div>
                    <div className="flex gap-3">
                      <div className="relative flex-1 group">
                        <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                          type="text" 
                          value={domain} 
                          onChange={e => setDomain(e.target.value)} 
                          placeholder="Ex: mon-app.studio" 
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" 
                        />
                      </div>
                      <button 
                        onClick={handleSaveDomain} 
                        disabled={loading} 
                        className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/25 disabled:opacity-50 active:scale-95 flex items-center justify-center min-w-[120px]"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sauvegarder'}
                      </button>
                    </div>
                    
                    <div className="mt-8 p-6 bg-slate-50 dark:bg-white/[0.03] rounded-[24px] border border-slate-100 dark:border-white/5 space-y-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-blue-500" />
                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Configuration DNS</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Pour lier votre domaine, pointez l'enregistrement <strong>A</strong> de votre bureau d'enregistrement DNS vers l'adresse IP suivante :
                      </p>
                      <div className="flex items-center justify-between bg-white dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                        <code className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">76.76.21.21</code>
                        <div className="px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Prêt</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between ml-1">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Variables Actives</label>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">{secrets.length} Configuré(s)</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-white/[0.03] rounded-[24px] border border-slate-100 dark:border-white/5 p-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                    {secrets.map(s => (
                      <div key={s.key} className="flex justify-between items-center p-3 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all group">
                        <div className="flex items-center gap-3">
                          <Lock size={12} className="text-slate-400" />
                          <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300">{s.key}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteSecret(s.key)} 
                          className="text-slate-300 dark:text-slate-600 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {secrets.length === 0 && (
                      <div className="py-12 text-center">
                        <Zap size={24} className="mx-auto mb-3 text-slate-200 dark:text-white/5" />
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Aucune variable configurée</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <input 
                      type="text" 
                      value={newKey} 
                      onChange={e => setNewKey(e.target.value.toUpperCase())} 
                      placeholder="CLE_API" 
                      className="w-[40%] px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs font-mono font-black focus:outline-none focus:border-blue-500 transition-all" 
                    />
                    <input 
                      type="password" 
                      value={newValue} 
                      onChange={e => setNewValue(e.target.value)} 
                      placeholder="Valeur..." 
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-blue-500 transition-all" 
                    />
                    <button 
                      onClick={handleAddSecret} 
                      disabled={loading || !newKey || !newValue} 
                      className="w-11 h-11 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-90 disabled:opacity-40"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cloud Config Ready</span>
            </div>
            <button 
              onClick={onClose} 
              className="px-8 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 dark:hover:opacity-90 transition-all active:scale-95 shadow-lg"
            >
              Fermer
            </button>
          </div>
        </motion.div>
        
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(37, 99, 235, 0.1); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(37, 99, 235, 0.3); }
        `}</style>
      </div>
    </AnimatePresence>
  );
}

