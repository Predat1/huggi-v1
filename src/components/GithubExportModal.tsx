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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-lg font-black text-slate-800">Exporter le projet</h2>
            <p className="text-xs text-slate-500">Envoyez votre code vers GitHub de manière sécurisée.</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white relative"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">{error}</div>}
          {successLink && (
            <div className="p-4 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-xl border border-emerald-100 flex flex-col items-center gap-2 text-center">
              Dépôt créé avec succès !
              <a href={successLink} target="_blank" rel="noreferrer" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-emerald-700">Ouvrir le dépôt</a>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Nom du dépôt</label>
              <input type="text" value={repoName} onChange={e => setRepoName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none" placeholder="mon-super-projet" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center gap-1"><Key size={14} /> Personal Access Token (PAT) GitHub</label>
              <input type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none font-mono" placeholder="ghp_****************************" />
              <p className="mt-1.5 text-[11px] text-slate-500">Le token doit avoir les permissions 'repo'. Il n'est pas sauvegardé dans nos bases.</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="rounded text-slate-900 focus:ring-slate-900" />
              <span className="text-sm font-medium text-slate-700">Dépôt Privé</span>
            </label>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button onClick={handleExport} disabled={loading} className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Github size={16} />}
              Pousser vers mon GitHub
            </button>
            <div className="flex items-center gap-4 py-2">
              <div className="h-[1px] flex-1 bg-slate-100" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">OU</span>
              <div className="h-[1px] flex-1 bg-slate-100" />
            </div>
            <button onClick={onStandardZipExport} className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50">
              <Download size={16} />
              Télécharger l'archive ZIP
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
