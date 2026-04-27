import React, { useState } from 'react';
import { signIn, signUp, signOut } from '../lib/supabaseClient';
import { LogOut, LogIn, Mail, Lock, UserPlus, Sparkles, Zap, ArrowRight, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthFormProps {
  isSignUp?: boolean;
  onSuccess?: () => void;
}

export function AuthForm({ isSignUp = false, onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUpMode, setIsSignUpMode] = useState(isSignUp);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = isSignUpMode
        ? await signUp(email, password)
        : await signIn(email, password);

      if (authError) {
        setError(authError);
      } else {
        setEmail('');
        setPassword('');
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[420px] mx-auto overflow-hidden"
    >
      <div className="relative p-8 bg-white dark:bg-[#0F0F0F] rounded-[32px] shadow-2xl border border-slate-100 dark:border-white/5 backdrop-blur-xl">
        {/* Elite Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
            <Zap size={18} className="text-blue-600 dark:text-blue-400" fill="currentColor" />
            <span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">Huggy Security</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {isSignUpMode ? 'Rejoignez Huggy' : 'Bon retour parmi nous'}
          </h2>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-2 font-medium">
            {isSignUpMode 
              ? 'Commencez à bâtir vos idées avec l\'IA dès aujourd\'hui.' 
              : 'Connectez-vous pour accéder à vos projets.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              Adresse Email
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none disabled:opacity-50 transition-all font-medium text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="nom@exemple.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              Mot de Passe
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none disabled:opacity-50 transition-all font-medium text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="group w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-[20px] shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isSignUpMode ? <UserPlus size={16} /> : <LogIn size={16} />}
                {isSignUpMode ? 'Créer mon compte' : 'Accéder au Studio'}
              </>
            )}
            {!loading && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100 dark:border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-[#0F0F0F] px-4 text-slate-400 dark:text-slate-600 font-black tracking-widest">Ou continuer avec</span>
          </div>
        </div>

        <button className="w-full py-3.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-700 dark:text-white text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98]">
          <Github size={16} />
          GitHub
        </button>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsSignUpMode(!isSignUpMode);
              setError(null);
            }}
            className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {isSignUpMode ? (
              <>Vous avez déjà un compte ? <span className="text-blue-600 underline underline-offset-4">Se connecter</span></>
            ) : (
              <>Pas encore de compte ? <span className="text-blue-600 underline underline-offset-4">S'inscrire gratuitement</span></>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface AuthStatusProps {
  user?: { email: string } | null;
  onSignOut?: () => void;
}

export function AuthStatus({ user, onSignOut }: AuthStatusProps) {
  const handleSignOut = async () => {
    await signOut();
    onSignOut?.();
  };

  if (!user) {
    return <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Non connecté</div>;
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xs">
          {user.email[0].toUpperCase()}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Connecté</span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{user.email}</span>
        </div>
      </div>
      <button
        onClick={handleSignOut}
        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
        title="Déconnexion"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}

