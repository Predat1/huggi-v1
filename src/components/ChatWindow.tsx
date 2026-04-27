import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader2, AlertCircle, Copy, CheckCircle2, Zap } from 'lucide-react';
import { StreamController, type ChatMessage } from '../services/streamingService';

type ChatWindowProps = {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  onError?: (error: Error) => void;
};

export function ChatWindow({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = 'Décrivez votre projet...',
  onError,
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#070708] relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hide relative z-10">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center max-w-xs">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-2xl">
                  <Zap size={32} className="text-blue-500" fill="currentColor" />
                </div>
                <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">Huggy Elite Studio</h3>
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                  Décrivez votre vision ci-dessous. Je m'occupe de la structure, du style et du code.
                </p>
              </div>
            </motion.div>
          ) : (
            messages.map((msg) => (
              <React.Fragment key={msg.id}>
                <MessageBubble
                  message={msg}
                  onCopy={() => copyToClipboard(msg.content, msg.id)}
                  isCopied={copiedId === msg.id}
                />
              </React.Fragment>
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#09090B]/80 backdrop-blur-3xl border-t border-white/[0.03] relative z-20">
        <div className="max-w-4xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl opacity-0 group-focus-within:opacity-20 transition-opacity blur-sm" />
            <div className="relative rounded-2xl border border-white/5 bg-white/[0.02] focus-within:bg-white/[0.04] focus-within:border-blue-500/50 transition-all overflow-hidden shadow-2xl">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isLoading}
                className="w-full pl-5 pr-14 py-4 bg-transparent resize-none outline-none text-[13px] font-medium text-white placeholder:text-slate-600 disabled:opacity-50 min-h-[56px]"
                rows={1}
                style={{ maxHeight: '160px' }}
              />

              <div className="absolute right-2 bottom-2">
                <motion.button
                  whileHover={{ scale: isLoading || !input.trim() ? 1 : 1.05 }}
                  whileTap={{ scale: isLoading || !input.trim() ? 1 : 0.95 }}
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 disabled:bg-white/5 disabled:text-slate-600 transition-all shadow-xl shadow-blue-600/20"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </motion.button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-4">
             <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-help">
                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">IA Optimizée</span>
             </div>
             <div className="w-px h-2 bg-white/10" />
             <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
               Shift + Entrée pour un saut de ligne
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type MessageBubbleProps = {
  message: ChatMessage;
  onCopy?: () => void;
  isCopied?: boolean;
};

function MessageBubble({ message, onCopy, isCopied = false }: MessageBubbleProps) {
  const isUser = message.sender === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        <div
          className={`relative rounded-3xl px-5 py-3.5 text-[13px] font-medium leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-none shadow-2xl shadow-blue-600/20'
              : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/[0.05] backdrop-blur-xl'
          }`}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content}
            {message.isStreaming && (
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="inline-block ml-1 w-2 h-4 bg-blue-400 rounded-sm"
              />
            )}
          </div>

          {!isUser && onCopy && (
            <button
              onClick={onCopy}
              className="absolute -right-10 top-0 p-2 text-slate-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              title="Copier"
            >
              {isCopied ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2 px-1">
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
            {isUser ? 'Vous' : 'Huggy Elite'} • {message.timestamp.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {!isUser && message.provider && (
            <>
              <div className="w-1 h-1 rounded-full bg-slate-800" />
              <span className="text-[8px] font-black text-blue-500/50 uppercase tracking-tighter">
                Powered by {message.provider}
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

type StreamingChatProps = {
  onMessagesSend?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
  streamController?: React.MutableRefObject<StreamController | null>;
};

export function StreamingChat({
  onMessagesSend,
  onError,
  streamController,
}: StreamingChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      content: "Bonjour ! Je suis Huggy, votre assistant de design intelligent. Que souhaitez-vous construire aujourd'hui ?",
      timestamp: new Date(),
      provider: 'claude',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Ajouter le message de l'utilisateur
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    onMessagesSend?.(userMessage);

    // Ajouter le placeholder pour la réponse AI
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      sender: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(true);

    try {
      if (!streamController?.current) {
        throw new Error('Stream controller non initialisé');
      }

      const controller = streamController.current;

      await controller.streamChat(text, {
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg,
            ),
          );
        },
        onComplete: (fullText) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, isStreaming: false, provider: 'claude' }
                : msg,
            ),
          );
        },
        onError: (error) => {
          onError?.(error);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: `Erreur: ${error.message}`,
                    isStreaming: false,
                  }
                : msg,
            ),
          );
        },
        onStatusChange: (status) => {
          setIsLoading(status === 'streaming');
        },
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatWindow
      messages={messages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      onError={onError}
    />
  );
}
