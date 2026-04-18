/**
 * Guide d'intégration du ChatWindow avec Streaming Service
 * 
 * Ce fichier montre comment intégrer le nouveau composant ChatWindow
 * avec le service de streaming dans App.tsx
 */

/**
 * ÉTAPE 1: Importer les composants et services
 */

// Dans src/App.tsx, ajouter ces imports:
/*
import { StreamingChat } from './components/ChatWindow';
import { StreamController } from './services/streamingService';
*/

/**
 * ÉTAPE 2: Initialiser le StreamController dans App.tsx
 */

/*
export function App() {
  // ... autres states ...
  
  const streamControllerRef = useRef<StreamController | null>(null);

  useEffect(() => {
    // Initialiser le StreamController une fois au montage du composant
    streamControllerRef.current = new StreamController();
  }, []);

  // ... reste du code ...
}
*/

/**
 * ÉTAPE 3: Remplacer la section du chat dans le sidebar
 */

/*
// Avant (ancienne implémentation avec messages manuels):
<div className="flex-1 overflow-y-auto p-4 space-y-4">
  {messages.map((msg) => (
    <div key={msg.id} className={`flex ${msg.sender === 'VOUS' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs px-3 py-2 rounded-lg ${msg.sender === 'VOUS' ? 'bg-blue-500 text-white' : 'bg-slate-200'}`}>
        {msg.text}
      </div>
    </div>
  ))}
</div>

// Après (nouvelle implémentation avec streaming):
<StreamingChat
  ref={streamControllerRef}
  onMessagesSend={(message) => {
    // Optionnel: traitement additionnel quand un message est envoyé
    console.log('Message sent:', message);
  }}
  onError={(error) => {
    // Afficher toast d'erreur
    console.error('Chat error:', error);
  }}
  streamController={streamControllerRef}
/>
*/

/**
 * ÉTAPE 4: Points d'intégration clés
 */

const INTEGRATION_POINTS = {
  // 1. Le composant ChatWindow gère l'affichage du chat
  chatDisplay: `
    - Affichage des messages avec animations fluides
    - Support du streaming en temps réel
    - Copie de contenu avec indicateur visuel
    - Textarea auto-redimensionnable
    - Scroll automatique vers le dernier message
  `,

  // 2. Le service de streaming gère la communication backend
  streamingService: `
    - StreamController classe pour gérer l'état du streaming
    - streamChat() pour les réponses du chat
    - streamAppGeneration() pour la génération d'apps
    - Callbacks pour chaque chunk reçu
    - Gestion des erreurs et cancellation
  `,

  // 3. Connexion avec les endpoints backend
  backend: `
    - POST /api/chat/stream - réponses du chat en SSE
    - POST /api/generate-app/stream - génération d'apps en SSE
    - Les endpoints doivent supporter le format Server-Sent Events
  `,
};

/**
 * ÉTAPE 5: Personnalisation du ChatWindow
 */

/*
// Options de personnalisation disponibles:

<StreamingChat
  // Callback quand un message utilisateur est envoyé
  onMessagesSend={(message) => {
    // Peut être utilisé pour tracker analytics, sauvegarder en DB, etc.
  }}
  
  // Callback pour les erreurs
  onError={(error) => {
    // Afficher toast: Toast.error(error.message)
  }}
  
  // Référence au StreamController
  streamController={streamControllerRef}
/>

// Ou utiliser seulement ChatWindow sans streaming complet:

<ChatWindow
  messages={messages}
  onSendMessage={(text) => {
    // Votre logique d'envoi personnalisée
  }}
  isLoading={isLoading}
  placeholder="Votre placeholder personnalisé"
  onError={handleError}
/>
*/

/**
 * ÉTAPE 6: Configuration du backend
 */

/*
// Backend Express (exemple):

app.post('/api/chat/stream', (req, res) => {
  const { message } = req.body;
  
  // Configurer les headers SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Appeler Claude API avec streaming
  const stream = anthropic.messages.stream({
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

app.post('/api/generate-app/stream', (req, res) => {
  const { prompt, framework = 'react' } = req.body;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const stream = anthropic.messages.stream({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Génère une application ${framework} complète basée sur cette description: ${prompt}`,
      },
    ],
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
*/

/**
 * ÉTAPE 7: Dépannage
 */

const TROUBLESHOOTING = {
  probleme1: {
    titre: "Le streaming ne fonctionne pas",
    solution: `
      1. Vérifier que les endpoints /api/chat/stream et /api/generate-app/stream existent
      2. Vérifier les headers Content-Type: text/event-stream
      3. Vérifier que VITE_API_URL est configuré correctement dans .env
      4. Ouvrir les DevTools pour voir les erreurs réseau
    `,
  },
  probleme2: {
    titre: "Les messages ne s'affichent pas en temps réel",
    solution: `
      1. Vérifier que onChunk callback est appelé correctement
      2. Vérifier que setMessages est mise à jour avec les nouveaux chunks
      3. Vérifier la console browser pour les erreurs de parsing SSE
      4. Vérifier le format SSE: data: {JSON}\n\n
    `,
  },
  probleme3: {
    titre: "Le scroll n'est pas automatique",
    solution: `
      1. Vérifier que useEffect avec scrollToBottom est déclenché
      2. Vérifier que messagesEndRef.current existe
      3. Vérifier que le conteneur a overflow-y: auto
    `,
  },
};

/**
 * ÉTAPE 8: Tests recommandés
 */

const TESTING_CHECKLIST = [
  "✅ Test du streaming du chat en temps réel",
  "✅ Test de la génération d'apps en streaming",
  "✅ Test de l'annulation du streaming (cancel)",
  "✅ Test des erreurs réseau",
  "✅ Test du copier-coller",
  "✅ Test sur mobile/tablet",
  "✅ Test du scroll automatique",
  "✅ Test de la persévérance des messages (refresh page)",
  "✅ Test avec messages très longs",
  "✅ Test avec images/code blocks",
];

/**
 * ÉTAPE 9: Améliorations futures
 */

const FUTURE_IMPROVEMENTS = [
  "- Persistence des messages en localStorage ou DB",
  "- Historique des conversations",
  "- Export/sauvegarde des conversations",
  "- Markdown rendering avec syntax highlighting",
  "- Support des fichiers à uploader",
  "- Voice-to-text pour le chat",
  "- Édition des messages envoyés",
  "- Suppression de messages",
  "- Partage de conversations",
  "- Rate limiting et usage stats",
];

export {
  INTEGRATION_POINTS,
  TROUBLESHOOTING,
  TESTING_CHECKLIST,
  FUTURE_IMPROVEMENTS,
};
