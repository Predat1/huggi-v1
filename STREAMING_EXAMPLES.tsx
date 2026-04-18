/**
 * Exemple d'intégration complète du ChatWindow avec StreamingService
 * 
 * Ce fichier montre comment utiliser les nouveaux composants
 * de chat avec le système de streaming dans votre application.
 */

import React, { useRef, useEffect, useState } from 'react';
import { StreamingChat, ChatWindow } from './components/ChatWindow';
import { ChatList, EmptyChatState } from './components/ChatMessage';
import { StreamStatusIndicator, StreamMetrics } from './components/StreamStatus';
import { StreamController, type ChatMessage } from './services/streamingService';
import { useToast } from './components/Toast';

/**
 * EXEMPLE 1: Utilisation simple avec StreamingChat
 * (Recommandé pour la plupart des cas)
 */
export function SimpleStreamingChatExample() {
  const streamControllerRef = useRef<StreamController | null>(null);

  useEffect(() => {
    // Initialiser le StreamController au montage
    streamControllerRef.current = new StreamController();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <StreamingChat
        streamController={streamControllerRef}
        onMessagesSend={(message) => {
          console.log('Message envoyé:', message);
        }}
        onError={(error) => {
          console.error('Erreur du chat:', error);
        }}
      />
    </div>
  );
}

/**
 * EXEMPLE 2: Chat personnalisé avec contrôle complet
 */
export function AdvancedChatExample() {
  const streamControllerRef = useRef<StreamController | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      content: "Bonjour ! Je suis Huggy. Comment puis-je vous aider ?",
      timestamp: new Date(),
      provider: 'claude',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamStatus, setStreamStatus] = useState<'idle' | 'streaming' | 'complete' | 'error'>('idle');
  const toast = useToast();

  useEffect(() => {
    streamControllerRef.current = new StreamController();
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !streamControllerRef.current) return;

    // Ajouter le message utilisateur
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Créer le placeholder pour la réponse AI
    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      sender: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      provider: 'claude',
    };
    setMessages((prev) => [...prev, assistantMessage]);

    setIsLoading(true);
    setStreamStatus('streaming');

    try {
      const startTime = Date.now();

      await streamControllerRef.current.streamChat(text, {
        onChunk: (chunk) => {
          // Ajouter le chunk au message
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },

        onComplete: (fullText) => {
          const duration = Date.now() - startTime;

          // Marquer comme complété et ajouter les métadonnées
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? {
                    ...msg,
                    isStreaming: false,
                    duration,
                    tokens: Math.ceil(fullText.length / 4), // Estimation approximative
                  }
                : msg
            )
          );

          setStreamStatus('complete');
          toast.success(`Réponse générée en ${(duration / 1000).toFixed(1)}s`);
        },

        onError: (error) => {
          setStreamStatus('error');
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? {
                    ...msg,
                    isStreaming: false,
                    content: `Erreur: ${error.message}`,
                  }
                : msg
            )
          );
          toast.error(error.message);
        },

        onStatusChange: (status) => {
          if (status === 'complete') {
            setIsLoading(false);
          }
        },
      });
    } catch (error) {
      setStreamStatus('error');
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error(message);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* En-tête */}
      <div className="border-b border-slate-200 p-4">
        <h1 className="text-xl font-bold text-slate-900">Huggy Studio Chat</h1>
        <p className="text-sm text-slate-600">Assisté par Claude AI</p>
      </div>

      {/* Indicateur de statut */}
      {streamStatus !== 'idle' && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <StreamStatusIndicator
            status={streamStatus}
            modelUsed="Claude 3.5 Sonnet"
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length > 0 ? (
          <ChatList messages={messages} isLoading={isLoading} />
        ) : (
          <EmptyChatState />
        )}
      </div>

      {/* Input area */}
      <ChatWindow
        messages={[]}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}

/**
 * EXEMPLE 3: Chat avec génération d'apps React
 */
export function AppGenerationChatExample() {
  const streamControllerRef = useRef<StreamController | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const toast = useToast();

  useEffect(() => {
    streamControllerRef.current = new StreamController();
  }, []);

  const handleGenerateApp = async (prompt: string) => {
    if (!streamControllerRef.current) return;

    const messageId = Date.now().toString();
    const appMessage: ChatMessage = {
      id: messageId,
      sender: 'assistant',
      content: '```jsx\n// Génération en cours...\n```',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, appMessage]);
    setIsLoading(true);

    try {
      const startTime = Date.now();
      let generatedAppCode = '';

      await streamControllerRef.current.streamAppGeneration(prompt, {
        framework: 'react',
        template: 'default',
      }, {
        onChunk: (chunk) => {
          generatedAppCode += chunk;

          // Mettre à jour le message avec le code générés
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    content: `\`\`\`jsx\n${generatedAppCode}\n\`\`\``,
                  }
                : msg
            )
          );
        },

        onComplete: (fullCode) => {
          const duration = Date.now() - startTime;

          setGeneratedCode(fullCode);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    isStreaming: false,
                    duration,
                  }
                : msg
            )
          );

          toast.success('Application générée avec succès !');
        },

        onError: (error) => {
          toast.error(`Erreur: ${error.message}`);
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex gap-4 bg-slate-50 p-4">
      {/* Chat */}
      <div className="flex-1 flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden">
        <ChatList messages={messages} isLoading={isLoading} />
        <ChatWindow
          messages={[]}
          onSendMessage={(text) => {
            const userMsg: ChatMessage = {
              id: Date.now().toString(),
              sender: 'user',
              content: text,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMsg]);
            handleGenerateApp(text);
          }}
          isLoading={isLoading}
          placeholder="Décrivez l'application que vous voulez générer..."
        />
      </div>

      {/* Aperçu du code */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col">
        <div className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-900">
          Aperçu du Code
        </div>
        <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-slate-700">
          {generatedCode || '// Le code généré s\'affichera ici...'}
        </pre>
      </div>
    </div>
  );
}

/**
 * EXEMPLE 4: Chat avec historique et persistance
 */
export function PersistentChatExample() {
  const streamControllerRef = useRef<StreamController | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Charger depuis localStorage
    const saved = localStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    streamControllerRef.current = new StreamController();
  }, []);

  // Sauvegarder l'historique quand les messages changent
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !streamControllerRef.current) return;

    // Ajouter le message utilisateur
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Créer le placeholder
    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      sender: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    setIsLoading(true);

    try {
      await streamControllerRef.current.streamChat(text, {
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        onComplete: () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, isStreaming: false } : msg
            )
          );
        },
        onError: (error) => {
          toast.error(error.message);
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Êtes-vous sûr de vouloir effacer l\'historique ?')) {
      setMessages([]);
      localStorage.removeItem('chatHistory');
      toast.success('Historique effacé');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-slate-200 px-4 py-3 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="font-semibold text-slate-900">Chat avec historique</h2>
          <p className="text-xs text-slate-500">{messages.length} messages</p>
        </div>
        <button
          onClick={handleClearHistory}
          className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Effacer l'historique
        </button>
      </div>

      {/* Chat */}
      <ChatList messages={messages} isLoading={isLoading} />
      <ChatWindow
        messages={[]}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
