import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, ChevronLeft, Plus, Folder } from 'lucide-react';

type Breadcrumb = {
  label: string;
  onClick: () => void;
};

type BreadcrumbNavProps = {
  items: Breadcrumb[];
  onAdd?: () => void;
};

export function BreadcrumbNav({ items, onAdd }: BreadcrumbNavProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-50 to-white dark:from-[#0F0F0F] dark:to-[#111] border-b border-slate-200 dark:border-white/5 overflow-x-auto"
    >
      {items.map((item, idx) => (
        <div key={`${item.label}-${idx}`} className="flex items-center gap-2 whitespace-nowrap">
          {idx > 0 && <ChevronRight size={16} className="text-slate-400" />}
          <motion.button
            whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
            onClick={item.onClick}
            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded transition-colors"
          >
            {idx === 0 ? <Folder size={16} className="inline mr-1" /> : null}
            {item.label}
          </motion.button>
        </div>
      ))}
      {onAdd && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAdd}
          className="ml-auto p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-colors"
          title="Ajouter un fichier"
        >
          <Plus size={18} />
        </motion.button>
      )}
    </motion.div>
  );
}

type TabsProps = {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClose?: () => void;
  }>;
  activeTabId: string;
  onTabChange: (id: string) => void;
};

export function TabNavigation({ tabs, activeTabId, onTabChange }: TabsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-1 px-2 py-2 border-b border-slate-200 dark:border-white/5 overflow-x-auto bg-white dark:bg-[#0A0A0A]"
    >
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTabId === tab.id
              ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
          {tab.label}
        </motion.button>
      ))}
    </motion.div>
  );
}

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function Sidebar({ isOpen, onClose, title, children }: SidebarProps) {
  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: isOpen ? 0 : -300, opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`fixed left-0 top-0 h-full w-80 bg-white dark:bg-[#0F0F0F] border-r border-slate-200 dark:border-white/5 shadow-lg z-40 ${
        !isOpen ? 'pointer-events-none' : ''
      }`}
    >
      <div className="h-full flex flex-col">
        <div className="px-4 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ChevronLeft size={20} />
          </motion.button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </motion.div>
  );
}
