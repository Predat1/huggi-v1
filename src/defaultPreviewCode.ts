/** Entrée d’aperçu (react-live). Aligné avec le seed serveur (`server/lib/defaultAppCode.mjs`). */
export const DEFAULT_PREVIEW_CODE = `() => {
  const [activeTab, setActiveTab] = React.useState('overview');
  
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="h-16 bg-white border-b border-slate-100 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg" />
          <span className="font-black tracking-tight">SaaS Project</span>
        </div>
        <div className="flex gap-6 text-sm font-medium text-slate-400">
          <button className="text-blue-600">Overview</button>
          <button>Settings</button>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto p-10 space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Project Overview</h1>
          <p className="text-slate-500 text-sm">Welcome to your new production-ready SaaS environment.</p>
        </header>
        
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600">
                <span className="font-bold text-xs">0{i}</span>
              </div>
              <h3 className="font-bold">Metric Label</h3>
              <p className="text-xs text-slate-400">Daily performance metrics and data analysis visualization.</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}`;
