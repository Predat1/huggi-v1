import React, { useState } from 'react';
import { X, Zap, BarChart3, ShoppingBag, User, Layout, BookOpen, ArrowRight, Sparkles, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TEMPLATES = [
  {
    id: 'saas-dashboard',
    icon: BarChart3,
    color: 'from-blue-500 to-blue-600',
    glow: 'group-hover:shadow-blue-500/20',
    name: 'Dashboard SaaS',
    desc: 'Analytics, KPIs, graphiques, navigation sidebar.',
    tags: ['Analytics', 'Graphiques', 'KPIs'],
    prompt: 'Crée un dashboard SaaS professionnel avec une sidebar de navigation, des cartes KPI (revenus, utilisateurs, conversions), un graphique de courbe pour les données mensuelles, un tableau de transactions récentes et un header avec avatar utilisateur. Design sombre premium avec accents bleus.',
    popular: true
  },
  {
    id: 'landing-page',
    icon: Layout,
    color: 'from-purple-500 to-purple-600',
    glow: 'group-hover:shadow-purple-500/20',
    name: 'Landing Page SaaS',
    desc: 'Hero, features, pricing, FAQ, CTA.',
    tags: ['Marketing', 'Conversion', 'SEO'],
    prompt: 'Crée une landing page SaaS moderne avec : un hero avec titre accrocheur, sous-titre et CTA, une section features avec 3 colonnes et icônes, une section pricing avec 3 plans (Free/Pro/Agency), une section témoignages, une FAQ et un footer. Design épuré avec dégradés bleus et animations subtiles.',
  },
  {
    id: 'ecommerce',
    icon: ShoppingBag,
    color: 'from-emerald-500 to-emerald-600',
    glow: 'group-hover:shadow-emerald-500/20',
    name: 'E-commerce',
    desc: 'Catalogue produits, panier, checkout.',
    tags: ['Boutique', 'Panier', 'Produits'],
    prompt: 'Crée une boutique e-commerce avec : une grille de produits avec images, prix et bouton "Ajouter au panier", un header avec logo et icône panier avec badge compteur, des filtres par catégorie, une page produit avec galerie et description, et un mini-panier latéral. Style minimaliste et moderne.',
  },
  {
    id: 'portfolio',
    icon: User,
    color: 'from-orange-500 to-orange-600',
    glow: 'group-hover:shadow-orange-500/20',
    name: 'Portfolio Créatif',
    desc: 'Présentation projets, skills, contact.',
    tags: ['Portfolio', 'Créatif', 'CV'],
    prompt: 'Crée un portfolio créatif pour un développeur/designer avec : une section hero avec nom, titre et photo (placeholder), une grille de projets avec hover effects, une section compétences avec barres de progression, une timeline d\'expérience professionnelle et un formulaire de contact. Design moderne avec typographie forte.',
  },
  {
    id: 'task-manager',
    icon: Zap,
    color: 'from-pink-500 to-pink-600',
    glow: 'group-hover:shadow-pink-500/20',
    name: 'Gestionnaire de Tâches',
    desc: 'Kanban board, todo list, priorités.',
    tags: ['Productivité', 'Kanban', 'Tâches'],
    prompt: 'Crée un gestionnaire de tâches style Notion/Linear avec : un kanban board à 3 colonnes (À faire / En cours / Terminé), des cartes de tâches drag-friendly avec priorité colorée et tags, un header avec recherche et filtres, un compteur de tâches par colonne et un bouton d\'ajout de tâche avec modal. Design sombre épuré.',
    popular: true
  },
  {
    id: 'blog',
    icon: BookOpen,
    color: 'from-teal-500 to-teal-600',
    glow: 'group-hover:shadow-teal-500/20',
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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 backdrop-blur-[12px]">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60"
        onClick={onClose}
      />

      {/* Neon Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white dark:bg-[#0B0B0B] rounded-[40px] w-full max-w-5xl shadow-[0_0_80px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col border border-slate-200 dark:border-white/5"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/25">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Galerie de Templates</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Choisissez une base solide pour votre prochain projet</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Grid */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="flex-1 overflow-y-auto p-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 custom-scrollbar"
        >
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            const isHovered = hovered === t.id;
            return (
              <motion.button
                key={t.id}
                variants={item}
                type="button"
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onMouseEnter={() => setHovered(t.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => { onSelectTemplate(t.prompt); onClose(); }}
                className={`group relative text-left p-6 rounded-[32px] border border-slate-100 dark:border-white/5 bg-white dark:bg-white/[0.02] transition-all duration-300 flex flex-col shadow-sm hover:shadow-2xl ${t.glow}`}
              >
                {/* Popular Badge */}
                {t.popular && (
                  <div className="absolute top-6 right-6 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center gap-1.5">
                    <Star size={10} className="text-blue-600 dark:text-blue-400" fill="currentColor" />
                    <span className="text-[8px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">Populaire</span>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={24} className="text-white" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {t.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-6">
                  {t.desc}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {t.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 uppercase tracking-widest border border-slate-100 dark:border-white/5">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Hover CTA */}
                <div className={`flex items-center gap-2 mt-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${isHovered ? 'text-blue-600 translate-x-1' : 'text-slate-400/50'}`}>
                  Utiliser ce template
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Footer */}
        <div className="shrink-0 px-10 py-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Templates certifiés par Huggy AI</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] hover:text-blue-600 transition-all group"
          >
            Continuer depuis zéro
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(37, 99, 235, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(37, 99, 235, 0.3); }
      `}</style>
    </div>
  );
}

