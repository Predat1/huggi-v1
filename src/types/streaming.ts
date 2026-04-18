/**
 * Types TypeScript pour le système de streaming AI
 * Ce fichier contient toutes les définitions de types utilisées
 */

/**
 * Types de messages du chat
 */
export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: 'claude' | 'gemini';
  isStreaming?: boolean;
  tokens?: number;
  duration?: number;
}

/**
 * Configuration du streaming
 */
export interface StreamOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: StreamStatus) => void;
  abortSignal?: AbortSignal;
  timeout?: number;
  retryCount?: number;
}

export interface StreamAppGenerationParams {
  framework?: 'react' | 'vue' | 'svelte' | 'angular';
  template?: 'default' | 'dashboard' | 'ecommerce' | 'blog';
  typescript?: boolean;
  tailwind?: boolean;
  libraries?: string[];
}

/**
 * Statut du streaming
 */
export type StreamStatus = 'idle' | 'streaming' | 'complete' | 'error' | 'cancelled';

/**
 * Réponse SSE du backend
 */
export interface SSEEvent {
  type: 'text' | 'done' | 'error' | 'status';
  chunk?: string;
  error?: string;
  status?: StreamStatus;
  metadata?: {
    tokensUsed?: number;
    estimatedTokens?: number;
    duration?: number;
  };
}

/**
 * Configuration du API
 */
export interface APIConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Résultat du streaming
 */
export interface StreamResult {
  text: string;
  tokens: number;
  duration: number;
  status: StreamStatus;
  provider: 'claude' | 'gemini';
}

/**
 * Erreur du streaming
 */
export interface StreamError extends Error {
  code?: string;
  status?: number;
  retryable?: boolean;
}

/**
 * Props pour ChatWindow
 */
export interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  onError?: (error: Error) => void;
  disabled?: boolean;
}

/**
 * Props pour ChatList
 */
export interface ChatListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  onCopyMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

/**
 * Props pour StreamStatusIndicator
 */
export interface StreamStatusIndicatorProps {
  status: StreamStatus;
  message?: string;
  modelUsed?: string;
}

/**
 * Props pour StreamMetrics
 */
export interface StreamMetricsProps {
  tokensUsed?: number;
  estimatedTokens?: number;
  duration?: number;
  charsGenerated?: number;
}

/**
 * Configuration globale du chat
 */
export interface ChatConfig {
  apiUrl: string;
  timeout: number;
  maxMessageLength: number;
  maxHistorySize: number;
  enablePersistence: boolean;
  persistenceKey: string;
  defaultModel: 'claude' | 'gemini';
  supportedModels: Array<'claude' | 'gemini'>;
}

/**
 * Événement du chat
 */
export interface ChatEvent {
  type: 'message_sent' | 'message_received' | 'message_error' | 'stream_started' | 'stream_completed';
  messageId?: string;
  timestamp: Date;
  data?: unknown;
}

/**
 * Listener pour les événements du chat
 */
export type ChatEventListener = (event: ChatEvent) => void;

/**
 * Convertisseur de message
 */
export interface MessageConverter {
  toJSON(message: ChatMessage): string;
  fromJSON(json: string): ChatMessage;
  toMarkdown(message: ChatMessage): string;
  toPlainText(message: ChatMessage): string;
}

/**
 * Validateur de message
 */
export interface MessageValidator {
  validate(message: ChatMessage): { valid: boolean; errors: string[] };
  validateContent(content: string): { valid: boolean; errors: string[] };
}

/**
 * État du composant ChatWindow
 */
export interface ChatWindowState {
  messages: ChatMessage[];
  inputValue: string;
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
}

/**
 * Props pour StreamingChat
 */
export interface StreamingChatProps {
  onMessagesSend?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
  streamController?: React.MutableRefObject<StreamController | null>;
  config?: Partial<ChatConfig>;
}

/**
 * Classe StreamController (définition de type)
 */
export interface StreamControllerInterface {
  streamChat(prompt: string, options?: StreamOptions): Promise<string>;
  streamAppGeneration(
    prompt: string,
    params?: StreamAppGenerationParams,
    options?: StreamOptions
  ): Promise<string>;
  cancel(): void;
  isActive(): boolean;
  getFullText(): string;
  onStatusChange?: (status: StreamStatus) => void;
}

/**
 * Middleware pour les intercepteurs de streaming
 */
export interface StreamingMiddleware {
  beforeStream?(prompt: string): Promise<string | void>;
  afterChunk?(chunk: string): string;
  onError?(error: Error): void;
}

/**
 * Options de cache
 */
export interface CacheOptions {
  enabled: boolean;
  ttl: number; // Time to live en millisecondes
  key: string;
}

/**
 * Résultat du cache
 */
export interface CacheResult<T> {
  hit: boolean;
  data?: T;
  age?: number; // Âge en millisecondes
}

/**
 * Logger pour le debugging
 */
export interface StreamLogger {
  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: Error): void;
}

/**
 * Configuration de retry
 */
export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Résultat avec retry info
 */
export interface ResultWithRetryInfo<T> {
  result: T;
  attempts: number;
  totalDuration: number;
  lastError?: Error;
}

/**
 * Configuration de rate limiting
 */
export interface RateLimitConfig {
  enabled: boolean;
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxConcurrentStreams: number;
}

/**
 * État de rate limiting
 */
export interface RateLimitState {
  requestCount: number;
  resetTime: Date;
  concurrentStreams: number;
  isLimited: boolean;
}

/**
 * Plug-in pour le streaming
 */
export interface StreamingPlugin {
  name: string;
  version: string;
  onInit?(controller: StreamControllerInterface): void;
  onBeforeStream?(prompt: string): Promise<void>;
  onAfterChunk?(chunk: string): string;
  onComplete?(text: string): void;
  onError?(error: Error): void;
}

/**
 * Registre de plug-ins
 */
export interface PluginRegistry {
  register(plugin: StreamingPlugin): void;
  unregister(name: string): void;
  getPlugin(name: string): StreamingPlugin | undefined;
  getAllPlugins(): StreamingPlugin[];
}
