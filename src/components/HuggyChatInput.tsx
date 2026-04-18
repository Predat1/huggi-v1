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
  disclaimer = 'Huggy may make mistakes. Please use with discretion.',
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
    <div className={`flex flex-col items-center gap-2 w-full ${className}`}>
      {/* ── Main input card ── */}
      <div
        className="w-full rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: '#1C1C1E' }}
      >
        {/* Tag row */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {tags.map((tag) => (
              <TagPill key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} />
            ))}
          </div>
        )}

        {/* Textarea */}
        <div className="px-5 pt-4 pb-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={placeholder}
            rows={1}
            className="w-full bg-transparent text-white text-[18px] font-medium placeholder-white/25 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
            style={{ caretColor: '#7F77DD', minHeight: '32px' }}
          />
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between px-4 pb-4 pt-1">
          {/* Left side */}
          <div className="flex items-center gap-1">
            {/* Plus */}
            <button
              type="button"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/8 transition-all"
              aria-label="Attach"
            >
              <Plus size={20} />
            </button>

            {/* Model badge */}
            <button
              type="button"
              className="flex items-center gap-2 px-3.5 h-9 rounded-xl hover:bg-white/8 transition-all group"
              aria-label="Select model"
            >
              {/* Gemini-style colorful icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gem-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#7F77DD" />
                    <stop offset="50%" stopColor="#378ADD" />
                    <stop offset="100%" stopColor="#1D9E75" />
                  </linearGradient>
                </defs>
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="url(#gem-grad)" />
                <path d="M12 6L9 12L12 18L15 12L12 6Z" fill="url(#gem-grad)" />
              </svg>
              <span className="text-white/80 text-[13px] font-semibold group-hover:text-white transition-colors">{modelLabel}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-white/50 text-[10px] font-bold">Beta</span>
            </button>

            {/* Search */}
            <button
              type="button"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/8 transition-all"
              aria-label="Search"
            >
              <Search size={17} />
            </button>

            {/* Sparkles/Magic */}
            <button
              type="button"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
              aria-label="Magic"
            >
              <Sparkles size={17} />
            </button>

            {/* More */}
            <button
              type="button"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/8 transition-all"
              aria-label="More options"
            >
              <MoreHorizontal size={17} />
            </button>
          </div>

          {/* Right side — mic + send */}
          <div className="flex items-center gap-2.5">
            {/* Mic / audio */}
            <button
              type="button"
              onClick={() => setIsListening((v) => !v)}
              className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${
                isListening
                  ? 'border-violet-400/60 bg-violet-500/20 text-violet-300'
                  : 'border-white/15 text-white/40 hover:text-white/70 hover:border-white/25'
              }`}
              aria-label="Voice input"
            >
              {isListening ? (
                /* Waveform bars */
                <span className="flex items-end gap-[2px] h-5">
                  {[3, 5, 7, 5, 3].map((h, i) => (
                    <span
                      key={i}
                      className="w-[2.5px] rounded-full bg-violet-400 animate-bounce"
                      style={{ height: `${h * 2.5}px`, animationDelay: `${i * 0.08}s` }}
                    />
                  ))}
                </span>
              ) : (
                <Mic size={18} />
              )}
            </button>

            {/* Send button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all font-bold shadow-lg ${
                canSend
                  ? 'bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-indigo-600/30 active:scale-95'
                  : 'bg-white/8 text-white/20 cursor-not-allowed'
              }`}
              aria-label="Send"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUp size={20} strokeWidth={3} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      {disclaimer && (
        <p className="text-[12px] text-white/25 text-center leading-relaxed mt-1">{disclaimer}</p>
      )}
    </div>
  );
}
