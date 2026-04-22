import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Eye, EyeOff, Shield, Loader2 } from 'lucide-react';

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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/25">
                  <Shield size={15} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Variables d'environnement</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Injectées côté serveur uniquement — jamais exposées au client</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {error && (
                <div className="px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-xs font-medium">Chargement...</span>
                </div>
              ) : secrets.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Shield size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">Aucune variable configurée</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {secrets.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 group">
                      <input
                        value={s.key}
                        onChange={(e) => handleUpdate(i, 'key', e.target.value.toUpperCase())}
                        onBlur={() => handleBlurSave(i)}
                        className="w-36 shrink-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                        placeholder="NOM_VAR"
                      />
                      <div className="flex-1 relative">
                        <input
                          type={showValues[s.key] ? 'text' : 'password'}
                          value={s.value}
                          onChange={(e) => handleUpdate(i, 'value', e.target.value)}
                          onBlur={() => handleBlurSave(i)}
                          className="w-full px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                          placeholder="valeur..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowValues((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          {showValues[s.key] ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      <button
                        onClick={() => deleteSecret(s.key)}
                        disabled={saving === s.key}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      >
                        {saving === s.key ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Ajouter une variable</p>
                <div className="flex items-center gap-2">
                  <input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    className="w-36 shrink-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                    placeholder="API_KEY"
                  />
                  <input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    type="password"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                    placeholder="valeur secrète..."
                  />
                  <button
                    onClick={handleAdd}
                    disabled={!newKey.trim() || !newValue.trim() || !!saving}
                    className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-all disabled:opacity-40 active:scale-95 shadow-lg shadow-violet-600/25"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-[10px] text-slate-400 font-medium">
                Sauvegarde automatique à chaque modification
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
