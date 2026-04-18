import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { PREVIEW_ENTRY } from './projectsRepo.mjs';

const SYSTEM_MULTI = `You are an expert React + UI developer for the Huggy SaaS builder.

CRITICAL OUTPUT FORMAT: respond with a single JSON object ONLY, no markdown fences, no extra text.

You are working in TWO MODES at once:
1) "Studio preview" mode (required): Huggy live preview uses "${PREVIEW_ENTRY}" as the main component entry.
2) "Export" mode (optional but strongly preferred when user requests a real product): generate a full Next.js + Supabase + shadcn/ui project that is exportable & scalable.

Return this JSON shape:
{
  "files": [ { "path": "src/App.tsx", "content": "..." }, ... ],
  "reply": "short user-facing message in French or user's language",
  "export": {
    "stack": "nextjs-supabase-shadcn",
    "projectName": "string",
    "files": [ { "path": "app/page.tsx", "content": "..." }, ... ],
    "database": {
      "supabaseSchemaSql": "SQL migrations (idempotent if possible)",
      "rlsPoliciesSql": "ALTER TABLE ... ENABLE ROW LEVEL SECURITY; CREATE POLICY ...;"
    },
    "auth": {
      "providers": ["email", "github"],
      "notes": "short notes"
    }
  }
}

Rules for Studio preview (required):
- Always include "${PREVIEW_ENTRY}" as the main preview component (self-contained React arrow function or function component body).
- You may add more studio files (e.g. src/components/Foo.tsx) with valid imports between project files.
- For ONLY ${PREVIEW_ENTRY} you may use the legacy pattern: no imports; React, motion/AnimatePresence, and lucide-react icons are assumed in scope (Huggy live preview).
- Use Tailwind CSS class names. STRICT RULE: Always aim for a visually stunning, premium SaaS layout! Use Framer Motion for micro-interactions and Lucide React extensively for icons. Make it look like a million-dollar startup.

Rules for Export (when present):
- Must be a Next.js App Router project using TypeScript + Tailwind + shadcn/ui + lucide-react.
- Include at minimum:
  - app/layout.tsx
  - app/page.tsx
  - app/(auth)/sign-in/page.tsx (or similar)
  - app/api/health/route.ts
  - lib/supabaseClient.ts (browser client) and lib/supabaseServer.ts (server client helper)
  - middleware.ts for protected routes (if you add protected areas)
  - components/ui/button.tsx (and other shadcn components you actually use)
- Database SQL must include tables + indexes + enabling RLS + policies for per-user access (owner-based).
- Keep exports coherent: imports must resolve, routes must compile, and use env vars SUPABASE_URL / SUPABASE_ANON_KEY.

If the user only needs a small tweak, you can return a single file ${PREVIEW_ENTRY} and omit "export".`;

function extractJsonObject(text) {
  if (!text) return null;
  const t = text.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

function extractCodeBlock(text) {
  if (!text) return '';
  if (text.includes('```')) {
    const match = text.match(
      /```(?:json|javascript|typescript|jsx|tsx)?\n([\s\S]*?)\n```/,
    );
    return match ? match[1] : text.replace(/```[\s\S]*?```/g, '').trim();
  }
  return text.trim();
}

/**
 * @param {Object} opts
 * @param {string} opts.prompt
 * @param {string} opts.currentEntryCode
 * @param {Record<string, string>} [opts.allFiles]
 */
export async function runGenerate(opts) {
  const { prompt, chatHistory = [], currentEntryCode, allFiles = {} } = opts;

  const filesContext = Object.entries(allFiles)
    .map(([p, c]) => `### FILE: ${p}\n${c}`)
    .join('\n\n');

  const historyContext = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');

  const userBlock = `Project files:\n${filesContext || `### FILE: ${PREVIEW_ENTRY}\n${currentEntryCode}`}${historyContext ? `\n\n---\nChat History:\n${historyContext}` : ''}\n\n---\nUser request:\n${prompt}`;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const model =
    process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';

  if (anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    const msg = await client.messages.create({
      model,
      max_tokens: 16384,
      system: SYSTEM_MULTI,
      messages: [{ role: 'user', content: userBlock }],
    });
    const text = msg.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    const parsed = extractJsonObject(text);
    if (parsed?.files?.length) {
      return {
        files: parsed.files.map((f) => ({
          path: String(f.path).replace(/\\/g, '/'),
          content: String(f.content ?? ''),
        })),
        reply: parsed.reply || '',
        export: parsed.export || null,
        provider: 'anthropic',
      };
    }
    throw new Error(
      'Réponse Claude invalide : JSON avec tableau "files" attendu.',
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error(
      'Aucune clé IA : définissez ANTHROPIC_API_KEY (recommandé) ou GEMINI_API_KEY.',
    );
  }

  const genModel =
    process.env.GEMINI_MODEL_GENERATE || 'gemini-2.0-flash';
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const response = await ai.models.generateContent({
    model: genModel,
    contents: [{ parts: [{ text: userBlock }] }],
    config: {
      systemInstruction: SYSTEM_MULTI,
      temperature: 0.7,
    },
  });

  const raw = response.text || '';
  const parsed = extractJsonObject(raw) || extractJsonObject(extractCodeBlock(raw));
  if (parsed?.files?.length) {
    return {
      files: parsed.files.map((f) => ({
        path: String(f.path).replace(/\\/g, '/'),
        content: String(f.content ?? ''),
      })),
      reply: parsed.reply || '',
      export: parsed.export || null,
      provider: 'google',
    };
  }

  const code = extractCodeBlock(raw);
  if (code) {
    return {
      files: [{ path: PREVIEW_ENTRY, content: code }],
      reply: '',
      export: null,
      provider: 'google',
    };
  }

  throw new Error('Réponse modèle invalide.');
}

/**
 * @param {string} prompt
 */
export async function runChat(prompt) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const model =
    process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

  if (anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    const msg = await client.messages.create({
      model,
      max_tokens: 4096,
      system:
        'You are Huggy, AI assistant for the Huggy application builder SaaS. Concise, professional, same language as user.',
      messages: [{ role: 'user', content: prompt }],
    });
    return msg.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return "Configurez ANTHROPIC_API_KEY ou GEMINI_API_KEY sur le serveur.";
  }

  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const chatModel = process.env.GEMINI_MODEL_CHAT || 'gemini-2.0-flash';
  const response = await ai.models.generateContent({
    model: chatModel,
    contents: prompt,
    config: {
      systemInstruction:
        'You are Huggy, helpful AI for a full-stack builder. Be concise.',
    },
  });
  return response.text || '';
}
