import React from 'react';
import {
  Home,
  Search,
  FolderOpen,
  LayoutTemplate,
  Share2,
  BarChart3,
  CreditCard,
  Settings,
  LifeBuoy,
  Rocket,
  LogOut,
  Sparkles,
  Bell,
  Gauge,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { motion } from 'motion/react';

type UserDashboardProps = {
  route: string;
  onNavigate: (path: string) => void;
  onOpenStudio: () => void;
  onSignOut: () => void;
};

const navItems = [
  { label: 'Accueil', path: '/dashboard', icon: Home },
  { label: 'Récents', path: '/dashboard/recent', icon: Search },
  { label: 'Mes projets', path: '/dashboard/projects', icon: FolderOpen },
  { label: 'Modèles', path: '/dashboard/templates', icon: LayoutTemplate },
  { label: 'Partagés', path: '/dashboard/shared', icon: Share2 },
  { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Facturation', path: '/dashboard/billing', icon: CreditCard },
  { label: 'Paramètres', path: '/dashboard/settings', icon: Settings },
  { label: 'Support', path: '/dashboard/support', icon: LifeBuoy },
];

const pageCopy: Record<
  string,
  { title: string; subtitle: string; kpis: string[]; focus: string; action: string }
> = {
  '/dashboard': {
    title: 'Tableau de bord Huggy',
    subtitle: 'Pilote ton SaaS, tes projets et tes performances depuis une seule interface.',
    kpis: ['12 projets actifs', '3 deploys cette semaine', '99.9% disponibilité preview'],
    focus: 'Priorité du jour: finaliser l’onboarding et activer les automatisations IA.',
    action: 'Analyser les pages à plus fort impact',
  },
  '/dashboard/recent': {
    title: 'Activité récente',
    subtitle: 'Retrouve tes derniers projets consultés, modifiés et publiés.',
    kpis: ['9 vues aujourd’hui', '4 modifications critiques', '2 partages externes'],
    focus: 'Objectif: relancer les projets laissés en brouillon depuis plus de 7 jours.',
    action: 'Ouvrir la timeline complète',
  },
  '/dashboard/projects': {
    title: 'Mes projets',
    subtitle: 'Organise tes apps par dossier, statut et priorité business.',
    kpis: ['6 en production', '4 en brouillon', '2 en QA'],
    focus: 'Objectif: monter le taux de projets publiés de 60% à 75% ce trimestre.',
    action: 'Créer un nouveau projet',
  },
  '/dashboard/templates': {
    title: 'Bibliothèque de modèles',
    subtitle: 'Accélère la création avec des templates prêts pour SaaS, CRM et e-commerce.',
    kpis: ['28 templates', '7 favoris', '3 nouveaux ce mois-ci'],
    focus: 'Objectif: standardiser ton design system sur 3 templates principaux.',
    action: 'Explorer les templates recommandés',
  },
  '/dashboard/shared': {
    title: 'Espace partagé',
    subtitle: 'Collabore avec tes équipes, clients et partenaires sur les mêmes écrans.',
    kpis: ['11 collaborateurs', '5 commentaires ouverts', '2 validations en attente'],
    focus: 'Objectif: réduire les allers-retours de validation à moins de 24h.',
    action: 'Voir les demandes en attente',
  },
  '/dashboard/analytics': {
    title: 'Analytics produit',
    subtitle: 'Mesure acquisition, activation et conversion pour décider vite.',
    kpis: ['+18% conversion', '42% activation J1', 'NPS moyen: 53'],
    focus: 'Objectif: améliorer le funnel entre landing et création de compte.',
    action: 'Comparer les 7 derniers jours',
  },
  '/dashboard/billing': {
    title: 'Facturation',
    subtitle: 'Gère abonnements, crédits IA et historique des paiements.',
    kpis: ['Plan Starter actif', '78 crédits restants', 'Prochaine facture: 02/04'],
    focus: 'Objectif: suivre la consommation IA avant passage au plan supérieur.',
    action: 'Consulter l’historique des paiements',
  },
  '/dashboard/settings': {
    title: 'Paramètres',
    subtitle: 'Personnalise ton espace, ton branding et les intégrations techniques.',
    kpis: ['4 intégrations', '2 domaines connectés', 'Sécurité: renforcée'],
    focus: 'Objectif: finaliser le branding pour homogénéiser toute l’expérience client.',
    action: 'Modifier les préférences du workspace',
  },
  '/dashboard/support': {
    title: 'Support & documentation',
    subtitle: 'Besoin d’aide ? Centralise tickets, guides et bonnes pratiques.',
    kpis: ['Temps de réponse moyen: 12 min', '97% tickets résolus', 'Guide onboarding prêt'],
    focus: 'Objectif: documenter les 5 workflows clés pour accélérer l’équipe.',
    action: 'Ouvrir le centre d’aide',
  },
};

export default function UserDashboard({
  route,
  onNavigate,
  onOpenStudio,
  onSignOut,
}: UserDashboardProps) {
  const current = pageCopy[route] || pageCopy['/dashboard'];

  return (
    <div className="min-h-screen bg-[#060913] text-white">
      <div className="flex">
        <aside className="w-[260px] min-h-screen border-r border-white/10 bg-black/35 backdrop-blur-xl p-4">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-xs font-black">H</div>
            <div>
              <p className="text-sm font-black">Huggy Workspace</p>
              <p className="text-[11px] text-white/60">Mode SaaS complet</p>
            </div>
          </div>

          <nav className="mt-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = route === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                    active ? 'bg-white/15 text-white border border-white/20' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 space-y-2">
            <button
              type="button"
              onClick={onOpenStudio}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold transition-transform hover:-translate-y-0.5"
            >
              <Rocket size={15} />
              Ouvrir Studio
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-white/20 text-sm hover:bg-white/10 transition-colors"
            >
              <LogOut size={15} />
              Déconnexion
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <section className="px-8 pt-8 pb-6 bg-[radial-gradient(circle_at_top,_rgba(76,84,255,0.7),_rgba(236,72,153,0.55)_38%,_rgba(8,10,22,0.95)_78%)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-white/90">
                <Sparkles size={14} />
                Huggy Workspace - product mode
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 grid place-items-center hover:bg-white/20 transition-colors">
                  <Bell size={15} />
                </button>
                <button type="button" className="px-3 h-9 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-slate-100">
                  Nouveau projet
                </button>
              </div>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-6 text-4xl font-black tracking-tight"
            >
              {current.title}
            </motion.h1>
            <p className="mt-2 max-w-2xl text-white/80">{current.subtitle}</p>
            <div className="mt-6 rounded-3xl bg-black/40 border border-white/10 p-5 max-w-4xl huggy-float-soft">
              <p className="text-sm text-white/70">Commande rapide</p>
              <p className="mt-2 text-white/95 font-semibold">"Crée un dashboard CRM avec tunnel de vente, scoring leads et reporting hebdo."</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
                <Gauge size={14} />
                Temps moyen de génération: 23s
              </div>
            </div>
          </section>

          <section className="px-8 -mt-4 pb-12">
            <div className="grid lg:grid-cols-3 gap-4">
              {current.kpis.map((kpi) => (
                <div key={kpi} className="rounded-2xl border border-white/10 bg-[#121722] p-5 transition-transform duration-300 hover:-translate-y-1">
                  <p className="text-xs uppercase tracking-widest text-white/50">Indicateur</p>
                  <p className="mt-2 text-lg font-black">{kpi}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 rounded-3xl border border-white/10 bg-[#0f1420] p-6">
                <h2 className="text-xl font-black">Vue stratégique</h2>
                <p className="mt-2 text-white/75">{current.focus}</p>
                <div className="mt-5 grid md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-bold">Synthèse produit</p>
                    <p className="mt-2 text-sm text-white/70">
                      État du funnel, performance des pages clés, vitesse d’itération et tracking des décisions.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-bold">Bloc opérationnel</p>
                    <p className="mt-2 text-sm text-white/70">
                      Redirections internes, état des routes, navigation utilisateur et cohérence des CTA du SaaS.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#10182a] p-5">
                <p className="text-xs uppercase tracking-widest text-white/50">Action prioritaire</p>
                <p className="mt-2 font-black text-lg">{current.action}</p>
                <button
                  type="button"
                  className="mt-6 w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold inline-flex items-center justify-center gap-2 transition-all"
                >
                  Exécuter
                  <ArrowUpRight size={14} />
                </button>
                <div className="mt-6 pt-4 border-t border-white/10 space-y-2 text-sm text-white/75">
                  <div className="flex items-center gap-2"><Layers size={14} /> Workflow IA actif</div>
                  <div className="flex items-center gap-2"><Gauge size={14} /> Score qualité: 92/100</div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
