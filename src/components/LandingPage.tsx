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
      'Huggy helped us ship our MVP in a single weekend. What used to take weeks now takes hours.',
    name: 'Sarah Chen',
    role: 'Founder, NovaTech',
    initials: 'SC',
  },
  {
    quote:
      'We replaced our entire prototyping workflow with Huggy. Our agency delivers client projects 5x faster.',
    name: 'Anya Petrov',
    role: 'CTO, Digital Forge',
    initials: 'AP',
  },
  {
    quote:
      "The AI understands what I want before I finish typing. It's like pair programming with someone who never sleeps.",
    name: 'David Okonkwo',
    role: 'Senior Developer',
    initials: 'DO',
  },
  {
    quote:
      'As a PM, I can now prototype ideas and get stakeholder buy-in before writing a single spec. Game changer.',
    name: 'Marcus Rivera',
    role: 'Product Lead, Acme Corp',
    initials: 'MR',
  },
  {
    quote:
      "I used Huggy for my capstone project and it blew my professor's mind. Built a full-stack app in 2 days.",
    name: 'Jordan Lee',
    role: 'CS Student, MIT',
    initials: 'JL',
  },
  {
    quote:
      'From napkin sketch to live product. Huggy made me feel like I have a full engineering team behind me.',
    name: 'Lisa Tanaka',
    role: 'Solo Entrepreneur',
    initials: 'LT',
  },
] as const;

