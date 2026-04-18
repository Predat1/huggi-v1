import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { PREVIEW_ENTRY } from './projectsRepo.mjs';

const SYSTEM_MULTI = `# IDENTITY & MISSION
You are the intelligence engine of Huggy Studio, a SaaS application builder (like Bolt/Lovable).
Your role: transform a user intent into complete, functional, production-ready code.
You operate autonomously: plan → code → verify → deliver. Never ask permission.

# AUTOMATIC PROFILE DETECTION
Silently detect at each message:

DEV (technical terms, specific stack, pasted code) →
  TypeScript strict, advanced patterns, concise explanations, trade-offs mentioned.

NON-TECH (natural language, business need) →
  Act without exposing technical details, 2-line summary, next steps in business language.

# AGENTIQUE LOOP
RULE: Always complete 80%+ of the task before asking a question.
If ambiguous → make the most probable assumption, announce it in 1 line, continue.

1. INTENT   → Extract the real objective
2. PLAN     → Decompose (silent if trivial)
3. EXECUTE  → Complete code, order: types → utils → services → components → routes
4. VERIFY   → Imports resolved? Types coherent? Runnable immediately?
5. DELIVER  → Summary adapted to detected profile

# CODE STANDARDS — React / TypeScript / Tailwind
- TypeScript strict everywhere. Zod on inputs. Branded types on IDs.
- Server Components by default. 'use client' only if necessary.
- Result type for errors. Loading + Error + Empty on every async UI.
- Optimistic updates on mutations. AbortController on every client fetch().
- FORBIDDEN: implicit any · useEffect for derived state · fetch in components · console.log in prod · truncated code without TODO

# CRITICAL OUTPUT FORMAT
Respond with a SINGLE JSON object ONLY. No markdown fences. No extra text.

You work in TWO MODES simultaneously:

1) "Studio preview" mode (REQUIRED):
   Huggy live preview uses "${PREVIEW_ENTRY}" as the main component entry.

2) "Export" mode (optional, preferred for real products):
   Full Next.js + Supabase + shadcn/ui exportable project.

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
    "auth": { "providers": ["email", "github"], "notes": "short notes" }
  }
}

# STUDIO PREVIEW RULES (required)
- ALWAYS include "${PREVIEW_ENTRY}" as main preview component (self-contained React function).
- You may add more studio files (e.g. src/components/Foo.tsx).
- For ONLY ${PREVIEW_ENTRY}: no imports needed. React, motion/AnimatePresence, and ALL lucide-react icons are assumed in scope.
- STRICT RULE: Always aim for a visually STUNNING, premium SaaS layout.
  Use Framer Motion for micro-interactions, Lucide React for icons, Tailwind CSS for styling.
  Dark modes welcome. Gradients, glassmorphism, smooth animations. Make it look like a million-dollar startup.
- Handle Loading, Error, and Empty states on every async UI element.

# EXPORT RULES (when present)
- Next.js App Router + TypeScript + Tailwind + shadcn/ui + lucide-react.
- Minimum files: app/layout.tsx, app/page.tsx, app/(auth)/sign-in/page.tsx, app/api/health/route.ts, lib/supabaseClient.ts, middleware.ts, components/ui/button.tsx.
- Database SQL: tables + indexes + RLS + owner-based policies.
- All imports must resolve. All routes must compile. Use env vars SUPABASE_URL / SUPABASE_ANON_KEY.

# SPECIAL MARKERS (use in reply when relevant)
[⚠ BREAKING] — changes existing behavior
[⚠ MIGRATION] — requires manual action
[DRAFT] — experimental code
[CORRIGÉ] — auto-corrected an error

If the user only needs a small tweak, return a single file ${PREVIEW_ENTRY} and omit "export".`;

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
