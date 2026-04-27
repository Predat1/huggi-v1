import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Eye, EyeOff, ShieldCheck, Loader2, Zap, Key, Info } from 'lucide-react';

interface Secret {
  key: string;
  value: string;
}

interface SecretsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  userId: string | undefined;
}

export function SecretsModal({ isOpen, onClose, projectId, userId }: SecretsModalProps) {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/projects/${projectId}${userId ? `?userId=${userId}` : ''}`)
      .then((r) => r.json())
      .then((data) => {
        setSecrets(
          (data.secrets || []).map((s: { key: string; value: string }) => ({
            key: s.key,
            value: s.value,
          }))
        );
      })
      .catch(() => setError('Impossible de charger les secrets'))
      .finally(() => setLoading(false));
  }, [isOpen, projectId, userId]);

  const saveSecret = async (key: string, value: string) => {
    if (!projectId) return;
    setSaving(key);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, key, value }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Erreur');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(null);
    }
  };

  const deleteSecret = async (key: string) => {
    if (!projectId) return;
    setSaving(key);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, key, value: null }),
      });
      if (!res.ok) throw new Error('Erreur de suppression');
      setSecrets((prev) => prev.filter((s) => s.key !== key));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(null);
    }
  };

  const handleAdd = async () => {
    const key = newKey.trim().toUpperCase().replace(/\s+/g, '_');
    const value = newValue.trim();
    if (!key || !value) return;
    if (secrets.some((s) => s.key === key)) {
      setError(`La variable "${key}" existe déjà`);
      return;
    }
    await saveSecret(key, value);
    setSecrets((prev) => [...prev, { key, value }]);
    setNewKey('');
    setNewValue('');
  };

  const handleUpdate = async (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...secrets];
    const old = updated[index];
    updated[index] = { ...old, [field]: val };
    setSecrets(updated);
  };

  const handleBlurSave = async (index: number) => {
    const s = secrets[index];
    if (s.key && s.value) await saveSecret(s.key, s.value);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 backdrop-blur-[12px]"
          style={{ background: 'rgba(0, 0, 0, 0.4)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          {/* Neon Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-[#0B0B0B] rounded-[32px] shadow-[0_0_80px_rgba(0,0,0,0.4)] w-full max-w-xl border border-slate-200 dark:border-white/5 overflow-hidden relative"
          >
            {/* Header */}
            <div className="relative px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-600/25">
                    <ShieldCheck size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Variables d'Environnement</h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">Coffre-fort numérique sécurisé</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              {/* Security Banner */}
              <div className="p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-2xl flex gap-3">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed font-medium">
                  Ces variables sont injectées uniquement côté serveur. Elles ne sont <strong>jamais</strong> exposées au navigateur client pour garantir une sécurité maximale.
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="px-4 py-3 bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2"
                >
                  <Zap size={14} className="animate-pulse" />
                  {error}
                </motion.div>
              )}

              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                    <Loader2 size={24} className="animate-spin text-violet-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronisation...</span>
                  </div>
                ) : secrets.length === 0 ? (
                  <div className="text-center py-12 px-6 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[24px]">
                    <Key size={32} className="mx-auto mb-3 text-slate-200 dark:text-white/5" />
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-600">Aucune variable configurée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {secrets.map((s, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 group"
                      >
                        <div className="relative flex-1">
                          <input
                            value={s.key}
                            onChange={(e) => handleUpdate(i, 'key', e.target.value.toUpperCase())}
                            onBlur={() => handleBlurSave(i)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-mono font-black text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all"
                            placeholder="CLE_API"
                          />
                        </div>
                        <div className="relative flex-[1.5]">
                          <input
                            type={showValues[s.key] ? 'text' : 'password'}
                            value={s.value}
                            onChange={(e) => handleUpdate(i, 'value', e.target.value)}
                            onBlur={() => handleBlurSave(i)}
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-mono text-slate-700 dark:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all"
                            placeholder="valeur..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowValues((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                          >
                            {showValues[s.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <button
                          onClick={() => deleteSecret(s.key)}
                          disabled={saving === s.key}
                          className="w-10 h-10 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        >
                          {saving === s.key ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Section */}
              <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">Nouvelle Variable</h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-mono font-black text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-500 transition-all"
                      placeholder="EX: CLAUDE_API_KEY"
                    />
                  </div>
                  <div className="flex-[1.5] relative">
                    <input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                      type="password"
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-mono text-slate-700 dark:text-slate-400 focus:outline-none focus:border-violet-500 transition-all"
                      placeholder="sk-ant-..."
                    />
                  </div>
                  <button
                    onClick={handleAdd}
                    disabled={!newKey.trim() || !newValue.trim() || !!saving}
                    className="w-12 h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl transition-all disabled:opacity-40 active:scale-90 shadow-xl shadow-violet-600/25 flex items-center justify-center shrink-0"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Autosave actif</span>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg"
              >
                Terminer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(139, 92, 246, 0.3); }
      `}</style>
    </AnimatePresence>
  );
}

