/**
 * Appels IA via le serveur (/api/*).
 */

export type GenerateAppResult = {
  code: string;
  files: { path: string; content: string }[];
  reply: string;
  plan?: string;
  export?: {
    stack: 'nextjs-supabase-shadcn' | string;
    projectName?: string;
    files: { path: string; content: string }[];
    database?: {
      supabaseSchemaSql?: string;
      rlsPoliciesSql?: string;
    };
    auth?: {
      providers?: string[];
      notes?: string;
    };
  } | null;
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
  params: { 
    currentCode: string; 
    projectId?: string | null; 
    chatHistory?: {role: string, content: string}[];
    userId?: string;
    userEmail?: string;
  },
): Promise<GenerateAppResult> => {
  const data = await postJson<{
    code: string;
    files?: { path: string; content: string }[];
    reply?: string;
    plan?: string;
    export?: GenerateAppResult['export'];
    provider?: string;
  }>('/api/generate-app', {
    prompt,
    chatHistory: params.chatHistory,
    currentCode: params.currentCode,
    projectId: params.projectId || undefined,
    userId: params.userId,
    userEmail: params.userEmail,
  });

  return {
    code: data.code || '',
    files: data.files || [],
    reply: data.reply || '',
    plan: data.plan || '',
    export: data.export ?? null,
    provider: data.provider,
  };
};

/**
 * Auto-correction: send a broken code + error message back to the AI for fixing.
 * This mimics Antigravity's self-healing loop.
 */
export const requestAutoCorrection = async (
  brokenCode: string,
  errorMessage: string,
  params: {
    projectId?: string | null;
    userId?: string;
    userEmail?: string;
  },
): Promise<GenerateAppResult> => {
  const fixPrompt = `[AUTO-CORRECTION] The code I previously generated produced a runtime/syntax error in the live preview.\n\nError:\n${errorMessage}\n\nFix the code below so it renders without any errors. Return the corrected full code.\n\nBroken code:\n${brokenCode}`;

  return generateAppUpdate(fixPrompt, {
    currentCode: brokenCode,
    projectId: params.projectId,
    chatHistory: [],
    userId: params.userId,
    userEmail: params.userEmail,
  });
};

export const generateChatResponse = async (prompt: string): Promise<string> => {
  const data = await postJson<{ text?: string }>('/api/chat', { prompt });
  return data.text ?? '';
};

export const getMe = async (params: { userId: string; email?: string }): Promise<{ credits: number; is_pro: boolean; tier: string }> => {
  const qs = new URLSearchParams({ userId: params.userId, email: params.email || '' });
  const res = await fetch(`/api/me?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
