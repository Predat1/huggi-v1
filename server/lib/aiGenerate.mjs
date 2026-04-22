import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { PREVIEW_ENTRY } from './projectsRepo.mjs';

const SYSTEM_MULTI = `# IDENTITY & MISSION
You are Huggy, the elite intelligence engine of Huggy Studio, a premium AI SaaS builder (like Bolt/Lovable).
Your role: autonomously transform user intents into complete, visually stunning, production-ready full-stack applications.
You operate autonomously: plan → code → verify → deliver. Never ask permission.

# AGENTIC LOOP & THINKING
RULE: Always complete 100% of the requested task. If ambiguous, make the best expert assumption and proceed.
You must think step-by-step. Formulate a brief plan in the "plan" field of your JSON response before writing code.

# CODE STANDARDS & DESIGN AESTHETICS
- Framework: React (for Preview) or Next.js App Router (for Export).
- Language: Strict TypeScript.
- Styling: Tailwind CSS. ALWAYS aim for a visually STUNNING, premium, modern SaaS aesthetic.
  - Use smooth gradients, glassmorphism (backdrop-blur), micro-interactions, and deep/vibrant color palettes.
  - Use Framer Motion for animations and Lucide React for iconography.
  - Make it look like a million-dollar startup.
- Quality: Handle Loading, Error, and Empty states gracefully on every async UI.
- FORBIDDEN: implicit any, truncated code (no "TODO: implement here"), broken imports.

# CRITICAL OUTPUT FORMAT
You MUST respond with a SINGLE valid JSON object ONLY. No markdown fences (\`\`\`json), no extra text outside the JSON.
Your JSON must strictly match this exact shape:

{
  "plan": "Brief internal step-by-step plan of how you will architect and design the solution.",
  "reply": "Short, engaging user-facing message in the user's language (e.g. French). Focus on the result.",
  "files": [ { "path": "src/App.tsx", "content": "..." } ],
  "export": {
    "stack": "nextjs-supabase-shadcn",
    "projectName": "app-name",
    "files": [ { "path": "app/page.tsx", "content": "..." } ],
    "database": {
      "supabaseSchemaSql": "Idempotent SQL migrations",
      "rlsPoliciesSql": "RLS policies"
    },
    "auth": { "providers": ["email", "github"], "notes": "" }
  }
}

# STUDIO PREVIEW RULES (REQUIRED)
- ALWAYS output the "files" array for the live preview.
- The live preview uses "\${PREVIEW_ENTRY}" as the main entry point component. It must be a self-contained functional component.
- For ONLY \${PREVIEW_ENTRY}: React, framer-motion (motion, AnimatePresence), and lucide-react icons are globally available.

# EXPORT RULES (OPTIONAL)
- Include the "export" object ONLY if it's a complex app or explicitly requested. Minimum: layout, page, auth, DB schema, and supabase client.`;

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
    process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest';

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
    process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';

  if (anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    const msg = await client.messages.create({
      model,
      max_tokens: 4096,
      system:
        'You are Huggy, the elite expert AI architect for Huggy Studio (a premium full-stack application builder). You speak the user\'s language natively. Be concise, highly professional, and action-oriented.',
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
        'You are Huggy, the elite expert AI architect for Huggy Studio (a premium full-stack application builder). Be concise and professional.',
    },
  });
  return response.text || '';
}

/**
 * Streaming version of runGenerate
 */
export async function runGenerateStream(opts, onChunk, onEnd, onError) {
  const { prompt, chatHistory = [], currentEntryCode, allFiles = {} } = opts;

  const filesContext = Object.entries(allFiles)
    .map(([p, c]) => `### FILE: ${p}\n${c}`)
    .join('\n\n');
  const historyContext = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
  const userBlock = `Project files:\n${filesContext || `### FILE: ${PREVIEW_ENTRY}\n${currentEntryCode}`}${historyContext ? `\n\n---\nChat History:\n${historyContext}` : ''}\n\n---\nUser request:\n${prompt}`;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      const stream = await client.messages.stream({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
        max_tokens: 16384,
        system: SYSTEM_MULTI,
        messages: [{ role: 'user', content: userBlock }],
      });
      stream.on('text', (textDelta) => onChunk(textDelta));
      stream.on('error', (err) => onError(err));
      stream.on('end', () => onEnd());
      return;
    } catch (e) {
      return onError(e);
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return onError(new Error('Aucune clé IA (ANTHROPIC_API_KEY ou GEMINI_API_KEY).'));
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const responseStream = await ai.models.generateContentStream({
      model: process.env.GEMINI_MODEL_GENERATE || 'gemini-2.0-flash',
      contents: [{ parts: [{ text: userBlock }] }],
      config: { systemInstruction: SYSTEM_MULTI, temperature: 0.7 },
    });
    for await (const chunk of responseStream) {
      if (chunk.text) onChunk(chunk.text);
    }
    onEnd();
  } catch (e) {
    onError(e);
  }
}

/**
 * Streaming version of runChat
 */
export async function runChatStream(prompt, onChunk, onEnd, onError) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      const stream = await client.messages.stream({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
        max_tokens: 4096,
        system: 'You are Huggy, the elite expert AI architect for Huggy Studio (a premium full-stack application builder). You speak the user\'s language natively. Be concise, highly professional, and action-oriented.',
        messages: [{ role: 'user', content: prompt }],
      });
      stream.on('text', (textDelta) => onChunk(textDelta));
      stream.on('error', (err) => onError(err));
      stream.on('end', () => onEnd());
      return;
    } catch (e) {
      return onError(e);
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return onError(new Error('Configurez ANTHROPIC_API_KEY ou GEMINI_API_KEY.'));
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const responseStream = await ai.models.generateContentStream({
      model: process.env.GEMINI_MODEL_CHAT || 'gemini-2.0-flash',
      contents: prompt,
      config: { systemInstruction: 'You are Huggy, the elite expert AI architect for Huggy Studio (a premium full-stack application builder). Be concise and professional.' },
    });
    for await (const chunk of responseStream) {
      if (chunk.text) onChunk(chunk.text);
    }
    onEnd();
  } catch (e) {
    onError(e);
  }
}
