import React, { useState } from 'react';
import { 
  Database, 
  Key, 
  Globe, 
  ShieldCheck, 
  Server, 
  ExternalLink, 
  Copy, 
  Check, 
  Settings, 
  HardDrive,
  Cpu,
  Lock,
  Eye,
  EyeOff,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';

interface ConfigCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const ConfigCard = ({ title, description, icon, children }: ConfigCardProps) => (
  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
    <div className="p-6 border-b border-slate-100 dark:border-white/5">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg text-slate-600 dark:text-slate-400">
          {icon}
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-xs ml-11">{description}</p>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

export const DatabaseInterface = ({ projectId }: { projectId: string | null }) => {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50/50 dark:bg-transparent p-6 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Database & Configuration</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your backend, secrets and deployment settings</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full">Projet ID: {projectId?.slice(0, 8) || 'local'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Database Status */}
          <ConfigCard 
            title="Database Connection" 
            description="Manage your PostgreSQL database hosted on Supabase" 
            icon={<Database size={18} />}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-400 uppercase tracking-wider">Connected</h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-500/80">PostgreSQL 15.1 · Standard Instance</p>
                  </div>
                </div>
                <button className="text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:underline flex items-center gap-1">
                  Open Dashboard <ExternalLink size={12} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                  <div className="text-slate-400 mb-2"><HardDrive size={16} /></div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">512 MB</div>
                  <div className="text-[10px] text-slate-500 uppercase font-black">Storage Used</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                  <div className="text-slate-400 mb-2"><Cpu size={16} /></div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">0.5 vCPU</div>
                  <div className="text-[10px] text-slate-500 uppercase font-black">Compute Load</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                  <div className="text-slate-400 mb-2"><Server size={16} /></div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">AWS us-east-1</div>
                  <div className="text-[10px] text-slate-500 uppercase font-black">Region</div>
                </div>
              </div>
            </div>
          </ConfigCard>

          {/* Secrets & Environment Variables */}
          <ConfigCard 
            title="Secrets & API Keys" 
            description="Securely store and manage your application's environment variables" 
            icon={<Key size={18} />}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Environment Variables</div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus size={12} /> Add Variable
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'SUPABASE_URL', val: 'https://db.huggy-cloud.co', secret: false },
                  { name: 'SUPABASE_ANON_KEY', val: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', secret: true },
                  { name: 'GEMINI_API_KEY', val: 'AIzaSyC-x7k9Jm2nLq5p4r3...', secret: true },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl group">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-slate-700 dark:text-slate-300">
                          {s.secret && !showKey ? '••••••••••••••••' : s.val}
                        </span>
                        {s.secret && (
                          <button onClick={() => setShowKey(!showKey)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(s.val, s.name)}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {copied === s.name ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </ConfigCard>

          {/* Domains & Domains */}
          <ConfigCard 
            title="Domains & Networking" 
            description="Manage custom domains and SSL certificates for your project" 
            icon={<Globe size={18} />}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">huggi-v1.vercel.app</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Lock size={10} /> SSL Active · Vercel Edge Network
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded">Primary</span>
                  <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            </div>
          </ConfigCard>
        </div>
      </div>
    </div>
  );
};