const FAQ_ITEMS = [
  {
    q: 'What can I build with Huggy?',
    a: 'SaaS dashboards, landing pages, outils internes, prototypes multi-écrans : tout ce qui peut être imaginé. Huggy génère et organise tout pour vous.',
  },
  {
    q: 'Do I need to know how to code?',
    a: 'Non pour démarrer : décrivez votre idée en langage naturel. Le code reste accessible pour affiner quand vous le souhaitez.',
  },
  {
    q: 'How are projects saved?',
    a: 'Avec une infrastructure de données configurée, vos éléments et déploiements sont persistés par projet. Le studio reste accessible pour explorer vos idées localement.',
  },
  {
    q: 'Can I publish my app publicly?',
    a: 'Oui. Le déploiement produit une version statique servie sous un slug (`/live/{slug}/`) ou un sous-domaine si vous configurez le DNS.',
  },
  {
    q: 'Which AI models are used?',
    a: 'Claude (Anthropic) est utilisé en priorité ; Gemini peut servir de secours si la clé Anthropic est absente.',
  },
  {
    q: 'Is my data secure?',
    a: 'Les clés API restent côté serveur. Ne commitez jamais vos secrets ; utilisez les variables d’environnement.',
  },
  {
    q: 'Is there a free tier?',
    a: 'Vous pouvez démarrer sans carte bancaire en auto-hébergeant ou en local. Les coûts viennent surtout de votre usage des APIs IA.',
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
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-300">
      <div className="sticky top-0 z-[110] border-b border-slate-100/80 dark:border-white/5 bg-white/85 dark:bg-black/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 transition-[background,box-shadow] duration-300 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:shadow-none">
        <div className="max-w-6xl mx-auto px-6 h-16 grid grid-cols-2 md:grid-cols-[1fr_auto_1fr] items-center">
          {/* Left Side: Logo */}
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={() => scrollToId('top')}
              className="flex items-center gap-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              <div
                className={`w-9 h-9 ${accent.bg} rounded-xl flex items-center justify-center text-white shadow-lg`}
              >
                <Zap size={18} fill="currentColor" />
              </div>
              <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Huggy</span>
            </button>
          </div>

          {/* Center Side: Navigation */}
          <nav className="hidden md:flex items-center justify-center gap-10 text-sm font-bold text-slate-500 dark:text-slate-400">
            <a href="#features" onClick={go('features')} className="hover:text-slate-900 dark:hover:text-white transition-colors duration-200">Features</a>
            <a href="#how-it-works" onClick={go('how-it-works')} className="hover:text-slate-900 dark:hover:text-white transition-colors duration-200">How it works</a>
            <a href="#testimonials" onClick={go('testimonials')} className="hover:text-slate-900 dark:hover:text-white transition-colors duration-200">Community</a>
            <a href="#pricing" onClick={go('pricing')} className="hover:text-slate-900 dark:hover:text-white transition-colors duration-200">Pricing</a>
            <a href="#about" onClick={go('about')} className="hover:text-slate-900 dark:hover:text-white transition-colors duration-200">About</a>
          </nav>

          {/* Right Side: Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => onLogin && onLogin()}
              className="hidden sm:inline-block text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
            >
              Sign in
            </button>
            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              onClick={() => onOpenStudio(buildInput.trim() || undefined)}
              className={`hidden sm:flex items-center gap-2 px-5 py-2.5 ${accent.bg} hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all duration-200 shadow-lg shadow-blue-600/20 active:scale-[0.98]`}
            >
              <Sparkles size={16} />
              Get started
            </button>
            <button
              type="button"
              className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              aria-expanded={mobileNavOpen}
              aria-label="Menu"
              onClick={() => setMobileNavOpen((v) => !v)}
            >
              {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#0A0A0A] px-6 py-4 flex flex-col gap-1">
            {[
              ['Features', 'features'],
              ['How it works', 'how-it-works'],
              ['Community', 'testimonials'],
              ['Pricing', 'pricing'],
              ['About', 'about'],
              ['FAQ', 'faq'],
              ['Contact', 'contact'],
            ].map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                className="py-3 text-sm font-bold text-slate-700 dark:text-slate-300 border-b border-slate-50 dark:border-white/5 last:border-0"
                onClick={go(id)}
              >
                {label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                onOpenStudio(buildInput.trim() || undefined);
              }}
              className={`mt-3 flex items-center justify-center gap-2 px-5 py-3 ${accent.bg} text-white rounded-xl text-sm font-bold`}
            >
              Get started
            </button>
          </div>
        )}
      </div>

      <div id="top" className="overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6">
          <main className="pt-20 pb-12">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-black tracking-wide">
                <Sparkles size={14} />
                AI-POWERED APP BUILDER
              </div>

              <h1 className="mt-16 text-4xl sm:text-6xl lg:text-[76px] leading-none font-black tracking-tight">
                <span className="block text-[#0F172A] dark:text-white">Build any SaaS</span>
                <span className="block text-blue-600 italic">instantly.</span>
              </h1>

              <p className="mt-8 mx-auto max-w-xl text-slate-500 dark:text-slate-400 text-base leading-relaxed">
                Describe your project, Huggy does the rest. AI-generated code, UI, dashboards, and data tables in seconds.
              </p>

              <div className="mt-14 max-w-3xl mx-auto">
                <div className="rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/10 dark:shadow-black/40 bg-white dark:bg-[#111] border border-slate-100 dark:border-white/5">
                  <div className="p-6">
                    <HuggyChatInput
                      onSend={(prompt) => {
                        if (prompt.trim()) setBuildInput(prompt);
                        openStudio();
                      }}
                      placeholder="Build a CRM for real estate with client tracking..."
                      modelLabel="Huggy AI"
                    />
                  </div>
                </div>
              </div>

              {/* --- FEATURES SECTION (Redesigned: Glassmorphism) --- */}
              <div id="features" className="mt-40 scroll-mt-28">
                <div className="flex items-center gap-3 mb-16 overflow-hidden">
                  <div className="h-px bg-slate-200 dark:bg-white/10 flex-1" />
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] whitespace-nowrap">Capabilities</span>
                  <div className="h-px bg-slate-200 dark:bg-white/10 flex-1" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 text-left">
                  {[
                    { icon: FileCode, accent: 'blue', t: 'SaaS Platform Builder', d: 'Concevez des dashboards complexes et des interfaces client en un clin d\'œil.' },
                    { icon: BarChart3, accent: 'indigo', t: 'Analytics & Insights', d: 'Générez des graphiques interactifs et des rapports de données en temps réel.' },
                    { icon: Database, accent: 'emerald', t: 'Gestion de Données', d: 'Connectez instantanément votre stockage sécurisé et vos flux d\'information.' },
                    { icon: Shield, accent: 'rose', t: 'Enterprise Security', d: 'Auth sécurisée, gestion des rôles et protection des données par défaut.' },
                  ].map((c) => (
                    <div
                      key={c.t}
                      className="group relative p-10 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-[32px] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 hover:-translate-y-2"
                    >
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-${c.accent}-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-${c.accent}-500/10 transition-colors`} />
                      <div className={`w-14 h-14 rounded-2xl bg-${c.accent}-50 flex items-center justify-center text-${c.accent}-600 mb-6 group-hover:scale-110 transition-transform duration-500 border border-${c.accent}-100/50`}>
                        <c.icon size={24} />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-3 italic">{c.t}</h3>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{c.d}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-bounce">Scroll for more</p>
            </div>
          </main>

          {/* --- HOW IT WORKS (Redesigned: Visual Timeline) --- */}
          <section id="how-it-works" className="scroll-mt-28 py-32">
            <div className="relative rounded-[48px] bg-slate-100/50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 p-16 overflow-hidden">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-blue-500/20 via-blue-200/10 to-transparent hidden lg:block" />
               
               <div className="relative text-center mb-16">
                 <h2 className="text-xs font-black uppercase tracking-[0.4em] text-blue-600 mb-4 px-4">Le Processus Huggy</h2>
                 <p className="text-3xl sm:text-4xl font-black text-[#0F172A] dark:text-white tracking-tight">De l'idée au déploiement en 60s.</p>
               </div>

               <div className="grid lg:grid-cols-3 gap-20 relative">
                 {[
                   { n: '01', t: 'Inspiration AI', d: 'Décrivez votre vision en langage naturel. Huggy analyse et structure votre application instantanément.' },
                   { n: '02', t: 'Édition Immersive', d: 'Ajustez votre interface en temps réel dans notre studio de classe mondiale. Code propre et optimisé.' },
                   { n: '03', t: 'Push & Live', d: 'Déployez vers GitHub ou notre cloud sécurisé. Votre SaaS est prêt à accueillir ses utilisateurs.' },
                 ].map((s) => (
                   <div key={s.n} className="relative group p-8 rounded-3xl bg-white dark:bg-[#111] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-500">
                     <span className="text-6xl font-black text-slate-100 dark:text-white/5 group-hover:text-blue-50/50 transition-colors absolute -top-4 -left-4 pointer-events-none select-none">{s.n}</span>
                     <div className="relative">
                       <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{s.t}</h3>
                       <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{s.d}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </section>
        </div>

        {/* --- TESTIMONIALS (Redesigned: Premium Grid) --- */}
        <section id="testimonials" className="scroll-mt-28 py-48 px-6 relative overflow-hidden bg-white dark:bg-[#0A0A0A]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.03),transparent)]" />
          <div className="max-w-6xl mx-auto relative">
            <div className="text-center mb-24">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black tracking-widest border border-blue-100 shadow-sm mb-6">
                <Star size={14} className="fill-blue-600" />
                COMMUNITY VOICE
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Plébiscité par les bâtisseurs.</h2>
              <p className="mt-6 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">Rejoignez des milliers de créateurs qui repoussent les limites du possible.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12">
              {TESTIMONIALS.map((t, idx) => (
                <article
                  key={t.name}
                  className={`bg-white dark:bg-white/[0.02] p-10 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm flex flex-col transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group ${idx === 1 ? 'md:scale-105 z-10 border-blue-100 dark:border-blue-500/20' : ''}`}
                >
                  <p className="text-slate-700 dark:text-slate-300 font-bold text-lg leading-relaxed mb-8">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-auto pt-8 border-t border-slate-50 dark:border-white/5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-white/10 text-white flex items-center justify-center text-xs font-black shadow-lg group-hover:rotate-6 transition-transform">
                      {t.initials}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white tracking-tight">{t.name}</p>
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5">{t.role}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6">
          {/* --- PRICING --- */}
          <section id="pricing" className="scroll-mt-28 border-t border-slate-100 dark:border-white/5">
            <PricingSection
              onCheckout={handleCheckout}
              onOpenStudio={() => onOpenStudio?.()}
              userId={userId}
              isCheckingOut={isCheckingOut}
            />
          </section>

          <section id="faq" className="scroll-mt-28 py-16 border-t border-slate-100 dark:border-white/5">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black tracking-wide">
                <Sparkles size={14} />
                FAQ
              </div>
              <h2 className="mt-6 text-3xl font-black text-[#0F172A] dark:text-white">Frequently asked questions</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">Everything you need to know about Huggy</p>
            </div>
            <div className="mt-10 max-w-3xl mx-auto divide-y divide-slate-200 dark:divide-white/5 border-t border-b border-slate-200 dark:border-white/5">
              {FAQ_ITEMS.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div key={item.q} className="py-0">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-4 py-5 text-left text-[#0F172A] dark:text-slate-200 font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        size={20}
                        className={`shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                    >
                      <div className="overflow-hidden min-h-0">
                        <p className="pb-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed pr-8">{item.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section id="cta" className="scroll-mt-28 py-32 relative overflow-hidden">
            {/* Decorative Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-50 dark:opacity-100">
              <div className="absolute bottom-0 left-1/4 w-[500px] h-[300px] bg-blue-600/20 blur-[120px] rounded-full" />
              <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-indigo-600/20 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">
                AI App Builder
              </div>
              
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                Ready to build?
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 mb-12 max-w-xl mx-auto font-medium">
                Join thousands of makers who ship faster with Huggy. Describe your project and let the AI do the heavy lifting.
              </p>

              <div className="max-w-3xl mx-auto">
                <div className="rounded-[32px] overflow-hidden shadow-2xl shadow-blue-500/10 dark:shadow-black/60 bg-white dark:bg-[#111] border border-slate-100 dark:border-white/5 transition-all duration-500 hover:border-blue-500/30">
                  <div className="p-6">
                    <HuggyChatInput
                      onSend={(prompt) => {
                        if (prompt.trim()) setBuildInput(prompt);
                        openStudio();
                      }}
                      placeholder="Ask Huggy to create anything..."
                      modelLabel="Huggy AI"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  type="button"
                  onClick={() => onOpenStudio(buildInput.trim() || undefined)}
                  className={`px-8 py-3.5 rounded-2xl ${accent.bg} text-white font-bold text-sm shadow-xl shadow-blue-600/20 hover:scale-105 transition-all active:scale-95`}
                >
                  Start building for free
                </button>
                <button
                  type="button"
                  onClick={go('pricing')}
                  className="px-8 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95"
                >
                  See pricing
                </button>
              </div>
              <p className="mt-8 text-xs font-medium text-slate-400 dark:text-slate-500">
                No credit card required. Instant access.
              </p>
            </div>
          </section>
        </div>

        <footer id="contact" className="scroll-mt-28 mt-6 px-4 sm:px-6 pb-8 font-sans">
          <div className="max-w-6xl mx-auto rounded-[28px] overflow-hidden shadow-2xl ring-1 ring-slate-900/20">
            <div
              className="relative px-8 sm:px-12 lg:px-16 pt-14 sm:pt-16 pb-10 sm:pb-12 text-white"
              style={{
                background:
                  'radial-gradient(ellipse 120% 100% at 18% 42%, #1e4a9e 0%, #0a2472 35%, #06113c 68%, #020817 100%)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse 85% 130% at 100% 50%, rgba(1,7,20,0.75) 0%, transparent 52%)',
                }}
                aria-hidden
              />
              <div className="relative">
                {/* Bloc titre (comme huggy.sbs) */}
                <header className="max-w-3xl mb-10 sm:mb-12 lg:mb-14">
                  <p className="flex items-center gap-2 text-[#7dd3fc] text-[11px] sm:text-xs font-bold tracking-[0.22em] uppercase mb-5 sm:mb-6">
                    <FooterStarIcon className="w-3.5 h-3.5 text-[#7dd3fc] shrink-0" />
                    CONTACTEZ-NOUS
                  </p>
                  <h2 className="text-[1.625rem] sm:text-3xl lg:text-[2.125rem] font-bold text-white leading-[1.22] tracking-tight">
                    Intéressé par une collaboration, essayer la plateforme ou simplement en savoir plus ?
                  </h2>
                </header>

                {/* Même ligne : contact à gauche, navigation à droite */}
                <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                  <div>
                    <p className="text-sm font-normal text-[#94a3b8] leading-normal">Contactez-nous :</p>
                    <a
                      href="mailto:contact@huggy.sbs"
                      className="mt-2 inline-flex items-center gap-2 text-base font-bold text-white hover:text-[#bae6fd] transition-colors"
                    >
                      contact@huggy.sbs
                      <ExternalLink size={15} className="text-[#94a3b8]" strokeWidth={2} aria-hidden />
                    </a>
                  </div>
                  <nav
                    aria-label="Pied de page"
                    className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm font-medium text-[#94a3b8] lg:justify-end"
                  >
                    <a href="#about" onClick={go('about')} className="hover:text-white transition-colors duration-200">
                      À propos
                    </a>
                    <a href="#pricing" onClick={go('pricing')} className="hover:text-white transition-colors duration-200">
                      Tarifs
                    </a>
                    <a href="#features" onClick={go('features')} className="hover:text-white transition-colors duration-200">
                      Templates
                    </a>
                    <a href="#contact" onClick={go('contact')} className="hover:text-white transition-colors duration-200">
                      Contact
                    </a>
                  </nav>
                </div>

                <div className="mt-16 sm:mt-20 lg:mt-24 flex justify-center">
                  <span className="select-none text-[clamp(3.5rem,12vw,7rem)] font-bold tracking-tight text-white lowercase leading-[1]">
                    huggy
                  </span>
                </div>

                <div className="mt-14 sm:mt-16 pt-6 border-t border-white/15 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="text-[11px] sm:text-xs text-[#94a3b8] text-center sm:text-left order-2 sm:order-1">
                    © 2026 Huggy. Tous droits réservés.
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-2 text-[11px] sm:text-xs text-[#94a3b8] order-1 sm:order-2">
                    <a href="#" className="hover:text-white transition-colors duration-200">
                      CGU
                    </a>
                    <span className="text-white/25 select-none" aria-hidden>
                      |
                    </span>
                    <a href="#" className="hover:text-white transition-colors duration-200">
                      Confidentialité
                    </a>
                    <span className="text-white/25 select-none" aria-hidden>
                      |
                    </span>
                    <a href="#" className="hover:text-white transition-colors duration-200">
                      Mentions légales
                    </a>
                    <span className="text-white/25 select-none hidden sm:inline" aria-hidden>
                      |
                    </span>
                    <span className="flex items-center gap-3 pl-0 sm:pl-1">
                      <a
                        href="https://linkedin.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#94a3b8] hover:text-white transition-colors duration-200"
                        aria-label="LinkedIn"
                      >
                        <Linkedin size={17} strokeWidth={1.75} />
                      </a>
                      <a
                        href="https://twitter.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#94a3b8] hover:text-white transition-colors duration-200"
                        aria-label="Twitter"
                      >
                        <Twitter size={17} strokeWidth={1.75} />
                      </a>
                      <a
                        href="https://github.com/Predat1/huggi-v1"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#94a3b8] hover:text-white transition-colors duration-200"
                        aria-label="GitHub"
                      >
                        <Github size={17} strokeWidth={1.75} />
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
