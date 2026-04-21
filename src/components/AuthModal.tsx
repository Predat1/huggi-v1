import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Zap,
  ArrowRight,
  Github,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { signIn, signUp } from '../lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
  onSuccess?: () => void;
}

const FEATURES = [
  'Générez des apps complètes en secondes',
  'Preview en temps réel avec live editor',
  'Export GitHub / ZIP en un clic',
  'Déploiement cloud instantané',
];

export default function AuthModal({ isOpen, onClose, defaultMode = 'login', onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setEmail('');
      setPassword('');
      setError(null);
      setSuccess(null);
      setLoading(false);
      setTimeout(() => emailRef.current?.focus(), 120);
    }
  }, [isOpen, defaultMode]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = mode === 'login'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);

      if (res?.error) {
        setError(res.error);
      } else {
        if (mode === 'signup') {
          setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
        } else {
          setSuccess('Connexion réussie !');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 900);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError(null);
    setSuccess(null);
    setEmail('');
    setPassword('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="auth-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[500] flex items-center justify-center p-4"
          style={{ background: 'rgba(2, 8, 23, 0.72)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            key="auth-panel"
            initial={{ opacity: 0, scale: 0.93, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 32 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="relative w-full max-w-[860px] rounded-[2rem] overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.6)] flex"
            style={{ minHeight: '560px' }}
          >
            {/* Left panel — decorative */}
            <div
              className="hidden md:flex md:w-[42%] flex-col justify-between p-10 relative overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 70%, #3b82f6 100%)',
              }}
            >
              {/* Animated orbs */}
              <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/5 blur-3xl animate-pulse" />
              <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-blue-300/10 blur-2xl" style={{ animationDelay: '1s' }} />

              <div className="relative z-10">
                {/* Logo */}
                <div className="flex items-center gap-2.5 mb-14">
                  <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center text-white border border-white/20 shadow-lg">
                    <Zap size={18} fill="currentColor" />
                  </div>
                  <span className="text-white font-black text-lg tracking-tight">Huggy</span>
                </div>

                <h2 className="text-white font-black text-3xl leading-tight tracking-tight">
                  {mode === 'login' ? 'Bon retour\nparmi nous !' : 'Rejoignez\nHuggy Studio'}
                </h2>
                <p className="mt-4 text-blue-100 text-sm font-medium leading-relaxed opacity-80">
                  {mode === 'login'
                    ? 'Vos projets vous attendent. Connectez-vous pour reprendre là où vous vous êtes arrêté.'
                    : 'Créez votre compte gratuit et commencez à construire des apps en quelques secondes.'}
                </p>
              </div>

              {/* Features list */}
              <div className="relative z-10 space-y-3">
                {FEATURES.map((f, i) => (
                  <motion.div
                    key={f}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.07 }}
                    className="flex items-center gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
                      <CheckCircle2 size={11} className="text-white" />
                    </div>
                    <span className="text-blue-50 text-xs font-semibold">{f}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 bg-white flex flex-col relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all z-10"
              >
                <X size={15} />
              </button>

              <div className="flex-1 flex flex-col justify-center px-8 sm:px-10 py-12">
                {/* Mobile logo */}
                <div className="md:hidden flex items-center gap-2 mb-8">
                  <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <Zap size={15} fill="currentColor" />
                  </div>
                  <span className="font-black text-slate-900">Huggy</span>
                </div>

                {/* Tab switcher */}
                <div className="flex bg-slate-100 rounded-xl p-1 mb-8 gap-1">
                  {(['login', 'signup'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => { setMode(tab); setError(null); setSuccess(null); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                        mode === tab
                          ? 'bg-white shadow-sm text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab === 'login' ? 'Se connecter' : 'S\'inscrire'}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.form
                    key={mode}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {mode === 'login' ? 'Connexion à votre compte' : 'Créer un compte gratuit'}
                    </h3>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          ref={emailRef}
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                          disabled={loading}
                          placeholder="vous@exemple.com"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mot de passe</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          placeholder="••••••••"
                          minLength={6}
                          className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {mode === 'signup' && (
                        <p className="text-[11px] text-slate-400 font-medium">Minimum 6 caractères</p>
                      )}
                    </div>

                    {/* Error / Success */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl"
                        >
                          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                          <p className="text-xs font-semibold text-red-700">{error}</p>
                        </motion.div>
                      )}
                      {success && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-xl"
                        >
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                          <p className="text-xs font-semibold text-emerald-700">{success}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading || !email || !password}
                      className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {loading ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <>
                          {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-slate-100" />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ou</span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    {/* GitHub OAuth (placeholder — wirable) */}
                    <button
                      type="button"
                      disabled
                      title="Bientôt disponible"
                      className="w-full py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 font-bold text-sm flex items-center justify-center gap-2.5 cursor-not-allowed opacity-60"
                    >
                      <Github size={16} />
                      Continuer avec GitHub
                      <span className="ml-auto text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Bientôt</span>
                    </button>
                  </motion.form>
                </AnimatePresence>

                {/* Switch mode (mobile friendly bottom text) */}
                <p className="mt-6 text-center text-xs text-slate-500 font-medium">
                  {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà inscrit ?'}{' '}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-blue-600 hover:text-blue-700 font-bold underline-offset-2 hover:underline transition-colors"
                  >
                    {mode === 'login' ? 'S\'inscrire gratuitement' : 'Se connecter'}
                  </button>
                </p>

                <p className="mt-3 text-center text-[10px] text-slate-300">
                  En continuant, vous acceptez nos{' '}
                  <a href="#" className="underline hover:text-slate-500 transition-colors">CGU</a>{' '}
                  et notre{' '}
                  <a href="#" className="underline hover:text-slate-500 transition-colors">Politique de confidentialité</a>.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
