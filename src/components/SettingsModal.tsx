import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Globe, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';

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
      setSuccess("Domaine sauvegardé. N'oubliez pas de pointer votre DNS vers l'IP du serveur.");
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg bg-white dark:bg-[#111] rounded-2xl shadow-xl flex flex-col overflow-hidden border border-transparent dark:border-white/10">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#111]">
          <h2 className="text-lg font-black text-slate-800 dark:text-white">Paramètres du Projet</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 relative transition-colors"><X size={20} /></button>
        </div>
        
        <div className="flex border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#111]">
          <button onClick={() => setActiveTab('domain')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'domain' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Domaine personnalisé</button>
          <button onClick={() => setActiveTab('secrets')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'secrets' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Variables d'environnement</button>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-white/5 flex-1">
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-100 dark:border-red-500/20">{error}</div>}
          {success && <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-lg border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-2"><CheckCircle2 size={16} />{success}</div>}
          
          {activeTab === 'domain' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide flex items-center gap-2"><Globe size={14}/> Connecter un domaine</label>
                <div className="flex gap-2">
                  <input type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="www.mon-app.com" className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  <button onClick={handleSaveDomain} disabled={loading} className="px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:opacity-90 disabled:opacity-50 transition-all shadow-lg">{loading ? <Loader2 size={16} className="animate-spin" /> : 'Sauver'}</button>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">Pointez l'enregistrement A de votre nom de domaine vers l'adresse IP de nos serveurs. Ne modifiez pas la configuration si le domaine est déjà géré par Railway.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2"><Lock size={14}/> Clés & Configuration de Sécurité</label>
              <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 p-1">
                {secrets.map(s => (
                  <div key={s.key} className="flex justify-between items-center p-2 text-sm">
                    <span className="font-mono bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-700 dark:text-slate-300 text-xs">{s.key}</span>
                    <button onClick={() => handleDeleteSecret(s.key)} className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
                {secrets.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-600 p-3 italic">Aucun secret.</p>}
              </div>
              <div className="flex gap-2 pt-2">
                <input type="text" value={newKey} onChange={e => setNewKey(e.target.value.toUpperCase())} placeholder="NOM_DE_LA_VARIABLE" className="w-1/3 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs font-mono focus:border-blue-500 outline-none transition-all" />
                <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Valeur secrète" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs font-mono focus:border-blue-500 outline-none transition-all" />
                <button onClick={handleAddSecret} disabled={loading || !newKey} className="p-2 bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/20 rounded-lg transition-colors"><Plus size={18} /></button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
