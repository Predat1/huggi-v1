import React, { useState, useCallback, useEffect } from 'react';
import {
  Zap,
  Sparkles,
  ArrowUp,
  Star,
  ExternalLink,
  ChevronDown,
  FileCode,
  BarChart3,
  ClipboardList,
  HardDrive,
  Menu,
  X,
  Linkedin,
  Twitter,
  Github,
  Monitor,
  Database,
  Shield,
  Check,
  Moon,
  Sun,
} from 'lucide-react';
import { motion } from 'motion/react';
import HuggyChatInput from './HuggyChatInput';
import PricingSection from './PricingSection';
import { useTheme } from '../contexts/ThemeContext';

export type AccentStyle = {
  bg: string;
  text: string;
  border: string;
  light: string;
  ring: string;
};

type LandingPageProps = {
  accent: AccentStyle;
  onOpenStudio: (initialPrompt?: string) => void;
  onLogin?: () => void;
  userId?: string;
};

const TESTIMONIALS = [
  {
    quote:
      'Huggy nous a permis de lancer notre MVP en un seul week-end. Ce qui prenait des semaines se fait maintenant en quelques heures.',
    name: 'Sarah Chen',
    role: 'Fondatrice, NovaTech',
    initials: 'SC',
  },
  {
    quote:
      'Nous avons remplacé tout notre flux de prototypage par Huggy. Notre agence livre les projets clients 5 fois plus vite.',
    name: 'Anya Petrov',
    role: 'CTO, Digital Forge',
    initials: 'AP',
  },
  {
    quote:
      "L'IA comprend ce que je veux avant même que je finisse de taper. C'est comme programmer avec un génie qui ne dort jamais.",
    name: 'David Okonkwo',
    role: 'Développeur Senior',
    initials: 'DO',
  },
  {
    quote:
      'En tant que PM, je peux maintenant prototyper des idées et obtenir la validation des parties prenantes instantanément. Révolutionnaire.',
    name: 'Marcus Rivera',
    role: 'Product Lead, Acme Corp',
    initials: 'MR',
  },
  {
    quote:
      "J'ai utilisé Huggy pour mon projet de fin d'études et mon professeur n'en revenait pas. Une application full-stack en 2 jours.",
    name: 'Jordan Lee',
    role: 'Étudiant CS, MIT',
    initials: 'JL',
  },
  {
    quote:
      'D\'un croquis sur un coin de table à un produit en ligne. Huggy me donne l\'impression d\'avoir toute une équipe d\'ingénieurs avec moi.',
    name: 'Lisa Tanaka',
    role: 'Solo Entrepreneuse',
    initials: 'LT',
  },
] as const;

const FAQ_ITEMS = [
  {
    q: 'Que puis-je construire avec Huggy ?',
    a: 'Des tableaux de bord SaaS, des pages d\'atterrissage, des outils internes, des prototypes multi-écrans : tout ce que vous pouvez imaginer. Huggy génère et organise tout pour vous.',
  },
  {
    q: 'Dois-je savoir coder ?',
    a: 'Non pour démarrer : décrivez votre idée en langage naturel. Le code reste accessible pour affiner quand vous le souhaitez.',
  },
  {
    q: 'Comment les projets sont-ils sauvegardés ?',
    a: 'Avec une infrastructure de données configurée, vos fichiers et déploiements sont persistés par projet. Le studio reste accessible pour explorer vos idées localement.',
  },
  {
    q: 'Puis-je publier mon application publiquement ?',
    a: 'Oui. Le déploiement produit une version statique servie sous un lien unique (`/live/{slug}/`) ou un sous-domaine si vous configurez le DNS.',
  },
  {
    q: 'Quels modèles d\'IA sont utilisés ?',
    a: 'Claude (Anthropic) est utilisé en priorité ; Gemini peut servir de secours si nécessaire pour garantir une disponibilité maximale.',
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Les clés API restent côté serveur. Vos secrets ne sont jamais exposés ; nous utilisons des variables d’environnement sécurisées.',
  },
  {
    q: 'Existe-t-il une version gratuite ?',
    a: 'Vous pouvez démarrer gratuitement pour explorer le studio. Les coûts viennent ensuite de votre usage des ressources IA pour générer des projets complexes.',
  },
] as const;

/** Pictogramme 4 branches (losange / étoile à 4 pointes) comme sur huggy.sbs */
function FooterStarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M12 2 22 12 12 22 2 12Z" />
    </svg>
  );
}

function scrollToId(id: string, onDone?: () => void) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  onDone?.();
}

