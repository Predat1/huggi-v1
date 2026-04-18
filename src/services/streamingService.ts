/**
 * Service de streaming AI avec support SSE
 * Génère des réponses en temps réel avec callbacks
 */

export type StreamOptions = {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
};

export type ChatMessage = {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  provider?: string;
};

export type StreamingResponse = {
  text: string;
  isComplete: boolean;
  provider?: string;
};

/**
 * Stream une réponse de chat en temps réel
 */
export async function streamChatResponse(
  prompt: string,
  options: StreamOptions = {},
): Promise<string> {
  const { onChunk, onComplete, onError, signal } = options;

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Impossible de lire la réponse du serveur');
    }

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      onChunk?.(chunk);
    }

    // Traiter le dernier chunk
    const final = decoder.decode();
    if (final) {
      fullText += final;
      onChunk?.(final);
    }

    onComplete?.(fullText);
    return fullText;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    throw err;
  }
}

/**
 * Stream une génération d'app React en temps réel
 */
export async function streamAppGeneration(
  prompt: string,
  params: {
    currentCode?: string;
    projectId?: string | null;
  },
  options: StreamOptions = {},
): Promise<string> {
  const { onChunk, onComplete, onError, signal } = options;

  try {
    const response = await fetch('/api/generate-app/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        currentCode: params.currentCode || '',
        projectId: params.projectId || undefined,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Impossible de lire la réponse du serveur');
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Traiter les lignes complètes
      const lines = buffer.split('\n');
      buffer = lines[lines.length - 1];

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Traiter SSE format: data: {...}
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const chunk = data.content || data.text || '';
            fullText += chunk;
            onChunk?.(chunk);
          } catch {
            // Ignorer les chunks mal formés
          }
        }
      }
    }

    // Traiter le dernier chunk
    const final = decoder.decode();
    if (final) {
      fullText += final;
      onChunk?.(final);
    }

    onComplete?.(fullText);
    return fullText;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    throw err;
  }
}

/**
 * Classe pour gérer un stream avec état
 */
export class StreamController {
  private abortController: AbortController | null = null;
  private isStreaming = false;
  private fullText = '';

  async streamChat(
    prompt: string,
    callbacks: {
      onChunk?: (chunk: string) => void;
      onComplete?: (text: string) => void;
      onError?: (error: Error) => void;
      onStatusChange?: (status: 'idle' | 'streaming' | 'complete' | 'error') => void;
    },
  ): Promise<string> {
    if (this.isStreaming) {
      throw new Error('Un stream est déjà en cours');
    }

    this.abortController = new AbortController();
    this.isStreaming = true;
    this.fullText = '';

    callbacks.onStatusChange?.('streaming');

    try {
      const text = await streamChatResponse(prompt, {
        onChunk: (chunk) => {
          this.fullText += chunk;
          callbacks.onChunk?.(chunk);
        },
        onComplete: (fullText) => {
          this.fullText = fullText;
          callbacks.onComplete?.(fullText);
          callbacks.onStatusChange?.('complete');
        },
        onError: (error) => {
          callbacks.onError?.(error);
          callbacks.onStatusChange?.('error');
        },
        signal: this.abortController.signal,
      });

      return text;
    } finally {
      this.isStreaming = false;
      this.abortController = null;
    }
  }

  async streamAppGeneration(
    prompt: string,
    params: { currentCode?: string; projectId?: string | null },
    callbacks: {
      onChunk?: (chunk: string) => void;
      onComplete?: (text: string) => void;
      onError?: (error: Error) => void;
      onStatusChange?: (status: 'idle' | 'streaming' | 'complete' | 'error') => void;
    },
  ): Promise<string> {
    if (this.isStreaming) {
      throw new Error('Un stream est déjà en cours');
    }

    this.abortController = new AbortController();
    this.isStreaming = true;
    this.fullText = '';

    callbacks.onStatusChange?.('streaming');

    try {
      const text = await streamAppGeneration(prompt, params, {
        onChunk: (chunk) => {
          this.fullText += chunk;
          callbacks.onChunk?.(chunk);
        },
        onComplete: (fullText) => {
          this.fullText = fullText;
          callbacks.onComplete?.(fullText);
          callbacks.onStatusChange?.('complete');
        },
        onError: (error) => {
          callbacks.onError?.(error);
          callbacks.onStatusChange?.('error');
        },
        signal: this.abortController.signal,
      });

      return text;
    } finally {
      this.isStreaming = false;
      this.abortController = null;
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.isStreaming = false;
    }
  }

  isActive(): boolean {
    return this.isStreaming;
  }

  getFullText(): string {
    return this.fullText;
  }
}
