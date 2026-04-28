import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  ArrowUp,
  X,
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

const TYPEWRITER_EXAMPLES = [
  "Créez un dashboard SaaS pour startups...",
  "Bâtissez un CRM immobilier avec suivi client...",
  "Générez un portfolio premium avec mode sombre...",
  "Créez une boutique e-commerce full-stack...",
  "Développez un outil collaboratif comme Slack...",
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
  const [placeholderText, setPlaceholderText] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Typewriter effect
  useEffect(() => {
    const currentFull = TYPEWRITER_EXAMPLES[placeholderIndex];
    let timeout: any;

    if (isDeleting) {
      timeout = setTimeout(() => {
        setPlaceholderText(prev => prev.slice(0, -1));
        if (placeholderText === '') {
          setIsDeleting(false);
          setPlaceholderIndex((prev) => (prev + 1) % TYPEWRITER_EXAMPLES.length);
        }
      }, 30);
    } else {
      timeout = setTimeout(() => {
        setPlaceholderText(currentFull.slice(0, placeholderText.length + 1));
        if (placeholderText === currentFull) {
          timeout = setTimeout(() => setIsDeleting(true), 2500);
        }
      }, 70);
    }

    return () => clearTimeout(timeout);
  }, [placeholderText, isDeleting, placeholderIndex]);

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
    <div className={`flex flex-col w-full ${className}`}>
      <div className="relative w-full rounded-2xl bg-white/5 border border-white/5 focus-within:border-white/10 transition-all p-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={placeholderText}
          rows={1}
          className="w-full bg-transparent text-white text-[13px] font-medium placeholder-white/20 resize-none focus:outline-none leading-relaxed disabled:opacity-50 min-h-[60px]"
          style={{ caretColor: '#6366F1' }}
        />
        
        <div className="flex items-center justify-between mt-2">
           <div className="flex items-center gap-1">
              <button className="p-1.5 text-white/20 hover:text-white/60 transition-colors">
                 <Plus size={16} />
              </button>
              <button className={`p-1.5 transition-colors ${isListening ? 'text-rose-500' : 'text-white/20 hover:text-white/60'}`} onClick={() => setIsListening(!isListening)}>
                 <Mic size={16} />
              </button>
           </div>

           <button
             onClick={handleSend}
             disabled={!canSend}
             className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
               canSend 
               ? 'bg-white/10 text-white hover:bg-white/20' 
               : 'text-white/10 cursor-not-allowed'
             }`}
           >
             {isLoading ? (
               <Loader2 size={14} className="animate-spin" />
             ) : (
               <ArrowUp size={18} />
             )}
           </button>
        </div>
      </div>
    </div>
  );
}
