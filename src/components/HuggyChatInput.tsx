import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  Sparkles,
  MoreHorizontal,
  ArrowUp,
  Mic,
  X,
  ChevronDown,
  Zap,
} from 'lucide-react';

export interface ChatTag {
  id: string;
  label: string;
  avatar?: string;
  color?: string;
}

export interface HuggyChatInputProps {
  /** Called when the user submits the prompt */
  onSend: (prompt: string, tags: ChatTag[]) => void;
  /** Whether generation is in progress */
  isLoading?: boolean;
  /** Initial tags shown in the tag area */
  defaultTags?: ChatTag[];
  /** Placeholder text inside the textarea */
  placeholder?: string;
  /** Custom class for the outer wrapper */
  className?: string;
  /** Show disclaimer text below the input */
  disclaimer?: string;
  /** Current AI model label */
  modelLabel?: string;
}

const AVATAR_COLORS = [
  '#7F77DD', '#378ADD', '#1D9E75', '#EF9F27', '#D4537E',
];

function TagPill(props: any) {
  const { tag, onRemove } = props;
  return (
    <div
      className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full border border-white/15 bg-white/10 text-white text-xs font-medium select-none"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      {tag.avatar ? (
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0 overflow-hidden"
          style={{ background: tag.color ?? AVATAR_COLORS[0] }}
        >
          {tag.avatar}
        </div>
      ) : (
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0"
          style={{ background: tag.color ?? AVATAR_COLORS[0] }}
        >
          {tag.label.slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className="text-white/90 max-w-[120px] truncate">{tag.label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-white/50 hover:text-white transition-colors ml-0.5"
        aria-label={`Remove ${tag.label}`}
      >
        <X size={10} />
      </button>
    </div>
  );
}

export default function HuggyChatInput({
  onSend,
  isLoading = false,
  defaultTags = [],
  placeholder = 'Ask AI anything',
  className = '',
  disclaimer = '',
  modelLabel = 'Huggy AI',
}: HuggyChatInputProps) {
  const [value, setValue] = useState('');
  const [tags, setTags] = useState<ChatTag[]>(defaultTags);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`;
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed && tags.length === 0) return;
    onSend(trimmed, tags);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeTag = (id: string) => setTags((prev) => prev.filter((t) => t.id !== id));

  const canSend = (value.trim().length > 0 || tags.length > 0) && !isLoading;

  return (
    <div className={`flex flex-col items-center gap-1.5 w-full ${className}`}>
      {/* ── Main input card ── */}
      <div
        className="w-full rounded-2xl border border-slate-200 overflow-hidden relative shadow-lg bg-white/80 backdrop-blur-xl"
      >
        {/* Branding (Subtle) */}
        {!disclaimer && (
          <div className="absolute top-3 right-5 select-none pointer-events-none opacity-5">
            <span className="text-[9px] font-black tracking-[0.2em] text-slate-900 uppercase italic">HUGGY</span>
          </div>
        )}

        {/* Tag row (Compact) */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 pt-4">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-1.5 py-1 pl-1 pr-2 rounded-full border border-slate-200 border-dashed bg-slate-50 text-[13px] font-medium text-slate-700 group/tag transition-all hover:bg-slate-100"
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 shadow-sm"
                  style={{ background: tag.color ?? '#378ADD' }}
                >
                  {tag.avatar ? (
                    <img src={tag.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-white uppercase">{tag.label.slice(0, 1)}</span>
                  )}
                </div>
                <span>{tag.label}</span>
                <button 
                  onClick={() => removeTag(tag.id)}
                  className="text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea Area */}
        <div className="px-5 pt-4 pb-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={placeholder}
            rows={1}
            className="w-full bg-transparent text-slate-900 text-[16px] font-medium placeholder-slate-300 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
            style={{ caretColor: '#6366F1', minHeight: '32px' }}
          />
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between px-4 pb-4 pt-1">
          {/* Left Toolbar */}
          <div className="flex items-center gap-1">
            {/* Plus */}
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all">
              <Plus size={20} strokeWidth={2} />
            </button>

            {/* Model Badge */}
            <div className="flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-slate-50 border border-slate-200 hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
              <div className="w-4 h-4 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="url(#sparkle-grad-compact)" />
                  <defs>
                    <linearGradient id="sparkle-grad-compact" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FB923C" />
                      <stop offset="50%" stopColor="#818CF8" />
                      <stop offset="100%" stopColor="#2DD4BF" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="text-slate-800 text-[13px] font-bold">{modelLabel === 'Huggy AI' ? 'Gemini 3 Pro' : modelLabel}</span>
              <span className="text-slate-400 text-[9px] font-black uppercase tracking-tight ml-0.5">Beta</span>
            </div>

            {/* Lens/Search */}
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all">
              <Search size={18} strokeWidth={2.5} />
            </button>

            {/* Magic */}
            <button className="w-9 h-9 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 hover:bg-[#4338CA] transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m11 11 5 5" />
                <path d="m14 11 3 3" />
                <path d="m11 14 3 3" />
                <path d="M11 11 9 9l-2 1 1 2 2-1Z" fill="currentColor" />
                <path d="M11 11v8l3-3 4 1-7-6Z" />
              </svg>
            </button>

            {/* More */}
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all">
              <MoreHorizontal size={20} strokeWidth={2.5} />
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2.5">
            {/* Mic */}
            <button
              onClick={() => setIsListening(!isListening)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                isListening 
                ? 'bg-rose-50 border-rose-200 text-rose-500 shadow-inner' 
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-[2px]">
                {[3, 5, 3].map((h, i) => (
                  <div 
                    key={i} 
                    className={`w-[2px] rounded-full transition-all duration-300 ${isListening ? 'bg-rose-400 animate-pulse' : 'bg-current'}`} 
                    style={{ height: isListening ? `${Math.random() * 12 + 6}px` : `${h * 3}px` }} 
                  />
                ))}
              </div>
            </button>

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all ${
                canSend 
                ? 'bg-[#4F46E5] hover:bg-[#3730A3] text-white shadow-xl shadow-indigo-600/40 active:scale-95' 
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUp size={22} strokeWidth={3} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Premium Disclaimer (Compact) */}
      {disclaimer && (
        <p className="text-[12px] text-slate-400 text-center leading-relaxed mt-1 font-medium tracking-tight px-4 max-w-sm">
          {disclaimer.replace('Acme', 'Huggy')}
        </p>
      )}
    </div>
  );
}
