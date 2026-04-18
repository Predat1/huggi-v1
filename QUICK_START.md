# 🚀 Quick Start Guide - Streaming AI Chat

## Installation en 5 minutes

### Étape 1: Installation des dépendances
```bash
cd huggi-v1
npm install
```

### Étape 2: Configuration de l'environnement

Créer `.env.local`:
```env
VITE_API_URL=http://localhost:3001
VITE_CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### Étape 3: Lancer le serveur de développement

Terminal 1 - Frontend:
```bash
npm run dev
```

Terminal 2 - Backend:
```bash
npm run server
# ou
node server.js
```

### Étape 4: Ouvrir dans le navigateur
```
http://localhost:3000
```

## Usage basique en 10 lignes

```tsx
import { useRef, useEffect } from 'react';
import { StreamingChat } from '@/components/ChatWindow';
import { StreamController } from '@/services/streamingService';

export function MyChat() {
  const streamControllerRef = useRef<StreamController | null>(null);

  useEffect(() => {
    streamControllerRef.current = new StreamController();
  }, []);

  return <StreamingChat streamController={streamControllerRef} />;
}
```

## Backend requis - Endpoint SSE

```javascript
// backend/routes/chat.js
app.post('/api/chat/stream', async (req, res) => {
  const { message } = req.body;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = await anthropic.messages.stream({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [{ role: 'user', content: message }],
  });

  stream.on('text', (text) => {
    res.write(`data: ${JSON.stringify({ chunk: text, type: 'text' })}\n\n`);
  });

  stream.on('error', (error) => {
    res.write(`data: ${JSON.stringify({ error: error.message, type: 'error' })}\n\n`);
    res.end();
  });

  stream.on('end', () => {
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  });
});
```

## Composants disponibles

### ChatWindow
```tsx
<ChatWindow
  messages={messages}
  onSendMessage={handleSend}
  isLoading={isLoading}
  placeholder="Décrivez votre idée..."
/>
```

### StreamingChat (recommandé)
```tsx
<StreamingChat
  streamController={streamControllerRef}
  onError={handleError}
/>
```

### ChatList
```tsx
<ChatList
  messages={messages}
  isLoading={isLoading}
  onCopyMessage={handleCopy}
/>
```

## Types utiles

```typescript
import type {
  ChatMessage,
  StreamStatus,
  StreamOptions,
  StreamAppGenerationParams,
} from '@/types/streaming';
import { StreamController } from '@/services/streamingService';
```

## Debugging

### Voir les SSE events
```javascript
// Dans la console du navigateur (F12)
const eventSource = new EventSource('/api/chat/stream');
eventSource.onmessage = (e) => console.log(e.data);
```

### Vérifier le backend
```bash
curl -X POST http://localhost:3001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Bonjour"}' \
  -N
```

### Logs du streaming
```typescript
// Ajouter des logs dans streamingService.ts
console.log('[STREAM] Chunk:', chunk);
console.log('[STREAM] Status:', status);
```

## Problèmes courants

### "Cannot find module '@/services/streamingService'"
✅ Vérifier que `vite.config.ts` a l'alias:
```typescript
alias: {
  '@': fileURLToPath(new URL('./src', import.meta.url))
}
```

### "CORS error"
✅ Ajouter les headers CORS au backend:
```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### "Streaming stops after few chunks"
✅ Vérifier la limite de timeout du serveur
✅ Vérifier que le backend envoie tous les chunks

### "Messages don't update in real time"
✅ Vérifier que `onChunk` callback est appelé
✅ Vérifier que `setMessages` met à jour l'état

## Tests rapides

```typescript
// Test 1: Simple message
const testMessage = "Crée un bouton React avec Tailwind";

// Test 2: Code generation  
const testAppPrompt = "Crée une todo app avec React";

// Test 3: Long message (5000 caractères)
const longMessage = "A".repeat(5000);

// Test 4: Error handling
const errorMessage = ""; // Devrait être rejeté
```

## Configuration avancée

### Timeout personnalisé
```typescript
streamController.streamChat(prompt, {
  onChunk: (chunk) => {},
  onError: (error) => {},
}, {
  timeout: 60000 // 60 secondes
});
```

### Retry automatique
```typescript
streamController.streamChat(prompt, {
  onChunk: (chunk) => {},
}, {
  retryCount: 3,
  timeout: 30000
});
```

### Abort signal
```typescript
const abortController = new AbortController();

streamController.streamChat(prompt, {
  onChunk: (chunk) => {},
}, {
  abortSignal: abortController.signal
});

// Plus tard: arrêter le streaming
abortController.abort();
```

## Performance tips

1. **Message virtualization** - Si >100 messages:
   ```tsx
   import { FixedSizeList } from 'react-window';
   ```

2. **Debounce scroll events**:
   ```typescript
   const scrollToBottom = debounce(() => {
     messagesEndRef.current?.scrollIntoView();
   }, 100);
   ```

3. **Memoize messages**:
   ```typescript
   const memoizedMessages = useMemo(() => messages, [messages]);
   ```

## Fichiers importants

| Fichier | Ligne | Purpose |
|---------|------|---------|
| `src/components/ChatWindow.tsx` | 505 | Interface principale |
| `src/components/ChatMessage.tsx` | 380 | Affichage messages |
| `src/components/StreamStatus.tsx` | 180 | Statut indicateurs |
| `src/services/streamingService.ts` | 270+ | SSE streaming |
| `src/types/streaming.ts` | 450+ | Type definitions |
| `STREAMING_GUIDE.md` | 450+ | Guide complet |
| `STREAMING_EXAMPLES.tsx` | 400+ | 4 exemples |

## Documentation

- 📖 **STREAMING_GUIDE.md** - Guide complet avec schémas
- 🔧 **STREAMING_CHAT_INTEGRATION.md** - Backend examples
- 📝 **STREAMING_EXAMPLES.tsx** - Code examples
- 🎯 **STREAMING_IMPLEMENTATION_SUMMARY.md** - Vue d'ensemble

## Support

**Si ça ne marche pas:**
1. Vérifier les logs (F12 Console)
2. Vérifier le backend est lancé
3. Vérifier VITE_API_URL
4. Vérifier les endpoints SSE
5. Relancer `npm install`

**Ressources:**
- [Docs Claude API](https://docs.anthropic.com/)
- [SSE MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Framer Motion](https://www.framer.com/motion/)

---

**Happy streaming! 🚀**
