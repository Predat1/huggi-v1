/** Entrée d’aperçu (react-live). Aligné avec le seed serveur (`server/lib/defaultAppCode.mjs`). */
export const DEFAULT_PREVIEW_CODE = `() => {
  const [n, setN] = React.useState(0);
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-8">
      <main className="max-w-3xl mx-auto space-y-6">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">NEXUS · démo générée par Huggy</p>
        <h1 className="text-4xl font-black tracking-tight">Bienvenue</h1>
        <p className="text-slate-500">Demandez à Huggy de modifier cette interface.</p>
        <button type="button" onClick={() => setN(n + 1)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm">
          Clics : {n}
        </button>
      </main>
    </div>
  );
}`;
