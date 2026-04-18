import React from 'react';
import { motion } from 'motion/react';
import { Loader2, Zap } from 'lucide-react';

type LoaderProps = {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  variant?: 'default' | 'minimal';
};

const sizes = {
  sm: 24,
  md: 40,
  lg: 56,
};

export function Loader({ size = 'md', text, variant = 'default' }: LoaderProps) {
  const iconSize = sizes[size];

  if (variant === 'minimal') {
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 size={iconSize} className="text-blue-600" />
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        <div className={`relative w-${size === 'sm' ? '8' : size === 'md' ? '10' : '14'}`}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 opacity-20 blur-lg animate-pulse" />
          <Zap
            size={iconSize}
            className="text-blue-600 relative"
            fill="currentColor"
          />
        </div>
      </motion.div>
      {text && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium text-slate-600"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

export function PageLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <Loader size="lg" text="Chargement..." />
    </motion.div>
  );
}

type SkeletonProps = {
  className?: string;
  count?: number;
};

export function Skeleton({ className = '', count = 1 }: SkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`bg-slate-200 rounded-lg ${className}`}
        />
      ))}
    </div>
  );
}
