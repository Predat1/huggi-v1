# Guide Complet du Streaming AI - Huggy Studio

## 📋 Vue d'ensemble

Ce guide explique comment utiliser le système de streaming AI professionnel que nous avons mis en place dans Huggy Studio. Le système combine le service de streaming SSE, les composants React animés, et l'intégration backend.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application React (UI)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐        ┌──────────────────────┐   │
│  │   ChatWindow.tsx     │        │  StreamingChat.tsx   │   │
│  │  - Input textarea    │◄──────►│  - Message state mgmt│   │
│  │  - Message display   │        │  - Stream callbacks  │   │
│  └──────────────────────┘        └──────────────────────┘   │
│           ▲                                                   │
│           │                                                   │
│  ┌────────┴──────────────────────────────────────────┐      │
│  │     ChatMessage.tsx & ChatList.tsx                │      │
│  │  - Message bubbles with animations                │      │
│  │  - Code syntax highlighting                       │      │
│  │  - Copy to clipboard functionality                │      │
│  └────────┬──────────────────────────────────────────┘      │
│           │                                                   │
│  ┌────────┴──────────────────────────────────────────┐      │
│  │     StreamStatusIndicator.tsx                     │      │
│  │  - Loading states                                 │      │
│  │  - Error handling                                 │      │
│  │  - Metrics display                                │      │
│  └──────────────────────────────────────────────────┘      │
│                      ▲                                       │
└──────────────────────┼───────────────────────────────────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
┌───────────▼──────────┐  ┌──────▼────────────────┐
│ streamingService.ts  │  │  StreamController     │
│                      │  │                       │
│ - streamChat()       │  │ - manage streaming    │
│ - stream AppGen()    │  │ - handle callbacks    │
│ - SSE parsing        │  │ - abort signals       │
└───────────┬──────────┘  └──────┬────────────────┘
            │                    │
            └────────┬───────────┘
                     │
          ┌──────────▼──────────┐
          │   Fetch API + SSE   │
          │   (Browser Native)  │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │  Express.js Backend │
          │                     │
          │  /api/chat/stream   │
          │  /api/gen-app/...   │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │  Anthropic Claude   │
          │  (AI Streaming API) │
          └─────────────────────┘
```

## 🚀 Utilisation rapide

### 1. Initialiser le StreamController dans App.tsx

```typescript
import { useRef, useEffect } from 'react';
import { StreamController } from '@/services/streamingService';
import { StreamingChat } from '@/components/ChatWindow';

export function App() {
  const streamControllerRef = useRef<StreamController | null>(null);

  useEffect(() => {
    streamControllerRef.current = new StreamController();
  }, []);

  return (
    <StreamingChat
      streamController={streamControllerRef}
      onMessagesSend={(message) => console.log('Message sent:', message)}
      onError={(error) => console.error('Chat error:', error)}
    />
  );
}
```

### 2. Configuration du Backend

Le backend Express doit implémenter les endpoints suivants :

```typescript
// POST /api/chat/stream
// POST /api/generate-app/stream
// POST /api/generate-app/stream/react
// POST /api/generate-app/stream/vue
```

## 📦 Composants disponibles

### ChatWindow
Composant principal pour afficher l'interface de chat.

```tsx
<ChatWindow
  messages={messages}
  onSendMessage={handleSendMessage}
  isLoading={isLoading}
  placeholder="Décrivez votre projet..."
  onError={handleError}
/>
```

**Props:**
- `messages`: Tableau de ChatMessage
- `onSendMessage`: (text: string) => void
- `isLoading`: booléen pour l'état de chargement
- `placeholder`: texte du placeholder
- `onError`: (error: Error) => void

### StreamingChat
Composant avec gestion complète du streaming.

```tsx
<StreamingChat
  streamController={streamControllerRef}
  onMessagesSend={handleMessage}
  onError={handleError}
/>
```

**Props:**
- `streamController`: useRef<StreamController>
- `onMessagesSend`: (message: ChatMessage) => void
- `onError`: (error: Error) => void

### ChatMessage & ChatList
Affichage des messages individuels et listes.

```tsx
<ChatList
  messages={messages}
  isLoading={isLoading}
  onCopyMessage={handleCopy}
/>
```

### StreamStatusIndicator
Indicateur visuel du statut de streaming.

```tsx
<StreamStatusIndicator
  status="streaming"
  message="Génération en cours..."
  modelUsed="Claude"
