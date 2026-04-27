import React, { useState } from 'react';
import { Check, Zap, Star, Building2, Sparkles } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    icon: Sparkles,
    monthlyPrice: 0,
    desc: 'Explorez Huggy sans engagement.',
    color: 'slate',
    hi: false,
    feats: [
      '15 générations / mois',
      '3 projets actifs',
      'Déploiement avec badge Huggy',
      'Sous-domaine huggy.app',
      'Historique 7 jours',
    ],
    cta: 'Commencer gratuitement',
    ctaAction: 'free',
  },
  {
    id: 'starter',
    name: 'Starter',
    icon: Zap,
    monthlyPrice: 19,
    desc: 'Pour les créateurs qui veulent aller vite.',
    color: 'blue',
    hi: false,
    feats: [
      '150 générations / mois',
      '10 projets actifs',
      'Déploiements illimités',
      'Badge Huggy retiré',
      'Historique versions (20)',
      'Support email',
    ],
    cta: 'Commencer avec Starter',
    ctaAction: 'starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Star,
    monthlyPrice: 49,
    desc: 'Pour les startups et freelances sérieux.',
    color: 'blue',
    hi: true,
    badge: '✦ Meilleur rapport qualité/prix',
    feats: [
      '500 générations / mois',
      'Projets illimités',
      '1 domaine personnalisé',
      'Modèle IA prioritaire (Sonnet)',
      'Collaboration 3 membres',
      'Historique versions 90 jours',
      'Export code complet',
      'Support prioritaire',
    ],
    cta: 'Commencer avec Pro',
    ctaAction: 'pro',
  },
  {
    id: 'agency',
    name: 'Agency',
    icon: Building2,
    monthlyPrice: 149,
    desc: 'Pour les agences et équipes à grande échelle.',
    color: 'slate',
    hi: false,
    feats: [
      'Générations illimitées',
      'Projets illimités',
      'Domaines custom illimités',
      'White-label (retire branding)',
      'Accès API Huggy',
      '10 membres équipe',
      'SLA 99,9 %',
      'Support dédié 24h',
    ],
    cta: 'Contacter l\'équipe',
    ctaAction: 'agency',
  },
];

type PricingSectionProps = {
  onCheckout: (plan: string) => void;
  onOpenStudio?: () => void;
  userId?: string;
  isCheckingOut?: boolean;
  compact?: boolean;
};

export default function PricingSection({ onCheckout, onOpenStudio, userId, isCheckingOut, compact }: PricingSectionProps) {
  const [annual, setAnnual] = useState(false);

  const price = (monthly: number) => {
    if (monthly === 0) return '0';
    return annual ? Math.round(monthly * 0.8).toString() : monthly.toString();
  };

  return (
    <div className={compact ? '' : 'py-24'}>
      {/* Header */}
      {!compact && (
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black tracking-widest uppercase mb-6">
            <Sparkles size={12} />
            Tarification simple
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Payez pour la <span className="text-blue-600">valeur</span>,<br />pas pour l'usage
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Projets illimités sur Pro. Badge retiré dès Starter. Résiliez à tout moment.
          </p>
        </div>
      )}

      {/* Annual toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className={`text-sm font-bold ${!annual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Mensuel</span>
        <button
          type="button"
          onClick={() => setAnnual(a => !a)}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${annual ? 'bg-blue-600' : 'bg-slate-200 dark:bg-white/10'}`}
        >
          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${annual ? 'translate-x-6' : ''}`} />
        </button>
        <span className={`text-sm font-bold flex items-center gap-1.5 ${annual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
          Annuel
          <span className="px-1.5 py-0.5 text-[9px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full uppercase tracking-wider">−20%</span>
        </span>
      </div>

      {/* Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto px-4">
        {PLANS.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.id}
              className={`relative rounded-3xl p-7 border flex flex-col transition-all duration-300 ${
                p.hi
                  ? 'border-blue-500 bg-slate-900 dark:bg-[#0F172A] shadow-2xl shadow-blue-900/30 scale-[1.02]'
                  : 'border-slate-100 dark:border-white/8 bg-white dark:bg-[#111] hover:border-blue-200 dark:hover:border-blue-500/20 hover:shadow-xl'
              }`}
            >
              {p.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-[9px] uppercase tracking-[0.2em] font-black rounded-full shadow-lg whitespace-nowrap">
                  {p.badge}
                </div>
              )}

              {/* Icon + name */}
              <div className="flex items-center gap-2.5 mb-5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${p.hi ? 'bg-blue-600' : 'bg-slate-100 dark:bg-white/5'}`}>
                  <Icon size={16} className={p.hi ? 'text-white' : 'text-slate-600 dark:text-slate-400'} />
                </div>
                <span className={`text-xs font-black uppercase tracking-widest ${p.hi ? 'text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>{p.name}</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-1">
                <span className={`text-4xl font-black tracking-tighter ${p.hi ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {price(p.monthlyPrice)}€
                </span>
                {p.monthlyPrice > 0 && (
                  <span className={`text-xs font-bold ${p.hi ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400'}`}>
                    /{annual ? 'mois*' : 'mois'}
                  </span>
                )}
              </div>
              {annual && p.monthlyPrice > 0 && (
                <p className={`text-[10px] font-semibold mb-2 ${p.hi ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  *facturé {Math.round(p.monthlyPrice * 0.8 * 12)}€/an — 2 mois offerts
                </p>
              )}
              <p className={`text-xs leading-relaxed mb-6 ${p.hi ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{p.desc}</p>

              {/* Features */}
              <div className={`space-y-2.5 flex-1 pt-5 border-t ${p.hi ? 'border-white/10' : 'border-slate-100 dark:border-white/5'}`}>
                {p.feats.map(feat => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${p.hi ? 'bg-blue-500' : 'bg-emerald-50 dark:bg-emerald-500/20'}`}>
                      <Check size={9} strokeWidth={3} className={p.hi ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'} />
                    </div>
                    <span className={`text-[12px] font-medium leading-tight ${p.hi ? 'text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}>{feat}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                type="button"
                disabled={isCheckingOut}
                onClick={() => {
                  if (p.ctaAction === 'free') { onOpenStudio?.(); return; }
                  onCheckout(p.id);
                }}
                className={`mt-8 w-full py-3.5 rounded-2xl text-xs font-black transition-all active:scale-[0.98] disabled:opacity-60 ${
                  p.hi
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40 hover:bg-blue-500'
                    : p.id === 'free'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/30'
                }`}
              >
                {isCheckingOut ? 'Chargement...' : p.cta}
              </button>
            </div>
          );
        })}
      </div>

      {annual && (
        <p className="text-center text-xs text-slate-400 mt-6">*Prix affichés par mois, facturés annuellement. Résiliez à tout moment.</p>
      )}
    </div>
  );
}
