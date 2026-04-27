/**
 * AI generation engine.
 * Primary: Claude Sonnet 4.5 (code quality) | Haiku 4.5 (chat/fast tasks)
 * Fallback: Gemini 2.0 Flash
 * Features: Redis response cache, smart complexity-based model routing.
 */
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { PREVIEW_ENTRY } from './projectsRepo.mjs';
import { getCached, setCached, fingerprintFiles } from './aiCache.mjs';

// ─── Model constants ────────────────────────────────────────────────────────
const MODEL_CODE       = process.env.ANTHROPIC_MODEL      || 'claude-sonnet-4-5-20251001';
const MODEL_FAST       = process.env.ANTHROPIC_MODEL_FAST || 'claude-haiku-4-5-20251001';
const MODEL_GEMINI     = process.env.GEMINI_MODEL_GENERATE || 'gemini-2.0-flash';
const MODEL_GEMINI_CHAT = process.env.GEMINI_MODEL_CHAT   || 'gemini-2.0-flash';

/** Route to Haiku only for trivially short/simple modifications; Sonnet for everything else. */
function selectCodeModel(prompt = '', complexity = 'medium') {
  if (complexity === 'simple' && prompt.length < 150) return MODEL_FAST;
  return MODEL_CODE;
}

const SYSTEM_MULTI = `# IDENTITY & MISSION
You are Huggy, the elite intelligence engine of Huggy Studio — a premium AI SaaS builder (like Bolt/Lovable).
Transform user intents into complete, visually stunning, production-ready React applications.
Operate autonomously: plan → code → deliver. Never ask for permission.

# CODE STANDARDS
- Framework: React + strict TypeScript
- Styling: Tailwind CSS — premium SaaS look. Use gradients, glassmorphism, micro-interactions, deep color palettes.
- Animations: Framer Motion (motion, AnimatePresence). Icons: Lucide React.
- **SEO & Accessibility**: 
    - Use semantic HTML5 elements (header, main, section, footer, article).
    - Implement proper Meta Tags (Title, Description, OpenGraph) within the component logic or as a dedicated Seo.tsx component.
    - Ensure high contrast and screen reader compatibility.
- Always handle Loading, Error, and Empty states.
- FORBIDDEN: implicit any, truncated/partial code, broken imports, "TODO" placeholders.

# CRITICAL OUTPUT FORMAT
Respond with a SINGLE valid JSON object ONLY. No markdown fences. No text outside JSON.

{
  "plan": "Brief internal step-by-step architecture plan.",
  "reply": "Short engaging message to the user in their language (French if they wrote in French).",
  "files": [ { "path": "src/App.tsx", "content": "...full file content..." } ],
  "export": null
}

# PREVIEW RULES
- ALWAYS include the "files" array.
- "${PREVIEW_ENTRY}" is the main entry — must be a self-contained functional component.
- React, framer-motion, and lucide-react are globally available in preview.`;

function extractJsonObject(text) {
  if (!text) return null;
  const t = text.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
}

function extractCodeBlock(text) {
  if (!text) return '';
  if (text.includes('```')) {
    const match = text.match(/```(?:json|javascript|typescript|jsx|tsx)?\n([\s\S]*?)\n```/);
    return match ? match[1] : text.replace(/```[\s\S]*?```/g, '').trim();
  }
  return text.trim();
}

function normalizeFiles(files) {
  return files.map(f => ({ path: String(f.path).replace(/\\/g, '/'), content: String(f.content ?? '') }));
}

// ─── runGenerate (sync) ─────────────────────────────────────────────────────