export default function LandingPage({ accent, onOpenStudio, onLogin, userId }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [buildInput, setBuildInput] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async (plan: string) => {
    if (!userId) {
      alert("Veuillez vous connecter avant de souscrire à un plan.");
      return;
    }
    setIsCheckingOut(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, userId })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Une erreur est survenue");
    } catch {
      alert("Erreur de connexion.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const go = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      scrollToId(id, () => setMobileNavOpen(false));
    },
    [],
  );

  const openStudio = useCallback(() => {
    onOpenStudio(buildInput.trim() || undefined);
  }, [buildInput, onOpenStudio]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.ov  return (
    <div className="min-h-screen bg-[#030304] text-slate-100 font-sans antialiased transition-colors duration-300 relative overflow-x-hidden">
      {/* Immersive Mesh Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="sticky top-0 z-[110] border-b border-white/5 bg-black/40 backdrop-blur-3xl supports-[backdrop-filter]:bg-black/20 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 grid grid-cols-3 items-center">
          {/* Left Side: Logo */}
          <div className="flex items-center justify-start gap-3">
            <button
              type="button"
              onClick={() => scrollToId('top')}
              className="flex items-center gap-3 rounded-xl focus:outline-none group"
            >
              <div
                className={`w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-600/20 group-hover:scale-105 transition-transform`}
              >
                <Zap size={20} fill="currentColor" />
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-lg font-black tracking-tighter text-white uppercase italic">Huggy</span>
                <span className="text-[10px] font-black text-blue-500 tracking-[0.3em] mt-0.5">ELITE ENGINE</span>
              </div>
            </button>
          </div>

          {/* Center Side: Navigation */}
          <nav className="hidden md:flex items-center justify-center gap-10 text-[11px] font-black text-slate-500 uppercase tracking-widest">
            <a href="#features" onClick={go('features')} className="hover:text-white transition-colors duration-200">Capabilities</a>
            <a href="#how-it-works" onClick={go('how-it-works')} className="hover:text-white transition-colors duration-200">Process</a>
            <a href="#testimonials" onClick={go('testimonials')} className="hover:text-white transition-colors duration-200 whitespace-nowrap">Community</a>
            <a href="#pricing" onClick={go('pricing')} className="hover:text-white transition-colors duration-200">Pricing</a>
          </nav>

          {/* Right Side: Actions */}
          <div className="flex items-center justify-end gap-6">
            <button
              onClick={() => onLogin && onLogin()}
              className="hidden sm:inline-block text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all active:scale-95"
            >
              Log In
            </button>
            
            <button
              type="button"
              onClick={() => onOpenStudio(buildInput.trim() || undefined)}
              className="hidden sm:flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-slate-100 rounded-2xl text-[11px] font-black transition-all shadow-2xl shadow-white/5 active:scale-[0.96] uppercase tracking-widest"
            >
              <Sparkles size={14} />
              Accès Studio
            </button>
            
            <button
              type="button"
              className="md:hidden p-2 rounded-xl text-slate-300 hover:bg-white/10 transition-colors"
              onClick={() => setMobileNavOpen((v) => !v)}
            >
              {mobileNavOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      <div id="top" className="relative z-10">
        <main className="pt-24 pb-32">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black tracking-[0.3em] uppercase mb-8"
            >
              <Sparkles size={12} />
              AI-First SaaS Infrastructure
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl sm:text-7xl lg:text-[100px] leading-[0.95] font-black tracking-tighter text-white"
            >
              Générez votre <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 italic">SaaS d'élite</span> en 60s.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-10 mx-auto max-w-2xl text-slate-400 text-lg sm:text-xl leading-relaxed font-medium"
            >
              Décrivez votre projet en français. Huggy construit l'interface, la base de données et le déploiement. Le futur du développement est arrivé.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-16 max-w-3xl mx-auto relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[32px] blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <HuggyChatInput
                onSend={(prompt) => {
                  if (prompt.trim()) setBuildInput(prompt);
                  onOpenStudio(prompt);
                }}
                placeholder="Crée un dashboard SaaS pour une agence de marketing..."
                modelLabel="Huggy Elite AI"
                className="relative z-10"
              />
            </motion.div>

            <div className="mt-40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
              {[
                { icon: FileCode, color: 'blue', t: 'SaaS Builder', d: 'Architectures complexes générées instantanément avec React & Tailwind.' },
                { icon: BarChart3, color: 'indigo', t: 'Elite Analytics', d: 'Visualisations de données immersives et rapports interactifs intégrés.' },
                { icon: Database, color: 'emerald', t: 'Persistance Totale', d: 'Bases de données SQL et stockage cloud configurés par défaut.' },
                { icon: Shield, color: 'rose', t: 'Sécurité Maximale', d: 'Auth biométrique et cryptage de bout en bout pour vos utilisateurs.' },
              ].map((c, i) => (
                <motion.div
                  key={c.t}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="group relative p-8 bg-white/[0.03] border border-white/5 rounded-[40px] hover:bg-white/[0.05] transition-all duration-500"
                >
                   <div className={`w-12 h-12 rounded-2xl bg-${c.color}-500/10 flex items-center justify-center text-${c.color}-400 mb-6 group-hover:scale-110 transition-transform`}>
                     <c.icon size={22} />
                   </div>
                   <h3 className="text-lg font-black text-white mb-3 italic">{c.t}</h3>
                   <p className="text-[13px] font-medium text-slate-500 leading-relaxed">{c.d}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </main>

        <section id="how-it-works" className="py-40 bg-white/[0.01] border-y border-white/[0.03]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row gap-20 items-center">
              <div className="flex-1 text-left">
                <div className="inline-flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] mb-6">
                   <div className="w-8 h-px bg-blue-500/50" />
                   The Flow
                </div>
                <h2 className="text-4xl sm:text-6xl font-black text-white leading-tight tracking-tighter italic">
                  De l'idée brute au <br /> <span className="text-blue-500">produit d'élite.</span>
                </h2>
                <p className="mt-8 text-slate-400 text-lg font-medium leading-relaxed">
                  Notre pipeline d'IA ne se contente pas de coder ; il conçoit une expérience utilisateur complète en trois étapes clés.
                </p>
              </div>
              <div className="flex-1 space-y-6">
                {[
                  { n: '01', t: 'Analyse Sémantique', d: 'L\'IA déconstruit votre prompt pour en extraire la logique métier et les composants requis.' },
                  { n: '02', t: 'Génération Synaptique', d: 'Construction du code source, du style atomique et des routes API en parallèle.' },
                  { n: '03', t: 'Déploiement Orbital', d: 'Votre application est mise en ligne instantanément sur notre infrastructure cloud optimisée.' },
                ].map((s) => (
                  <div key={s.n} className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 flex gap-6 group hover:bg-white/[0.04] transition-all">
                    <span className="text-3xl font-black text-blue-600/40 group-hover:text-blue-500 transition-colors">{s.n}</span>
                    <div>
                      <h4 className="text-white font-black text-lg mb-1">{s.t}</h4>
                      <p className="text-sm text-slate-500 font-medium">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="py-40">
           <div className="max-w-6xl mx-auto px-6">
             <div className="text-center mb-24">
                <h2 className="text-xs font-black text-blue-500 uppercase tracking-[0.5em] mb-4">Elite Community</h2>
                <p className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none italic">
                  Ils bâtissent le futur <br /> avec Huggy.
                </p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {TESTIMONIALS.map((t, i) => (
                 <motion.div
                   key={t.name}
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: i * 0.1 }}
                   className="p-10 rounded-[48px] bg-white/[0.02] border border-white/5 hover:border-blue-500/20 transition-all group"
                 >
                   <div className="flex gap-1 mb-8">
                      {[1,2,3,4,5].map(s => <Star key={s} size={12} className="fill-blue-500 text-blue-500" />)}
                   </div>
                   <p className="text-white font-bold text-lg leading-relaxed mb-10">&ldquo;{t.quote}&rdquo;</p>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center font-black text-xs border border-blue-500/10">
                        {t.initials}
                      </div>
                      <div>
                        <p className="text-white font-black text-sm uppercase tracking-tight">{t.name}</p>
                        <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest">{t.role}</p>
                      </div>
                   </div>
                 </motion.div>
               ))}
             </div>
           </div>
        </section>

        <section id="pricing" className="py-40 bg-white/[0.01]">
          <PricingSection
            onCheckout={handleCheckout}
            onOpenStudio={() => onOpenStudio?.()}
            userId={userId}
            isCheckingOut={isCheckingOut}
          />
        </section>

        <footer className="py-20 px-6 border-t border-white/5">
           <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-black">
                   <Zap size={20} fill="currentColor" />
                </div>
                <span className="text-xl font-black text-white italic uppercase tracking-tighter">Huggy</span>
              </div>
              <nav className="flex gap-10 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                <a href="#" className="hover:text-white transition-colors">GitHub</a>
                <a href="#" className="hover:text-white transition-colors">Twitter</a>
                <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
                <a href="#" className="hover:text-white transition-colors">Discord</a>
              </nav>
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">© 2026 Elite SaaS Lab. All rights reserved.</p>
           </div>
        </footer>
      </div>

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[200] bg-black p-8 flex flex-col md:hidden"
          >
            <div className="flex justify-between items-center mb-20">
               <span className="text-2xl font-black italic text-white">HUGGY</span>
               <button onClick={() => setMobileNavOpen(false)}><X size={32} /></button>
            </div>
            <nav className="flex flex-col gap-8 text-4xl font-black italic">
               <a href="#features" onClick={() => setMobileNavOpen(false)}>Capabilities</a>
               <a href="#how-it-works" onClick={() => setMobileNavOpen(false)}>Process</a>
               <a href="#pricing" onClick={() => setMobileNavOpen(false)}>Pricing</a>
            </nav>
            <button
               onClick={() => { setMobileNavOpen(false); onOpenStudio(); }}
               className="mt-auto w-full py-6 bg-white text-black rounded-3xl font-black text-xl uppercase italic shadow-2xl"
            >
               Get Started
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}        </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