/>
```

## 🔄 Flux de streaming détaillé

### 1. Utilisateur envoie un message
```
Utilisateur tape "Crée une todo app React"
Clique sur le bouton Envoyer
```

### 2. Message stocké localement
```typescript
const userMessage: ChatMessage = {
  id: Date.now().toString(),
  sender: 'user',
  content: 'Crée une todo app React',
  timestamp: new Date(),
};
setMessages(prev => [...prev, userMessage]);
```

### 3. Créer le placeholder pour la réponse
```typescript
const assistantMessage: ChatMessage = {
  id: (Date.now() + 1).toString(),
  sender: 'assistant',
  content: '',
  timestamp: new Date(),
  isStreaming: true,
};
setMessages(prev => [...prev, assistantMessage]);
```

### 4. Appeler StreamController
```typescript
await streamController.streamChat(text, {
  onChunk: (chunk) => {
    // Mettre à jour le contenu du message avec le nouveau chunk
    setMessages(prev => prev.map(msg => 
      msg.id === assistantMessageId
        ? { ...msg, content: msg.content + chunk }
        : msg
    ));
  },
  onComplete: (fullText) => {
    // Marquer comme complété
    setMessages(prev => prev.map(msg =>
      msg.id === assistantMessageId
        ? { ...msg, isStreaming: false }
        : msg
    ));
  },
  onError: (error) => {
    // Gérer l'erreur
    console.error('Streaming error:', error);
  },
});
```

### 5. Backend reçoit la requête
```typescript
app.post('/api/chat/stream', async (req, res) => {
  const { message } = req.body;
  
  // Headers SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Appeler Claude avec streaming
  const stream = await anthropic.messages.stream({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [{ role: 'user', content: message }],
  });

  // Envoyer les chunks
  stream.on('text', (text) => {
    res.write(`data: ${JSON.stringify({
      chunk: text,
      type: 'text',
    })}\n\n`);
  });

  stream.on('end', () => {
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  });
});
```

### 6. Frontend parse les SSE events
```typescript
const response = await fetch(API_URL + '/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: text }),
  signal: abortSignal,
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.type === 'text') {
        onChunk(data.chunk);
      }
    }
  }
}
```

### 7. Affichage en temps réel
```
Le contenu s'ajoute progressivement au message
L'utilisateur voit le texte apparaître caractère par caractère
Le scroll s'ajuste automatiquement
```

## ⚙️ Configuration avancée

### Variables d'environnement

```env
# Frontend (.env.local)
VITE_API_URL=http://localhost:3001
VITE_CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Backend (.env)
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENAI_API_KEY=AIzaSy...
PORT=3001
```

### Options de streaming

```typescript
interface StreamOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: StreamStatus) => void;
  abortSignal?: AbortSignal;
  timeout?: number;
  retryCount?: number;
}
```

### StreamController API

```typescript
// Créer une instance
const controller = new StreamController();

// Écouter les statuts
controller.onStatusChange = (status) => {
  console.log(`Status: ${status}`);
};

// Streamer une réponse chat
await controller.streamChat(prompt, {
  onChunk: (chunk) => {},
  onComplete: (text) => {},
  onError: (error) => {},
});

// Streamer une génération d'app
await controller.streamAppGeneration(prompt, {
  framework: 'react',
  template: 'default',
}, {
  onChunk: (chunk) => {},
});

// Annuler le streaming actif
controller.cancel();

// Vérifier l'état
if (controller.isActive()) {
  const text = controller.getFullText();
}
```

## 🎨 Personnalisation de l'UI

### Thème des messages

Modifier les couleurs dans `ChatMessage.tsx`:

```typescript
const isUser
  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
  : 'bg-slate-100'
```

### Animation de typing

Modifier l'animation du curseur:

```typescript
<motion.span
  animate={{ opacity: [0.4, 1, 0.4] }}
  transition={{
    duration: 1.5,
    repeat: Infinity,
  }}
/>
```

### Format du timestamp

```typescript
message.timestamp.toLocaleTimeString('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit', // Ajouter les secondes
})
```

## 🐛 Dépannage

### Le streaming ne commence pas

1. ✅ Vérifier que le backend est lancé sur le bon port
2. ✅ Vérifier `VITE_API_URL` dans `.env.local`
3. ✅ Vérifier les logs du navigateur (F12 → Console)
4. ✅ Vérifier les headers de réponse (text/event-stream)

### Les messages ne s'affichent pas en temps réel

1. ✅ Vérifier que `onChunk` est appelé
2. ✅ Vérifier que `setMessages` met à jour l'état correctement
3. ✅ Vérifier le format du SSE event (`data: {...}\n\n`)
4. ✅ Vérifier la console pour les erreurs de JSON parsing

### Erreur CORS

```typescript
// Backend: ajouter le middleware CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Headers additionnels pour SSE
res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
```

### Timeout du streaming

Augmenter le timeout:

```typescript
await controller.streamChat(prompt, options, {
  timeout: 30000, // 30 secondes
});
```

## 📊 Métriques et monitoring

### Afficher les métriques

```tsx
<StreamMetrics
  tokensUsed={250}
  estimatedTokens={400}
  duration={3500}
  charsGenerated={1250}
/>
```

### Tracker les performances

```typescript
const startTime = Date.now();

await controller.streamChat(prompt, {
  onComplete: (text) => {
    const duration = Date.now() - startTime;
    const charsPerSecond = (text.length / duration * 1000).toFixed(1);
    console.log(`Generated ${text.length} chars in ${duration}ms (${charsPerSecond} chars/s)`);
  },
});
```

## 🔐 Sécurité

### Valider les inputs

```typescript
function validateChatInput(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  if (text.length > 5000) return false; // Max 5000 caractères
  return true;
}
```

### Limiter les requêtes

```typescript
// Rate limiting client-side
const [lastRequestTime, setLastRequestTime] = useState(0);

const handleSend = async (text: string) => {
  const now = Date.now();
  if (now - lastRequestTime < 500) return; // Min 500ms entre messages
  
  setLastRequestTime(now);
  // ... envoyer le message
};
```

### Nettoyer les ressources

```typescript
useEffect(() => {
  return () => {
    // Annuler le streaming en cours au démontage
    streamController.current?.cancel();
  };
}, []);
```

## 📚 Ressources

- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Fetch API Streams](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Readable_Streams)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Anthropic API Streaming](https://docs.anthropic.com/en/docs/basics/streaming)

## 📝 Checklist d'intégration

- [ ] StreamController initialisé dans App.tsx
- [ ] Backend endpoints `/api/chat/stream` et `/api/generate-app/stream` implémentés
- [ ] Headers SSE correctement configurés au backend
- [ ] CORS activé et configuré correctement
- [ ] VITE_API_URL configuré dans .env.local
- [ ] Composants importés depuis src/components/index.ts
- [ ] Callbacks SSE testés en local
- [ ] Tests sur mobile/responsive
- [ ] Tests d'annulation de streaming
- [ ] Tests de gestion d'erreurs
- [ ] Déploiement sur Railway