export async function runGenerate(opts) {
  const { prompt, chatHistory = [], currentEntryCode, allFiles = {}, complexity } = opts;

  const filesContext = Object.entries(allFiles).map(([p, c]) => `### FILE: ${p}\n${c}`).join('\n\n');
  const historyContext = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
  const userBlock = `Project files:\n${filesContext || `### FILE: ${PREVIEW_ENTRY}\n${currentEntryCode}`}${historyContext ? `\n\n---\nChat History:\n${historyContext}` : ''}\n\n---\nUser request:\n${prompt}`;

  const model = selectCodeModel(prompt, complexity);
  const ctxFp = fingerprintFiles(allFiles);

  const cached = await getCached(model, prompt, ctxFp);
  if (cached) { console.log('[AI] Cache hit'); return { ...cached, fromCache: true }; }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    const msg = await client.messages.create({ model, max_tokens: 16384, system: SYSTEM_MULTI, messages: [{ role: 'user', content: userBlock }] });
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    const parsed = extractJsonObject(text);
    if (parsed?.files?.length) {
      const result = { files: normalizeFiles(parsed.files), reply: parsed.reply || '', export: parsed.export || null, provider: 'anthropic' };
      await setCached(model, prompt, ctxFp, result);
      return result;
    }
    throw new Error('Réponse Claude invalide : JSON avec tableau "files" attendu.');
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('Aucune clé IA : définissez ANTHROPIC_API_KEY ou GEMINI_API_KEY.');
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const response = await ai.models.generateContent({ model: MODEL_GEMINI, contents: [{ parts: [{ text: userBlock }] }], config: { systemInstruction: SYSTEM_MULTI, temperature: 0.7 } });
  const raw = response.text || '';
  const parsed = extractJsonObject(raw) || extractJsonObject(extractCodeBlock(raw));
  if (parsed?.files?.length) {
    const result = { files: normalizeFiles(parsed.files), reply: parsed.reply || '', export: parsed.export || null, provider: 'google' };
    await setCached(MODEL_GEMINI, prompt, ctxFp, result);
    return result;
  }
  const code = extractCodeBlock(raw);
  if (code) return { files: [{ path: PREVIEW_ENTRY, content: code }], reply: '', export: null, provider: 'google' };
  throw new Error('Réponse modèle invalide.');
}

// ─── runChat ────────────────────────────────────────────────────────────────

export async function runChat(prompt) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    const msg = await client.messages.create({
      model: MODEL_FAST, max_tokens: 2048,
      system: "You are Huggy, the elite AI architect for Huggy Studio. Be concise, professional, and speak the user's language.",
      messages: [{ role: 'user', content: prompt }],
    });
    return msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  }
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return 'Configurez ANTHROPIC_API_KEY ou GEMINI_API_KEY.';
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const response = await ai.models.generateContent({ model: MODEL_GEMINI_CHAT, contents: prompt, config: { systemInstruction: 'You are Huggy, the elite AI architect. Be concise and professional.' } });
  return response.text || '';
}

// ─── runGenerateStream ──────────────────────────────────────────────────────

export async function runGenerateStream(opts, onChunk, onEnd, onError) {
  const { prompt, chatHistory = [], currentEntryCode, allFiles = {}, complexity } = opts;

  const filesContext = Object.entries(allFiles).map(([p, c]) => `### FILE: ${p}\n${c}`).join('\n\n');
  const historyContext = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
  const userBlock = `Project files:\n${filesContext || `### FILE: ${PREVIEW_ENTRY}\n${currentEntryCode}`}${historyContext ? `\n\n---\nChat History:\n${historyContext}` : ''}\n\n---\nUser request:\n${prompt}`;

  const model = selectCodeModel(prompt, complexity);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      const stream = await client.messages.stream({ model, max_tokens: 16384, system: SYSTEM_MULTI, messages: [{ role: 'user', content: userBlock }] });
      stream.on('text', onChunk);
      stream.on('error', onError);
      stream.on('end', onEnd);
      return;
    } catch (e) { return onError(e); }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return onError(new Error('Aucune clé IA.'));
  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const responseStream = await ai.models.generateContentStream({ model: MODEL_GEMINI, contents: [{ parts: [{ text: userBlock }] }], config: { systemInstruction: SYSTEM_MULTI, temperature: 0.7 } });
    for await (const chunk of responseStream) { if (chunk.text) onChunk(chunk.text); }
    onEnd();
  } catch (e) { onError(e); }
}

// ─── runChatStream ──────────────────────────────────────────────────────────

export async function runChatStream(prompt, onChunk, onEnd, onError) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      const stream = await client.messages.stream({
        model: MODEL_FAST, max_tokens: 2048,
        system: "You are Huggy, the elite AI architect for Huggy Studio. Be concise and speak the user's language.",
        messages: [{ role: 'user', content: prompt }],
      });
      stream.on('text', onChunk);
      stream.on('error', onError);
      stream.on('end', onEnd);
      return;
    } catch (e) { return onError(e); }
  }
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return onError(new Error('Configurez ANTHROPIC_API_KEY ou GEMINI_API_KEY.'));
  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const responseStream = await ai.models.generateContentStream({ model: MODEL_GEMINI_CHAT, contents: prompt, config: { systemInstruction: 'You are Huggy, the elite AI architect. Be concise and professional.' } });
    for await (const chunk of responseStream) { if (chunk.text) onChunk(chunk.text); }
    onEnd();
  } catch (e) { onError(e); }
}
