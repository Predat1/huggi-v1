import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Rocket, Globe, ArrowRight, X, Sparkles, Code2, MousePointer } from 'lucide-react';

const STEPS = [
  {
    icon: Sparkles,
    color: 'from-blue-600 to-blue-700',
    title: 'Bienvenue sur Huggy Studio',
    subtitle: 'L\'IA qui code pour vous',
    desc: 'Décrivez votre idée en langage naturel. Huggy génère une interface complète en quelques secondes — sans écrire une ligne de code.',
    visual: (
      <div className="bg-slate-900 rounded-2xl p-4 text-left font-mono text-xs space-y-1.5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="text-slate-500 text-[10px] ml-1">Huggy Chat</span>
        </div>
        <div className="text-slate-400">Vous :</div>
        <div className="text-white bg-blue-600/20 border border-blue-500/30 rounded-xl px-3 py-2">"Crée un dashboard SaaS avec des statistiques et un graphique"</div>
        <div className="text-slate-400 mt-2">Huggy :</div>
        <div className="text-emerald-400 text-[10px]">✓ Plan généré · ✓ UI créée · ✓ Prêt à déployer</div>
      </div>
    ),
  },
  {
    icon: Code2,
    color: 'from-purple-600 to-purple-700',
    title: 'Itérez en temps réel',
    subtitle: 'Preview instantanée',
    desc: 'Chaque modification s\'affiche immédiatement dans le preview. Dites à Huggy ce que vous voulez changer — il comprend le contexte de vos échanges précédents.',
    visual: (
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 rounded-xl p-3 text-xs">
          <div className="text-slate-500 text-[9px] mb-2 uppercase tracking-wider">Code généré</div>
          <div className="space-y-1 font-mono text-[10px]">
            <div className="text-blue-400">{'<Dashboard'}</div>
            <div className="text-slate-300 pl-3">{'stats={data}'}</div>
            <div className="text-blue-400">{'  chart="line"'}</div>
            <div className="text-blue-400">{'>'}</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-xl p-3 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-8 bg-blue-500/20 rounded-lg mx-auto mb-1.5 flex items-center justify-center">
              <div className="w-8 h-1 bg-blue-400 rounded-full" />
            </div>
            <div className="text-[9px] text-blue-400 font-bold">Preview Live</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: MousePointer,
    color: 'from-emerald-600 to-emerald-700',
    title: 'Déployez en 1 clic',
    subtitle: 'URL publique instantanée',
    desc: 'Cliquez sur "Publier" — votre app est accessible en ligne immédiatement sur une URL publique. Pas de configuration, pas de serveur à gérer.',
    visual: (
      <div className="space-y-2.5">
        <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <Rocket size={14} className="text-white" />
          </div>
          <div>
            <div className="text-white text-xs font-bold">Publication réussie ✓</div>
            <div className="text-emerald-400 text-[10px] font-mono">huggy.app/live/mon-app</div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-2">
          <Globe size={12} className="text-blue-400 shrink-0" />
          <span className="text-blue-400 text-[10px] font-mono">https://huggy.app/live/abc123</span>
        </div>
      </div>
    ),
  },
  {
    icon: Rocket,
    color: 'from-orange-600 to-orange-700',
    title: 'Vous êtes prêt !',
    subtitle: '15 générations gratuites',
    desc: 'Votre compte est actif avec 15 générations gratuites. Commencez par décrire votre première app — ou choisissez un template pour démarrer plus vite.',
    visual: (
      <div className="space-y-2">
        {['Dashboard analytics', 'Landing page SaaS', 'App de gestion'].map((t, i) => (
          <div key={t} className="flex items-center gap-3 bg-slate-900 rounded-xl px-3 py-2.5">
            <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-400' : i === 1 ? 'bg-emerald-400' : 'bg-purple-400'}`} />
            <span className="text-slate-200 text-xs font-medium">{t}</span>
            <ArrowRight size={11} className="text-slate-500 ml-auto" />
          </div>
        ))}
      </div>
    ),
  },
];

type Props = { onClose: () => void; onOpenTemplates?: () => void };

export default function OnboardingModal({ onClose, onOpenTemplates }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        {/* Top gradient bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${current.color}`} />

        <div className="p-7">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-lg`}>
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{current.subtitle}</div>
                <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">{current.title}</h2>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1">
              <X size={16} />
            </button>
          </div>

          {/* Visual */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="mb-5"
            >
              {current.visual}
            </motion.div>
          </AnimatePresence>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-7">{current.desc}</p>

          {/* Progress dots */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-200 dark:bg-white/10'}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  Retour
                </button>
              )}
              <button
                onClick={() => {
                  if (isLast) {
                    onClose();
                    onOpenTemplates?.();
                  } else {
                    setStep(s => s + 1);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-colors shadow-lg shadow-blue-600/20"
              >
                {isLast ? 'Voir les templates' : 'Suivant'}
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
