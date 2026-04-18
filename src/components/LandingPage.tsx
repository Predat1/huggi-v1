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
} from 'lucide-react';
import HuggyChatInput from './HuggyChatInput';

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
    a: 'SaaS dashboards, landing pages, outils internes, prototypes multi-écrans : tout ce qui peut être exprimé en React. Huggy génère et organise les fichiers pour vous.',
  },
  {
    q: 'Do I need to know how to code?',
    a: 'Non pour démarrer : décrivez votre idée en langage naturel. Le code reste accessible pour affiner quand vous le souhaitez.',
  },
  {
    q: 'How are projects saved?',
    a: 'Avec une base PostgreSQL configurée, vos fichiers et déploiements sont persistés par projet. Sans base, vous pouvez quand même explorer le studio en mode local.',
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

export default function LandingPage({ accent, onOpenStudio, userId }: LandingPageProps) {
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
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      <div className="sticky top-0 z-[110] border-b border-slate-100/80 bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 transition-[background,box-shadow] duration-300 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
              <span className="text-sm font-black tracking-tight text-slate-900">Huggy</span>
            </button>
            <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-600">
              <a href="#features" onClick={go('features')} className="hover:text-slate-900 transition-colors duration-200">
                Features
              </a>
              <a href="#how-it-works" onClick={go('how-it-works')} className="hover:text-slate-900 transition-colors duration-200">
                How it works
              </a>
              <a href="#testimonials" onClick={go('testimonials')} className="hover:text-slate-900 transition-colors duration-200">
                Community
              </a>
              <a href="#pricing" onClick={go('pricing')} className="hover:text-slate-900 transition-colors duration-200">
                Pricing
              </a>
              <a href="#about" onClick={go('about')} className="hover:text-slate-900 transition-colors duration-200">
                About
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#contact"
              onClick={go('contact')}
              className="hidden sm:inline-block text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors duration-200"
            >
              Sign in
            </a>
            <button
              type="button"
              onClick={() => onOpenStudio()}
              className={`hidden sm:flex items-center gap-2 px-5 py-2.5 ${accent.bg} hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all duration-200 shadow-lg shadow-blue-600/20 active:scale-[0.98]`}
            >
              <Sparkles size={16} />
              Get started
            </button>
            <button
              type="button"
              className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-expanded={mobileNavOpen}
              aria-label="Menu"
              onClick={() => setMobileNavOpen((v) => !v)}
            >
              {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 flex flex-col gap-1">
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
                className="py-3 text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0"
                onClick={go(id)}
              >
                {label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                onOpenStudio();
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
          <main className="pt-10 pb-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-black tracking-wide">
                <Sparkles size={14} />
                AI-POWERED APP BUILDER
              </div>

              <h1 className="mt-10 text-4xl sm:text-6xl lg:text-[76px] leading-none font-black tracking-tight">
                <span className="block text-[#0F172A]">Build any SaaS</span>
                <span className="block text-blue-600 italic">instantly.</span>
              </h1>

              <p className="mt-6 mx-auto max-w-xl text-slate-500 text-base leading-relaxed">
                Describe your project, Huggy does the rest. AI-generated code, UI, dashboards, and data tables in seconds.
              </p>

              <div className="mt-10 max-w-3xl mx-auto">
                <div className="rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/20" style={{ background: '#111215' }}>
                  <div className="p-6 pb-4">
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

              <div id="features" className="mt-12 scroll-mt-28 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                {[
                  { icon: FileCode, color: 'text-blue-600', bg: 'bg-blue-50', t: 'AI Landing Page Builder', d: 'Turn ideas into shippable UIs.' },
                  { icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50', t: 'SaaS Dashboard for Analytics', d: 'Charts, tables, and insights.' },
                  { icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50', t: 'Booking System for Doctors', d: 'Scheduling and appointments.' },
                  { icon: HardDrive, color: 'text-slate-700', bg: 'bg-slate-50', t: 'Project Management Tool', d: 'Tasks, files, and workflows.' },
                ].map((c) => (
                  <div
                    key={c.t}
                    className="p-6 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300"
                  >
                    <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.color} flex items-center justify-center`}>
                      <c.icon size={18} />
                    </div>
                    <p className="mt-4 text-sm font-black text-slate-800">{c.t}</p>
                    <p className="mt-1 text-xs text-slate-500">{c.d}</p>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-center text-xs text-slate-400">More ideas</p>
            </div>
          </main>



          <section id="how-it-works" className="scroll-mt-28 py-12 bg-[#F9FAFB] -mx-6 px-6 rounded-3xl">
            <h2 className="text-center text-sm font-black uppercase tracking-widest text-blue-600">Comment ça marche</h2>
            <p className="mt-2 text-center text-2xl font-black text-[#0F172A]">Trois étapes pour shipped</p>
            <div className="mt-10 grid md:grid-cols-3 gap-6">
              {[
                { n: '1', t: 'Générer', d: 'Décrivez votre produit ; Huggy propose une base de fichiers React.' },
                { n: '2', t: 'Éditer', d: 'Affinez dans l’éditeur, prévisualisez en live sur tous les formats.' },
                { n: '3', t: 'Publier', d: 'Déployez une build statique et partagez votre URL /live/{slug}/.' },
              ].map((s) => (
                <div key={s.n} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm text-left transition-transform duration-300 hover:-translate-y-0.5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.n}</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{s.t}</p>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section id="testimonials" className="scroll-mt-28 py-20 px-6 bg-[#F9FAFB]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-black tracking-wide">
                <Star size={14} className="fill-blue-600 text-blue-600" />
                TESTIMONIALS
              </div>
              <h2 className="mt-6 text-3xl sm:text-4xl font-black text-[#0F172A]">Loved by builders worldwide</h2>
              <p className="mt-3 text-slate-500 max-w-lg mx-auto">See what makers and teams say about Huggy</p>
            </div>

            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t) => (
                <article
                  key={t.name}
                  className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col transition-shadow duration-300 hover:shadow-md"
                >
                  <div className="flex gap-0.5 text-[#2563EB]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={16} className="fill-[#2563EB] text-[#2563EB]" />
                    ))}
                  </div>
                  <p className="mt-4 text-[#0F172A] font-medium leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center text-xs font-black shrink-0"
                      aria-hidden
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="font-bold text-[#0F172A]">{t.name}</p>
                      <p className="text-sm text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6">
          <section id="pricing" className="scroll-mt-28 py-16">
            <h2 className="text-center text-3xl font-black text-[#0F172A]">Tarifs simples, sans surprise</h2>
            <p className="mt-4 text-center text-slate-500 text-base max-w-xl mx-auto">Démarrez avec le plan Hobby ou propulsez vos applications avec le plan Pro. Conservez jusqu'à 80% de gains de productivité.</p>
            <div className="mt-12 grid md:grid-cols-3 gap-8">
              {[
                { id: 'hobby', name: 'Hobby', price: '19 €', desc: 'Idéal pour les MVP et les prototypes simples.', feat: '1 000 Crédits IA / 2 Projets hébergés' },
                { id: 'pro', name: 'Pro', price: '39 €', desc: 'Pour les développeurs et freelances.', feat: '3 000 Crédits / 5 Projets / Domaines personnalisés', hi: true },
                { id: 'scale', name: 'Scale', price: '99 €', desc: 'Création sans limite. Haute performance.', feat: '10 000 Crédits / Projets illimités / APIs externes' },
              ].map((p) => (
                <div
                  key={p.name}
                  className={`rounded-3xl p-8 border transition-all duration-300 relative flex flex-col ${
                    p.hi ? 'border-blue-500 bg-blue-50/50 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.2)] md:-translate-y-4' : 'border-[#E2E8F0] bg-white hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  {p.hi && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-[10px] uppercase tracking-widest font-bold rounded-full shadow-md">Populaire</div>}
                  <p className="text-sm font-black uppercase tracking-widest text-slate-400">{p.name}</p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <p className="text-4xl font-black text-[#0F172A]">{p.price}</p>
                    <p className="text-sm font-bold text-slate-400 uppercase">/ mois</p>
                  </div>
                  <p className="mt-3 text-sm text-slate-500 min-h-[40px]">{p.desc}</p>
                  <div className="mt-6 pt-6 border-t border-slate-100 flex-1">
                    <p className="text-sm font-bold text-slate-700 flex items-start gap-2">
                      <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                      {p.feat}
                    </p>
                    <p className="mt-2 text-sm text-slate-500 flex items-start gap-2">
                      <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                      Export du code source ZIP
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isCheckingOut}
                    onClick={() => handleCheckout(p.id)}
                    className={`mt-8 w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                      p.hi ? `${accent.bg} text-white shadow-lg shadow-blue-600/30 hover:shadow-xl` : 'border-2 border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    Sélectionner le plan {p.name}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section id="faq" className="scroll-mt-28 py-16 border-t border-slate-100">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-black tracking-wide">
                <Sparkles size={14} />
                FAQ
              </div>
              <h2 className="mt-6 text-3xl font-black text-[#0F172A]">Frequently asked questions</h2>
              <p className="mt-2 text-slate-500">Everything you need to know about Huggy</p>
            </div>
            <div className="mt-10 max-w-3xl mx-auto divide-y divide-[#E2E8F0] border-t border-b border-[#E2E8F0]">
              {FAQ_ITEMS.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div key={item.q} className="py-0">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-4 py-5 text-left text-[#0F172A] font-bold hover:text-blue-600 transition-colors duration-200"
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
                        <p className="pb-5 text-sm text-slate-600 leading-relaxed pr-8">{item.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section id="cta" className="scroll-mt-28 py-16">
            <div className="rounded-3xl bg-slate-100 border border-slate-200/80 p-8 sm:p-12 text-center max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A]">Ready to build?</h2>
              <p className="mt-2 text-slate-600">Join thousands of makers who ship faster with Huggy.</p>
              <div className="mt-8 relative">
                <input
                  type="text"
                  value={buildInput}
                  onChange={(e) => setBuildInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openStudio();
                  }}
                  placeholder="What do you want to build?"
                  className="w-full pl-5 pr-14 py-4 rounded-2xl border border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-shadow"
                />
                <button
                  type="button"
                  onClick={openStudio}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center hover:opacity-90 transition-opacity active:scale-95"
                  aria-label="Envoyer"
                >
                  <ArrowUp size={18} />
                </button>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => onOpenStudio()}
                  className={`inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl ${accent.bg} text-white font-bold text-sm shadow-lg shadow-blue-600/25 hover:opacity-90 transition-all active:scale-[0.98]`}
                >
                  Start building for free
                  <span aria-hidden>›</span>
                </button>
                <button
                  type="button"
                  onClick={go('pricing')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] font-bold text-sm hover:bg-slate-50 transition-colors active:scale-[0.98]"
                >
                  See pricing
                  <span aria-hidden>›</span>
                </button>
              </div>
              <p className="mt-6 text-xs text-slate-400">No credit card required. Free to start.</p>
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
