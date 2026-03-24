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
} from 'lucide-react';

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

const pageCopy: Record<string, { title: string; subtitle: string; kpis: string[] }> = {
  '/dashboard': {
    title: 'Tableau de bord Huggy',
    subtitle: 'Pilote ton SaaS, tes projets et tes performances depuis une seule interface.',
    kpis: ['12 projets actifs', '3 deploys cette semaine', '99.9% disponibilité preview'],
  },
  '/dashboard/recent': {
    title: 'Activité récente',
    subtitle: 'Retrouve tes derniers projets consultés, modifiés et publiés.',
    kpis: ['9 vues aujourd’hui', '4 modifications critiques', '2 partages externes'],
  },
  '/dashboard/projects': {
    title: 'Mes projets',
    subtitle: 'Organise tes apps par dossier, statut et priorité business.',
    kpis: ['6 en production', '4 en brouillon', '2 en QA'],
  },
  '/dashboard/templates': {
    title: 'Bibliothèque de modèles',
    subtitle: 'Accélère la création avec des templates prêts pour SaaS, CRM et e-commerce.',
    kpis: ['28 templates', '7 favoris', '3 nouveaux ce mois-ci'],
  },
  '/dashboard/shared': {
    title: 'Espace partagé',
    subtitle: 'Collabore avec tes équipes, clients et partenaires sur les mêmes écrans.',
    kpis: ['11 collaborateurs', '5 commentaires ouverts', '2 validations en attente'],
  },
  '/dashboard/analytics': {
    title: 'Analytics produit',
    subtitle: 'Mesure acquisition, activation et conversion pour décider vite.',
    kpis: ['+18% conversion', '42% activation J1', 'NPS moyen: 53'],
  },
  '/dashboard/billing': {
    title: 'Facturation',
    subtitle: 'Gère abonnements, crédits IA et historique des paiements.',
    kpis: ['Plan Starter actif', '78 crédits restants', 'Prochaine facture: 02/04'],
  },
  '/dashboard/settings': {
    title: 'Paramètres',
    subtitle: 'Personnalise ton espace, ton branding et les intégrations techniques.',
    kpis: ['4 intégrations', '2 domaines connectés', 'Sécurité: renforcée'],
  },
  '/dashboard/support': {
    title: 'Support & documentation',
    subtitle: 'Besoin d’aide ? Centralise tickets, guides et bonnes pratiques.',
    kpis: ['Temps de réponse moyen: 12 min', '97% tickets résolus', 'Guide onboarding prêt'],
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
    <div className="min-h-screen bg-[#070a12] text-white">
      <div className="flex">
        <aside className="w-[250px] min-h-screen border-r border-white/10 bg-black/40 backdrop-blur-xl p-4">
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
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                    active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
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
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold"
            >
              <Rocket size={15} />
              Ouvrir Studio
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-white/20 text-sm"
            >
              <LogOut size={15} />
              Déconnexion
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <section className="px-8 pt-10 pb-14 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.65),_rgba(236,72,153,0.7)_40%,_rgba(10,12,20,0.9)_75%)]">
            <h1 className="text-4xl font-black tracking-tight">{current.title}</h1>
            <p className="mt-3 max-w-2xl text-white/80">{current.subtitle}</p>
            <div className="mt-8 rounded-3xl bg-black/40 border border-white/10 p-5 max-w-3xl">
              <p className="text-sm text-white/70">Commande rapide</p>
              <p className="mt-2 text-white/95 font-semibold">"Crée un dashboard CRM avec tunnel de vente et reporting hebdo."</p>
            </div>
          </section>

          <section className="px-8 -mt-8 pb-12">
            <div className="grid md:grid-cols-3 gap-4">
              {current.kpis.map((kpi) => (
                <div key={kpi} className="rounded-2xl border border-white/10 bg-[#121722] p-5">
                  <p className="text-xs uppercase tracking-widest text-white/50">Indicateur</p>
                  <p className="mt-2 text-lg font-black">{kpi}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-[#0f1420] p-6">
              <h2 className="text-xl font-black">Contenu de la page</h2>
              <p className="mt-2 text-white/75">
                Cette section est entièrement rédigée pour la page sélectionnée. Tu peux y afficher des tableaux, des pipelines commerciaux,
                des tâches produit, des templates, des factures, ou des guides opérationnels selon le menu.
              </p>
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-bold">Bloc éditorial</p>
                  <p className="mt-2 text-sm text-white/70">
                    Objectif business, recommandations actionnables, et prochaines priorités de sprint déjà formulées.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-bold">Bloc opérationnel</p>
                  <p className="mt-2 text-sm text-white/70">
                    Etat des redirections, liens internes, qualité des pages et checklist de publication centralisée.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
