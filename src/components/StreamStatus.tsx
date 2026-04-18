import React from 'react';
import { motion } from 'motion/react';
import { Loader2, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

export type StreamStatus = 'idle' | 'streaming' | 'complete' | 'error';

interface StreamStatusIndicatorProps {
  status: StreamStatus;
  message?: string;
  modelUsed?: string;
}

export function StreamStatusIndicator({
  status,
  message,
  modelUsed = 'Claude',
}: StreamStatusIndicatorProps) {
  if (status === 'idle') return null;

  const getIcon = () => {
    switch (status) {
      case 'streaming':
        return (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
            <Loader2 size={16} className="text-blue-500" />
          </motion.div>
        );
      case 'complete':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'streaming':
        return `En train de générer... (${modelUsed})`;
      case 'complete':
        return `Génération terminée (${modelUsed})`;
      case 'error':
        return `Erreur lors de la génération`;
      default:
        return '';
    }
  };

  const getBgColor = () => {
    switch (status) {
      case 'streaming':
        return 'bg-blue-50 border-blue-200';
      case 'complete':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return '';
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'streaming':
        return 'text-blue-700';
      case 'complete':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${getBgColor()} ${getTextColor()}`}
    >
      {getIcon()}
      <span>{getLabel()}</span>
      {message && <span className="text-xs opacity-75">• {message}</span>}
    </motion.div>
  );
}

interface StreamMetricsProps {
  tokensUsed?: number;
  estimatedTokens?: number;
  duration?: number;
  charsGenerated?: number;
}

export function StreamMetrics({
  tokensUsed,
  estimatedTokens,
  duration,
  charsGenerated,
}: StreamMetricsProps) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
      {tokensUsed !== undefined && (
        <div className="flex items-center gap-1">
          <Zap size={14} />
          <span>{tokensUsed} tokens</span>
          {estimatedTokens && <span className="text-slate-400">/ ~{estimatedTokens}</span>}
        </div>
      )}
      {duration !== undefined && (
        <div>
          <span>⏱️ {(duration / 1000).toFixed(1)}s</span>
        </div>
      )}
      {charsGenerated !== undefined && (
        <div>
          <span>📝 {charsGenerated} caractères</span>
        </div>
      )}
    </div>
  );
}

interface CancelButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

export function CancelStreamButton({ onClick, isLoading }: CancelButtonProps) {
  if (!isLoading) return null;

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
    >
      Arrêter la génération
    </motion.button>
  );
}
