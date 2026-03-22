/**
 * Appels IA via le serveur (/api/*).
 */

export type GenerateAppResult = {
  code: string;
  files: { path: string; content: string }[];
  reply: string;
  provider?: string;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let data: (T & { error?: string }) | null = null;
  try {
    data = raw ? (JSON.parse(raw) as T & { error?: string }) : null;
  } catch {
    throw new Error(raw || res.statusText || `HTTP ${res.status}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || raw || res.statusText || `HTTP ${res.status}`);
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(data.error);
  }
  return data as T;
}

export const generateAppUpdate = async (
  prompt: string,
  params: { currentCode: string; projectId?: string | null },
): Promise<GenerateAppResult> => {
  const data = await postJson<{
    code: string;
    files?: { path: string; content: string }[];
    reply?: string;
    provider?: string;
  }>('/api/generate-app', {
    prompt,
    currentCode: params.currentCode,
    projectId: params.projectId || undefined,
  });

  return {
    code: data.code || '',
    files: data.files || [],
    reply: data.reply || '',
    provider: data.provider,
  };
};

export const generateChatResponse = async (prompt: string): Promise<string> => {
  const data = await postJson<{ text?: string }>('/api/chat', { prompt });
  return data.text ?? '';
};
