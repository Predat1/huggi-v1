import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Menu, X, Home, Settings, HelpCircle, LogOut, ChevronRight } from 'lucide-react';

type NavItem = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
};

type NavigationBarProps = {
  onOpenStudio?: () => void;
  onSettings?: () => void;
  onHelp?: () => void;
  onLogout?: () => void;
  isStudioMode?: boolean;
};

export function NavigationBar({
  onOpenStudio,
  onSettings,
  onHelp,
  onLogout,
  isStudioMode = false,
}: NavigationBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { icon: <Home size={18} />, label: 'Accueil', onClick: () => {}, isActive: !isStudioMode },
    { icon: <Settings size={18} />, label: 'Paramètres', onClick: onSettings },
    { icon: <HelpCircle size={18} />, label: 'Aide', onClick: onHelp },
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-[100] border-b border-slate-200/50 dark:border-white/5 backdrop-blur-xl bg-white/80 dark:bg-black/80 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenStudio}
          className="flex items-center gap-2 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Zap size={18} />
          </div>
          <span className="hidden sm:inline text-sm font-bold text-slate-900 dark:text-white">Huggy</span>
        </motion.button>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <motion.button
              key={item.label}
              whileHover={{ backgroundColor: '#f1f5f9' }}
              onClick={item.onClick}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                item.isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-600/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </motion.button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Logout (hidden until implemented) */}
          {onLogout && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <LogOut size={16} />
            </motion.button>
          )}

          {/* Mobile Menu Toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-900 dark:text-white"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#0A0A0A]"
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <motion.button
                  key={item.label}
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    item.onClick();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.isActive
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-600/10'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </span>
                  <ChevronRight size={16} />
                </motion.button>
              ))}
              {onLogout && (
                <motion.button
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <LogOut size={16} />
                  Déconnexion
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

