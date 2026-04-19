import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Copy, CheckCircle2, Code2, Sparkles } from 'lucide-react';

export interface ChatMessageProps {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp?: Date;
  provider?: 'claude' | 'gemini';
  isStreaming?: boolean;
  tokens?: number;
  duration?: number;
}

interface MessageBubbleProps {
  message: ChatMessageProps;
  onCopy?: () => void;
  isCopied?: boolean;
  key?: string | number;
}

export function MessageBubble({ message, onCopy, isCopied = false }: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const hasCode = message.content.includes('```');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">
          <Sparkles size={14} />
        </div>
      )}

      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-2 max-w-2xl`}>
        {/* Bubble Message */}
        <div
          className={`relative px-4 py-3 rounded-lg break-words transition-shadow ${
            isUser
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none shadow-md hover:shadow-lg'
              : hasCode
                ? 'bg-slate-800 text-slate-100 rounded-bl-none font-mono text-sm'
                : 'bg-slate-100 text-slate-900 rounded-bl-none shadow-sm hover:shadow-md'
          }`}
        >
          {hasCode && !isUser ? (
            <CodeContent content={message.content} />
          ) : (
            <TextContent content={message.content} isStreaming={message.isStreaming} />
          )}

          {/* Streaming indicator */}
          {message.isStreaming && (
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`inline-block ml-1 w-2 h-4 rounded ${isUser ? 'bg-white' : 'bg-blue-500'}`}
            />
          )}
        </div>

        {/* Metadata */}
        <div className={`flex items-center gap-2 text-xs ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-slate-500">
            {message.timestamp?.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {message.provider && (
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              <span className="capitalize text-xs">{message.provider}</span>
            </span>
          )}

          {message.tokens && (
            <span className="text-slate-400 text-xs">
              • {message.tokens} tokens
            </span>
          )}

          {message.duration && (
            <span className="text-slate-400 text-xs">
              • {(message.duration / 1000).toFixed(1)}s
            </span>
          )}

          {!isUser && onCopy && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCopy}
              className="p-1 rounded hover:bg-slate-200 transition-colors ml-2"
              title="Copier"
            >
              {isCopied ? (
                <CheckCircle2 size={14} className="text-green-500" />
              ) : (
                <Copy size={14} className="text-slate-500 hover:text-slate-700" />
              )}
            </motion.button>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-700 text-xs font-bold flex-shrink-0 mt-1">
          V
        </div>
      )}
    </motion.div>
  );
}

interface TextContentProps {
  content: string;
  isStreaming?: boolean;
}

function TextContent({ content, isStreaming }: TextContentProps) {
  const [displayedContent, setDisplayedContent] = useState('');

  useEffect(() => {
    // Animation de révélation du texte pour les messages qui viennent d'être complétés
    if (!isStreaming && content.length > displayedContent.length) {
      const timer = setTimeout(() => {
        setDisplayedContent(content);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [content, displayedContent, isStreaming]);

  const textToDisplay = isStreaming ? content : displayedContent || content;

  return <p className="whitespace-pre-wrap leading-relaxed">{textToDisplay}</p>;
}

interface CodeContentProps {
  content: string;
}

function CodeContent({ content }: CodeContentProps) {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ type: 'code' | 'text'; language?: string; content: string }> = [];

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: content.substring(lastIndex, match.index),
      });
    }

    blocks.push({
      type: 'code',
      language: match[1] || 'jsx',
      content: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    blocks.push({
      type: 'text',
      content: content.substring(lastIndex),
    });
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, idx) =>
        block.type === 'code' ? (
          <CodeBlock
            key={idx}
            code={block.content}
            language={block.language || 'jsx'}
          />
        ) : block.content.trim() ? (
          <p key={idx} className="whitespace-pre-wrap leading-relaxed">
            {block.content}
          </p>
        ) : null,
      )}
    </div>
  );
}

interface CodeBlockProps {
  code: string;
  language: string;
  key?: string | number;
}

function CodeBlock({ code, language = 'jsx' }: CodeBlockProps) {
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 rounded overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-700">
        <span className="text-xs font-mono text-slate-400">{language}</span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
        >
          {isCopied ? (
            <>
              <CheckCircle2 size={12} className="text-green-400" />
              Copié
            </>
          ) : (
            <>
              <Copy size={12} />
              Copier
            </>
          )}
        </motion.button>
      </div>

      <pre className="p-4 overflow-x-auto">
        <code className="text-xs leading-relaxed font-mono text-slate-200">
          {code}
        </code>
      </pre>
    </div>
  );
}

interface ChatListProps {
  messages: ChatMessageProps[];
  isLoading?: boolean;
  onCopyMessage?: (messageId: string) => void;
}

export function ChatList({
  messages,
  isLoading = false,
  onCopyMessage,
}: ChatListProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCopy = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    onCopyMessage?.(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-4 px-4 py-6">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onCopy={() => handleCopy(message.id, message.content)}
          isCopied={copiedId === message.id}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}

export function EmptyChatState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Code2 size={32} className="text-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          Bienvenue dans Huggy Studio
        </h3>
        <p className="text-slate-600 text-sm">
          Décrivez votre projet en détail et je vais générer le code React prêt à l'emploi.
        </p>
      </div>
    </div>
  );
}
