import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Github, Download, Loader2, Key } from 'lucide-react';

export interface GithubExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  userId?: string;
  onStandardZipExport: () => void;
}

export function GithubExportModal({ isOpen, onClose, projectId, userId, onStandardZipExport }: GithubExportModalProps) {
  const [githubToken, setGithubToken] = useState('');
  const [repoName, setRepoName] = useState('huggy-app-export');
  const [isPrivate, setIsPrivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successLink, setSuccessLink] = useState('');

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!githubToken || !repoName) return setError('Remplissez les champs requis.');
    setLoading(true); setError(''); setSuccessLink('');
    try {
      const res = await fetch(`/api/projects/${projectId}/export/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, githubToken, repoName, isPrivate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue');
      setSuccessLink(data.url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg bg-white dark:bg-[#111] rounded-2xl shadow-xl flex flex-col overflow-hidden border border-transparent dark:border-white/10">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white">Exporter le projet</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Envoyez votre code vers GitHub de manière sécurisée.</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-white/10 relative transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-100 dark:border-red-500/20">{error}</div>}
          {successLink && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-xl border border-emerald-100 dark:border-emerald-500/20 flex flex-col items-center gap-2 text-center">
              Dépôt créé avec succès !
              <a href={successLink} target="_blank" rel="noreferrer" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-emerald-700 transition-colors">Ouvrir le dépôt</a>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Nom du dépôt</label>
              <input type="text" value={repoName} onChange={e => setRepoName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition-all" placeholder="mon-super-projet" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide flex items-center gap-1"><Key size={14} /> Personal Access Token (PAT) GitHub</label>
              <input type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none font-mono transition-all" placeholder="ghp_****************************" />
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-500">Le token doit avoir les permissions 'repo'. Il n'est pas sauvegardé dans nos bases.</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="rounded text-slate-900 dark:text-white focus:ring-slate-900 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dépôt Privé</span>
            </label>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button onClick={handleExport} disabled={loading} className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:opacity-90 disabled:opacity-50 transition-all shadow-lg">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Github size={16} />}
              Pousser vers mon GitHub
            </button>
            <div className="flex items-center gap-4 py-2">
              <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/5" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">OU</span>
              <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/5" />
            </div>
            <button onClick={onStandardZipExport} className="w-full py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
              <Download size={16} />
              Télécharger l'archive ZIP
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
