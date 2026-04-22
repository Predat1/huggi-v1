import React, { useState } from 'react';
import { X, Zap, BarChart3, ShoppingBag, User, Layout, BookOpen, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const TEMPLATES = [
  {
    id: 'saas-dashboard',
    icon: BarChart3,
    color: 'from-blue-500 to-blue-600',
    name: 'Dashboard SaaS',
    desc: 'Analytics, KPIs, graphiques, navigation sidebar.',
    tags: ['Analytics', 'Graphiques', 'KPIs'],
    prompt: 'Crée un dashboard SaaS professionnel avec une sidebar de navigation, des cartes KPI (revenus, utilisateurs, conversions), un graphique de courbe pour les données mensuelles, un tableau de transactions récentes et un header avec avatar utilisateur. Design sombre premium avec accents bleus.',
  },
  {
    id: 'landing-page',
    icon: Layout,
    color: 'from-purple-500 to-purple-600',
    name: 'Landing Page SaaS',
    desc: 'Hero, features, pricing, FAQ, CTA.',
    tags: ['Marketing', 'Conversion', 'SEO'],
    prompt: 'Crée une landing page SaaS moderne avec : un hero avec titre accrocheur, sous-titre et CTA, une section features avec 3 colonnes et icônes, une section pricing avec 3 plans (Free/Pro/Agency), une section témoignages, une FAQ et un footer. Design épuré avec dégradés bleus et animations subtiles.',
  },
  {
    id: 'ecommerce',
    icon: ShoppingBag,
    color: 'from-emerald-500 to-emerald-600',
    name: 'E-commerce',
    desc: 'Catalogue produits, panier, checkout.',
    tags: ['Boutique', 'Panier', 'Produits'],
    prompt: 'Crée une boutique e-commerce avec : une grille de produits avec images, prix et bouton "Ajouter au panier", un header avec logo et icône panier avec badge compteur, des filtres par catégorie, une page produit avec galerie et description, et un mini-panier latéral. Style minimaliste et moderne.',
  },
  {
    id: 'portfolio',
    icon: User,
    color: 'from-orange-500 to-orange-600',
    name: 'Portfolio Créatif',
    desc: 'Présentation projets, skills, contact.',
    tags: ['Portfolio', 'Créatif', 'CV'],
    prompt: 'Crée un portfolio créatif pour un développeur/designer avec : une section hero avec nom, titre et photo (placeholder), une grille de projets avec hover effects, une section compétences avec barres de progression, une timeline d\'expérience professionnelle et un formulaire de contact. Design moderne avec typographie forte.',
  },
  {
    id: 'task-manager',
    icon: Zap,
    color: 'from-pink-500 to-pink-600',
    name: 'Gestionnaire de Tâches',
    desc: 'Kanban board, todo list, priorités.',
    tags: ['Productivité', 'Kanban', 'Tâches'],
    prompt: 'Crée un gestionnaire de tâches style Notion/Linear avec : un kanban board à 3 colonnes (À faire / En cours / Terminé), des cartes de tâches drag-friendly avec priorité colorée et tags, un header avec recherche et filtres, un compteur de tâches par colonne et un bouton d\'ajout de tâche avec modal. Design sombre épuré.',
  },
  {
    id: 'blog',
    icon: BookOpen,
    color: 'from-teal-500 to-teal-600',
    name: 'Blog / Magazine',
    desc: 'Articles, catégories, hero editorial.',
    tags: ['Blog', 'Contenu', 'Editorial'],
    prompt: 'Crée un blog/magazine moderne avec : un article hero en grand format avec image de couverture, une grille d\'articles récents avec vignettes et catégories colorées, une sidebar avec les articles populaires et un nuage de tags, une pagination et un header avec navigation et icône de recherche. Style éditorial premium.',
  },
];

type Props = {
  onClose: () => void;
  onSelectTemplate: (prompt: string) => void;
};

export default function TemplatesModal({ onClose, onSelectTemplate }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">Templates de démarrage</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Choisissez un template ou commencez depuis zéro</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            const isHovered = hovered === t.id;
            return (
              <motion.button
                key={t.id}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onMouseEnter={() => setHovered(t.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => { onSelectTemplate(t.prompt); onClose(); }}
                className="text-left p-5 rounded-2xl border border-slate-100 dark:border-white/8 bg-white dark:bg-white/3 hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-lg transition-all duration-200 flex flex-col group"
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon size={18} className="text-white" />
                </div>

                {/* Content */}
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1">{t.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1">{t.desc}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {t.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA arrow */}
                <div className={`flex items-center gap-1 mt-3 text-[11px] font-bold transition-colors ${isHovered ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                  Utiliser ce template
                  <ArrowRight size={11} className={`transition-transform ${isHovered ? 'translate-x-0.5' : ''}`} />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-7 py-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
          <p className="text-xs text-slate-400">Ou décrivez votre propre idée dans le chat</p>
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            Commencer depuis zéro →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
