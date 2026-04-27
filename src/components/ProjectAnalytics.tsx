import React from 'react';
import { 
  Users, 
  Eye, 
  Clock, 
  ArrowUpRight, 
  Globe, 
  Smartphone, 
  Monitor, 
  MapPin, 
  BarChart3,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  MousePointer2,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';

interface StatCardProps {
  label: string;
  value: string;
  subValue: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
}

const StatCard = ({ label, value, subValue, icon, trend }: StatCardProps) => (
  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[11px] font-bold ${trend.positive ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend.positive ? <ArrowUpRight size={12} /> : <TrendingUp size={12} className="rotate-180" />}
          {trend.value}
        </div>
      )}
    </div>
    <div className="space-y-1">
      <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</h3>
      <p className="text-slate-400 dark:text-slate-500 text-[11px]">{subValue}</p>
    </div>
  </div>
);

export const ProjectAnalytics = () => {
  return (
    <div className="h-full overflow-y-auto bg-slate-50/50 dark:bg-transparent p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Project Analytics</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Real-time performance and audience insights</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">0 Live Visitors</span>
            </div>
            <button className="p-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 transition-all">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Total Visitors" 
            value="719" 
            subValue="Last 7 days" 
            icon={<Users size={20} />}
            trend={{ value: "+12.5%", positive: true }}
          />
          <StatCard 
            label="Pageviews" 
            value="1.6k" 
            subValue="Last 7 days" 
            icon={<Eye size={20} />}
            trend={{ value: "+8.2%", positive: true }}
          />
          <StatCard 
            label="Views Per Visit" 
            value="2.29" 
            subValue="Average engagement" 
            icon={<MousePointer2 size={20} />}
          />
          <StatCard 
            label="Visit Duration" 
            value="18m 20s" 
            subValue="Time on site" 
            icon={<Clock size={20} />}
            trend={{ value: "-2m", positive: false }}
          />
        </div>

        {/* Traffic Chart Placeholder */}
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Traffic Overview</h3>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                Visitors
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-1 px-2">
            {[40, 60, 45, 80, 120, 100, 150, 180, 140, 200, 240, 320, 280, 200].map((h, i) => (
              <motion.div 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${(h/320)*100}%` }}
                className="flex-1 bg-blue-600/20 dark:bg-blue-600/40 rounded-t-lg hover:bg-blue-600 transition-colors relative group"
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {h} visitors
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
            <span>20 Apr</span>
            <span>22 Apr</span>
            <span>24 Apr</span>
            <span>26 Apr</span>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sources */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Top Sources</h3>
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Source</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Visitors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {[
                    { name: 'Direct', val: '472' },
                    { name: 'm.facebook.com', val: '204' },
                    { name: 'facebook.com', val: '21' },
                    { name: 'l.facebook.com', val: '10' },
                    { name: 'google.com', val: '3' },
                  ].map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/10 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                          <ExternalLink size={14} />
                        </div>
                        {s.name}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white text-right">{s.val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Pages */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Top Pages</h3>
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Page Path</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Visitors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {[
                    { name: '/produit/produits-digitaux', val: '417' },
                    { name: '/produit/guide-diabete-naturel-controle-glycemie-locale', val: '212' },
                    { name: '/', val: '73' },
                    { name: '/boutique', val: '32' },
                    { name: '/mon-compte', val: '31' },
                  ].map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{p.name}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white text-right">{p.val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Countries */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Locations</h3>
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Country</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Visitors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {[
                    { flag: '🇨🇲', name: 'Cameroon', val: '195' },
                    { flag: '🇨🇮', name: 'Côte d’Ivoire', val: '138' },
                    { flag: '🇺🇸', name: 'United States', val: '98' },
                    { flag: '🇧🇫', name: 'Burkina Faso', val: '67' },
                    { flag: '🇲🇱', name: 'Mali', val: '63' },
                  ].map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <span className="text-xl">{c.flag}</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white text-right">{c.val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Devices */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Devices</h3>
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex items-center justify-around h-[340px]">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-white/5" />
                    <motion.circle 
                      cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" 
                      strokeDasharray={440} 
                      initial={{ strokeDashoffset: 440 }}
                      animate={{ strokeDashoffset: 440 * (1 - 0.823) }}
                      className="text-blue-600"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">82.3%</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mobile</span>
                  </div>
                </div>
                <div className="flex gap-8">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Mobile</span>
                      <span className="text-[10px] text-slate-400">82.3%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-white/10" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Desktop</span>
                      <span className="text-[10px] text-slate-400">17.7%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
