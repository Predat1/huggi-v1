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
  Sparkles,
  ShieldCheck,
  Code2,
  Globe
} from 'lucide-react';
import { signIn, signUp } from '../lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
  onSuccess?: () => void;
}

const FEATURES = [
  { icon: Sparkles, text: 'Générez des apps complètes en secondes' },
  { icon: Code2, text: 'Preview en temps réel avec live editor' },
  { icon: Github, text: 'Export GitHub / ZIP en un clic' },
  { icon: Globe, text: 'Déploiement cloud instantané' },
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

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setEmail('');
      setPassword('');
      setError(null);
      setSuccess(null);
      setLoading(false);
      setTimeout(() => emailRef.current?.focus(), 150);
    }
  }, [isOpen, defaultMode]);

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
          setSuccess('Vérifiez votre email pour confirmer !');
        } else {
          setSuccess('Connexion réussie !');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 800);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="auth-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 md:p-10 backdrop-blur-[12px]"
          style={{ background: 'rgba(0, 0, 0, 0.4)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          {/* Neon Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
          
          <motion.div
            key="auth-panel"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[960px] bg-white dark:bg-[#0B0B0B] rounded-[40px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] flex flex-col md:flex-row border border-slate-200 dark:border-white/5"
            style={{ minHeight: '600px' }}
          >
            {/* Left Panel: The Vision */}
            <div className="relative hidden md:flex md:w-[45%] flex-col justify-between p-12 bg-slate-900 overflow-hidden border-r border-white/5">
              {/* Dynamic Gradient Backdrop */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-900 to-slate-950" />
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[80px]" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-16">
                  <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
                    <Zap size={20} className="text-white" fill="currentColor" />
                  </div>
                  <span className="text-white font-black text-xl tracking-tight uppercase">Huggy <span className="text-blue-400">Studio</span></span>
                </div>

                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-white font-black text-4xl leading-[1.1] tracking-tight"
                >
                  {mode === 'login' ? 'Bienvenue\ndans le futur.' : 'Libérez votre\npotentiel créatif.'}
                </motion.h2>
                <p className="mt-6 text-blue-100/70 text-sm font-medium leading-relaxed max-w-[280px]">
                  {mode === 'login'
                    ? 'Accédez à votre espace de travail et continuez de bâtir vos projets avec la puissance de l\'IA.'
                    : 'Rejoignez la nouvelle génération de constructeurs d\'applications et développez en un éclair.'}
                </p>
              </div>

              <div className="relative z-10 space-y-5">
                {FEATURES.map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-300">
                      <f.icon size={18} className="text-blue-400" />
                    </div>
                    <span className="text-slate-300 text-sm font-bold group-hover:text-white transition-colors">{f.text}</span>
                  </motion.div>
                ))}
              </div>

              <div className="relative z-10 pt-8 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800" />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">+ 5,000 Utilisateurs</span>
                </div>
              </div>
            </div>

            {/* Right Panel: The Form */}
            <div className="flex-1 flex flex-col relative bg-white dark:bg-[#0A0A0A]">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all z-20 active:scale-90"
              >
                <X size={18} />
              </button>

              <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 py-12 max-w-[540px] mx-auto w-full">
                {/* Branding Badge (Mobile only) */}
                <div className="md:hidden flex justify-center mb-10">
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                    <Zap size={18} className="text-blue-600 dark:text-blue-400" fill="currentColor" />
                    <span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest tracking-widest">Huggy Studio</span>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-slate-100 dark:bg-white/5 rounded-2xl p-1 mb-10 gap-1 border border-slate-200 dark:border-white/10">
                  {(['login', 'signup'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => { setMode(tab); setError(null); setSuccess(null); }}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        mode === tab
                          ? 'bg-white dark:bg-white/10 shadow-lg shadow-black/5 dark:shadow-none text-slate-900 dark:text-white'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {tab === 'login' ? 'Connexion' : 'Inscription'}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.form
                    key={mode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSubmit}
                    className="space-y-6"
                  >
                    <div className="text-center md:text-left mb-2">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {mode === 'login' ? 'Ravis de vous revoir' : 'Créez votre accès gratuit'}
                      </h3>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Email</label>
                        <div className="relative group">
                          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                          <input
                            ref={emailRef}
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="vous@exemple.com"
                            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-sm font-bold placeholder:text-slate-400 dark:placeholder:text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Mot de passe</label>
                          {mode === 'login' && (
                            <button type="button" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Oublié ?</button>
                          )}
                        </div>
                        <div className="relative group">
                          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="••••••••"
                            minLength={6}
                            className="w-full pl-12 pr-12 py-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-sm font-bold placeholder:text-slate-400 dark:placeholder:text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {(error || success) && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className={`flex items-start gap-3 p-4 rounded-2xl border ${
                            error 
                              ? 'bg-rose-50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20 text-rose-600'
                              : 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20 text-emerald-600'
                          }`}
                        >
                          {error ? <AlertCircle size={16} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={16} className="shrink-0 mt-0.5" />}
                          <p className="text-xs font-bold leading-relaxed">{error || success}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={loading}
                      className="group w-full py-4 rounded-[20px] bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/25 disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <div className="relative pt-4 pb-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-100 dark:border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase">
                        <span className="bg-white dark:bg-[#0A0A0A] px-4 text-slate-400 dark:text-slate-600 font-black tracking-[0.3em]">Ou</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full py-4 rounded-[20px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-[0.98]"
                    >
                      <Github size={18} />
                      GitHub
                    </button>
                  </motion.form>
                </AnimatePresence>

                <div className="mt-10 pt-6 border-t border-slate-100 dark:border-white/10 text-center space-y-4">
                   <p className="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed font-medium">
                    En continuant, vous acceptez nos{' '}
                    <a href="#" className="text-slate-900 dark:text-slate-300 underline font-bold">Conditions</a>{' '}
                    et notre{' '}
                    <a href="#" className="text-slate-900 dark:text-slate-300 underline font-bold">Confidentialité</a>.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

