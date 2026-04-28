import React, { useRef, useState, useEffect } from 'react';
import { StreamingChat } from './components/ChatWindow';
import { StreamController } from './services/streamingService';
import { FullAppStream } from './components/streaming';

/**
 * EXEMPLE 1 : Utilisation basique de StreamingChat
 * Cet exemple montre comment intégrer le chat de streaming avec un StreamController.
 */
export function BasicStreamingChatExample() {
  const streamControllerRef = useRef<StreamController | null>(null);

  useEffect(() => {
    // Initialisation du contrôleur
    if (!streamControllerRef.current) {
      streamControllerRef.current = new StreamController();
    }
  }, []);

  return (
    <div className="h-[600px] border border-slate-200 rounded-xl overflow-hidden shadow-lg">
      <StreamingChat 
        streamController={streamControllerRef} 
        onError={(err) => console.error('Streaming error:', err)}
      />
    </div>
  );
}

/**
 * EXEMPLE 2 : Utilisation avancée avec interception de messages
 * Cet exemple montre comment réagir aux messages envoyés par l'utilisateur.
 */
export function AdvancedStreamingChatExample() {
  const streamControllerRef = useRef<StreamController | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');

  useEffect(() => {
    if (!streamControllerRef.current) {
      streamControllerRef.current = new StreamController();
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs font-medium text-blue-700">
        Dernière requête : {lastUserMessage || 'aucune'}
      </div>
      <div className="h-[500px] border border-slate-200 rounded-xl overflow-hidden">
        <StreamingChat 
          streamController={streamControllerRef}
          onMessagesSend={(msg) => setLastUserMessage(msg.content)}
        />
      </div>
    </div>
  );
}

/**
 * EXEMPLE 3 : Utilisation de FullAppStream (Mode Expert)
 * Cet exemple montre comment intégrer la génération d'application complète.
 */
export function FullAppGenerationExample() {
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Générateur d'App Elite</h2>
        <button 
          onClick={() => setIsGenerating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
        >
          Nouvelle Génération
        </button>
      </div>

      {isGenerating && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-10">
          <div className="w-full max-w-5xl h-full max-h-[800px] bg-white rounded-[32px] overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setIsGenerating(false)}
              className="absolute top-6 right-6 z-10 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <FullAppStream 
              initialPrompt="Crée un dashboard SaaS avec Stripe et Supabase"
              onDone={(files) => {
                console.log('Génération terminée ! Fichiers :', files);
                setTimeout(() => setIsGenerating(false), 3000);
              }}
            />
          </div>
        </div>
      )}
      
      <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
        Cliquez sur le bouton pour démarrer la démo de génération agentique.
      </div>
    </div>
  );
}

/**
 * EXEMPLE 4 : Gestion manuelle du cycle de vie du stream
 */
export function ManualStreamLifecycleExample() {
  const streamControllerRef = useRef<StreamController>(new StreamController());
  const [status, setStatus] = useState<'idle' | 'streaming' | 'complete'>('idle');
  const [content, setContent] = useState('');

  const startStream = async () => {
    setStatus('streaming');
    setContent('');
    
    try {
      await streamControllerRef.current.streamChat('Explique-moi le concept de Server-Sent Events', {
        onChunk: (chunk) => setContent(prev => prev + chunk),
        onComplete: () => setStatus('complete'),
        onStatusChange: (s) => console.log('Status changed:', s)
      });
    } catch (err) {
      console.error('Stream failed:', err);
      setStatus('idle');
    }
  };

  const cancelStream = () => {
    streamControllerRef.current.cancel();
    setStatus('idle');
  };

  return (
    <div className="p-6 border border-slate-200 rounded-xl space-y-4">
      <div className="flex gap-2">
        <button 
          onClick={startStream} 
          disabled={status === 'streaming'}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50"
        >
          Démarrer le stream
        </button>
        <button 
          onClick={cancelStream} 
          disabled={status !== 'streaming'}
          className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
        >
          Annuler
        </button>
      </div>

      <div className="p-4 bg-slate-50 rounded-lg min-h-[200px] font-mono text-sm whitespace-pre-wrap border border-slate-200">
        {content || (status === 'streaming' ? 'Génération...' : 'En attente...')}
      </div>
    </div>
  );
}
