/**
 * Huggy Agentic System — Product Manager agent only.
 *
 * VR (Visual Reviewer) removed: same weak model as coder → no quality gain, +3s latency.
 * DBA (Database Architect) removed: was never wired into production endpoint.
 * Pipeline: PM (Haiku, fast) → Coder (Sonnet, quality)
 */
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

const FAST_MODEL = process.env.ANTHROPIC_MODEL_FAST || 'claude-haiku-4-5-20251001';
const GEMINI_MODEL = process.env.GEMINI_MODEL_GENERATE || 'gemini-2.0-flash';

async function callAI(systemPrompt, userPrompt, opts = {}) {
  const { maxTokens = 4096, temperature = 0.5 } = opts;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    const msg = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    return msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  }
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('No AI key configured.');
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ parts: [{ text: userPrompt }] }],
    config: { systemInstruction: systemPrompt, temperature },
  });
  return response.text || '';
}

function extractJson(text) {
  if (!text) return null;
  const t = text.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
}

const PM_SYSTEM = `# ROLE: Senior Product Manager & Solution Architect
You are the PM agent of Huggy Studio. Transform raw user ideas into detailed implementation plans.

# OUTPUT FORMAT
Single valid JSON object only (no markdown fences):
{
  "projectName": "kebab-case-name",
  "summary": "One-line description",
  "pages": [{ "route": "/", "name": "Home", "description": "...", "keyComponents": ["Hero"], "dataNeeds": ["none"] }],
  "designGuidelines": { "colorScheme": "dark with blue accents", "typography": "Inter", "style": "glassmorphism" },
  "dataModel": [],
  "authStrategy": "none",
  "complexity": "simple | medium | complex",
  "estimatedFiles": 1,
  "refinedPrompt": "Extremely detailed prompt for the Coder agent. Include exact layouts, colors, animations, sections, interactions. 5-10x more detailed than the original request."
}

# RULES
- Vague request → assume modern SaaS dashboard
- Always define at least 1 page
- "refinedPrompt" is the most important field — be exhaustive and specific
- **SEO & Accessibility**: Always include SEO strategy in the refinedPrompt (meta tags, semantic structure).
- Simple UI (landing/portfolio) → empty dataModel, authStrategy "none"
- Respond ONLY with JSON`;

export async function runProductManager(rawPrompt, chatContext = []) {
  const contextBlock = chatContext.length ? `\nPrevious context:\n${chatContext.join('\n')}\n\n` : '';
  const raw = await callAI(PM_SYSTEM, `${contextBlock}User request:\n"${rawPrompt}"\n\nProduce your plan.`, { maxTokens: 3072 });
  const plan = extractJson(raw);
  if (!plan?.refinedPrompt) {
    return {
      projectName: 'huggy-project', summary: rawPrompt,
      pages: [{ route: '/', name: 'Main', description: rawPrompt, keyComponents: ['App'], dataNeeds: ['none'] }],
      designGuidelines: { colorScheme: 'blue gradient', typography: 'Inter', style: 'premium SaaS' },
      dataModel: [], authStrategy: 'none', complexity: 'medium', estimatedFiles: 1,
      refinedPrompt: rawPrompt,
    };
  }
  return plan;
}

export async function runAgenticPipeline(userPrompt, opts = {}) {
  const { chatHistory = [] } = opts;
  const contextForPM = chatHistory.map(m => `${m.role}: ${m.content}`);
  const plan = await runProductManager(userPrompt, contextForPM);
  return { plan, refinedPrompt: plan.refinedPrompt || userPrompt, database: null };
}

/** Stub — visual review replaced by client-side ESLint. Always approved. */
export async function runPostGenerationReview(_files, _originalPrompt) {
  return { score: 88, issues: [], corrections: [], approved: true };
}
