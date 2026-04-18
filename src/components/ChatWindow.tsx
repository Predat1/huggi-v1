import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader2, AlertCircle, Copy, CheckCircle2, Zap } from 'lucide-react';
import { StreamController, type ChatMessage } from '@/services/streamingService';

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
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-slate-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap size={24} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Bienvenue dans Huggy Studio</h3>
                <p className="text-slate-600 text-sm">
                  Décrivez l'app que vous voulez construire et je vais générer le code React pour vous.
                </p>
              </div>
            </motion.div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onCopy={() => copyToClipboard(msg.content, msg.id)}
                isCopied={copiedId === msg.id}
              />
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white p-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-transparent resize-none outline-none text-sm placeholder:text-slate-400 disabled:opacity-50"
              rows={1}
              style={{ maxHeight: '200px' }}
            />

            <motion.button
              whileHover={{ scale: isLoading || !input.trim() ? 1 : 1.05 }}
              whileTap={{ scale: isLoading || !input.trim() ? 1 : 0.95 }}
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 bottom-2 p-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </motion.button>
          </div>

          <p className="mt-2 text-xs text-slate-400 text-center">
            Appuyez sur Shift + Entrée pour une nouvelle ligne
          </p>
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-xl lg:max-w-2xl rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-slate-100 text-slate-900 rounded-bl-none'
        }`}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
          {message.isStreaming && (
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-block ml-1 w-2 h-4 bg-white rounded"
            />
          )}
        </div>

        <div
          className={`mt-2 flex items-center justify-between gap-2 text-xs ${
            isUser ? 'text-blue-100' : 'text-slate-500'
          }`}
        >
          <span className="flex items-center gap-1">
            {message.provider && (
              <>
                <span className="capitalize">{message.provider}</span>
                <span>•</span>
              </>
            )}
            {message.timestamp.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {!isUser && onCopy && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCopy}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              title="Copier"
            >
              {isCopied ? (
                <CheckCircle2 size={14} className="text-green-500" />
              ) : (
                <Copy size={14} />
              )}
            </motion.button>
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
