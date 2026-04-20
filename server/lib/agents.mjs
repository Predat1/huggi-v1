/**
 * Huggy Agentic System — Three specialized AI agents that work together
 * to produce elite-quality applications.
 * 
 * Agent 1: Product Manager (PM) — Plans architecture before any code is written
 * Agent 2: Visual Reviewer (VR) — Reviews generated code for UI quality issues
 * Agent 3: Database Architect (DBA) — Generates Supabase schemas & connects data
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

// ─── Shared AI Call Utility ─────────────────────────────────────────────────

async function callAI(systemPrompt, userPrompt, opts = {}) {
  const { maxTokens = 8192, temperature = 0.6 } = opts;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    const msg = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    return msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('No AI key configured (ANTHROPIC_API_KEY or GEMINI_API_KEY).');

  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL_GENERATE || 'gemini-2.0-flash',
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
  try { return JSON.parse(t.slice(start, end + 1)); }
  catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 1: PRODUCT MANAGER (PM)
// ═══════════════════════════════════════════════════════════════════════════════

const PM_SYSTEM = `# ROLE: Senior Product Manager & Solution Architect
You are the PM agent of Huggy Studio. Your job is to take a raw user idea (often vague or short)
and produce a detailed, structured implementation plan BEFORE any code is written.

# YOUR OUTPUT
You MUST respond with a single valid JSON object (no markdown fences). Schema:

{
  "projectName": "kebab-case-name",
  "summary": "One-line description of the project",
  "pages": [
    {
      "route": "/",
      "name": "Home",
      "description": "What this page does and what it shows",
      "keyComponents": ["Hero", "FeatureGrid", "CTA"],
      "dataNeeds": ["none | list of data entities needed"]
    }
  ],
  "designGuidelines": {
    "colorScheme": "e.g. dark mode with blue accents",
    "typography": "Inter, clean modern SaaS",
    "style": "glassmorphism, minimal, etc."
  },
  "dataModel": [
    {
      "table": "users",
      "columns": [
        { "name": "id", "type": "uuid", "primaryKey": true },
        { "name": "email", "type": "text" }
      ]
    }
  ],
  "authStrategy": "email | google | github | none",
  "complexity": "simple | medium | complex",
  "estimatedFiles": 3,
  "refinedPrompt": "A very detailed, crystal-clear prompt that will be sent to the Coder agent to generate perfect code. This should be 5-10x more detailed than the user's original request."
}

# RULES
- If the user says something vague like "make me an app", assume a modern SaaS dashboard.
- Always define at least 1 page.
- The "refinedPrompt" is the most important field. It must be extremely detailed, specifying exact layouts, sections, color tokens, animations, and data to display.
- For simple requests (landing page, portfolio), keep dataModel empty and authStrategy "none".
- Respond ONLY with JSON. No extra text.`;

/**
 * Agent 1: Takes a raw user idea → produces a structured plan + refined prompt.
 * @param {string} rawPrompt - The user's original message
 * @param {string[]} [chatContext] - Previous conversation context
 * @returns {Promise<Object>} The structured plan
 */
export async function runProductManager(rawPrompt, chatContext = []) {
  const contextBlock = chatContext.length
    ? `\n\nPrevious conversation:\n${chatContext.join('\n')}\n\n`
    : '';

  const userBlock = `${contextBlock}User's request:\n"${rawPrompt}"\n\nProduce your structured plan now.`;

  const raw = await callAI(PM_SYSTEM, userBlock, { maxTokens: 4096, temperature: 0.5 });
  const plan = extractJson(raw);

  if (!plan || !plan.refinedPrompt) {
    // Fallback: return a basic plan with the original prompt
    return {
      projectName: 'huggy-project',
      summary: rawPrompt,
      pages: [{ route: '/', name: 'Main', description: rawPrompt, keyComponents: ['App'], dataNeeds: ['none'] }],
      designGuidelines: { colorScheme: 'modern blue', typography: 'Inter', style: 'premium SaaS' },
      dataModel: [],
      authStrategy: 'none',
      complexity: 'medium',
      estimatedFiles: 1,
      refinedPrompt: rawPrompt,
    };
  }

  return plan;
}


// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 2: VISUAL REVIEWER (VR)
// ═══════════════════════════════════════════════════════════════════════════════

const VR_SYSTEM = `# ROLE: Senior UI/UX Design Reviewer
You are the Visual Review agent of Huggy Studio. You receive generated React/Tailwind code
and review it for visual quality, accessibility, and design consistency.

# YOUR TASK
Analyze the provided code and identify UI issues. Then provide corrected code.

# YOUR OUTPUT
You MUST respond with a single valid JSON object (no markdown fences). Schema:

{
  "score": 85,
  "issues": [
    {
      "severity": "critical | warning | suggestion",
      "description": "What the issue is",
      "fix": "How to fix it"
    }
  ],
  "corrections": [
    {
      "path": "src/App.tsx",
      "content": "...corrected full file content..."
    }
  ],
  "approved": true
}

# REVIEW CRITERIA
1. **Visual Hierarchy**: Headers must be larger than body text. CTAs must stand out.
2. **Color Consistency**: No clashing colors. Use a harmonious palette.
3. **Spacing**: Proper padding/margin. No cramped elements.
4. **Responsiveness**: Must work on mobile (use responsive Tailwind classes).
5. **Empty States**: Loading, error, and empty states must be handled.
6. **Animations**: Must have at least subtle hover effects and transitions.
7. **Accessibility**: Proper alt text, ARIA labels, color contrast.
8. **Premium Feel**: Must look like a $1M+ startup product, not a student project.

# RULES
- If score >= 80, set "approved" to true and return empty "corrections" array.
- If score < 80, provide corrected files in "corrections" with the full fixed content.
- Be strict. A plain white page with basic text should score 20-30.
- A well-designed page with animations, gradients, and polish should score 85+.
- Respond ONLY with JSON.`;

/**
 * Agent 2: Reviews generated code for visual quality.
 * Returns corrections if the design isn't premium enough.
 * @param {Array<{path: string, content: string}>} files - Generated files to review
 * @param {string} originalPrompt - What the user asked for
 * @returns {Promise<Object>} Review result with optional corrections
 */
export async function runVisualReview(files, originalPrompt) {
  const filesBlock = files
    .map(f => `### FILE: ${f.path}\n\`\`\`tsx\n${f.content}\n\`\`\``)
    .join('\n\n');

  const userBlock = `User's original request: "${originalPrompt}"\n\nGenerated code to review:\n\n${filesBlock}\n\nReview the code now and provide your assessment.`;

  const raw = await callAI(VR_SYSTEM, userBlock, { maxTokens: 16384, temperature: 0.3 });
  const review = extractJson(raw);

  if (!review) {
    return { score: 80, issues: [], corrections: [], approved: true };
  }

  return {
    score: review.score ?? 80,
    issues: review.issues || [],
    corrections: (review.corrections || []).map(f => ({
      path: String(f.path).replace(/\\/g, '/'),
      content: String(f.content ?? ''),
    })),
    approved: review.approved ?? (review.score >= 80),
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 3: DATABASE ARCHITECT (DBA)
// ═══════════════════════════════════════════════════════════════════════════════

const DBA_SYSTEM = `# ROLE: Senior Database Architect & Backend Engineer
You are the Database Architect agent of Huggy Studio. You take a PM plan and generate
complete, production-ready Supabase database schemas and API integration code.

# YOUR OUTPUT
You MUST respond with a single valid JSON object (no markdown fences). Schema:

{
  "needsDatabase": true,
  "supabaseSchema": "-- Full idempotent SQL migration\\nCREATE TABLE IF NOT EXISTS...",
  "rlsPolicies": "-- RLS policies\\nALTER TABLE ... ENABLE ROW LEVEL SECURITY;...",
  "seedData": "-- Optional seed data\\nINSERT INTO...",
  "supabaseClientCode": "// TypeScript Supabase client helper\\nimport { createClient } from '@supabase/supabase-js'...",
  "apiHooksCode": "// React hooks for data fetching\\nexport function useProducts() { ... }",
  "envVarsNeeded": ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  "explanation": "Brief explanation of the data architecture."
}

# RULES
- Generate idempotent SQL (CREATE TABLE IF NOT EXISTS, etc.).
- Always include RLS policies for security.
- Generate TypeScript types matching the schema.
- Create React custom hooks (useXxx) for CRUD operations.
- If the project is purely visual (landing page, portfolio), set needsDatabase to false and return minimal fields.
- Use Supabase conventions: uuid primary keys, timestamps, soft deletes.
- Respond ONLY with JSON.`;

/**
 * Agent 3: Takes a PM plan and generates database architecture.
 * @param {Object} pmPlan - The plan from the Product Manager agent
 * @param {string} originalPrompt - The user's original request
 * @returns {Promise<Object>} Database architecture
 */
export async function runDatabaseArchitect(pmPlan, originalPrompt) {
  const userBlock = `User's request: "${originalPrompt}"

PM Agent Plan:
- Project: ${pmPlan.projectName || 'unknown'}
- Summary: ${pmPlan.summary || originalPrompt}
- Complexity: ${pmPlan.complexity || 'medium'}
- Auth Strategy: ${pmPlan.authStrategy || 'none'}
- Data Model: ${JSON.stringify(pmPlan.dataModel || [], null, 2)}
- Pages: ${JSON.stringify(pmPlan.pages || [], null, 2)}

Generate the complete database architecture now.`;

  const raw = await callAI(DBA_SYSTEM, userBlock, { maxTokens: 8192, temperature: 0.4 });
  const dba = extractJson(raw);

  if (!dba) {
    return {
      needsDatabase: false,
      supabaseSchema: '',
      rlsPolicies: '',
      seedData: '',
      supabaseClientCode: '',
      apiHooksCode: '',
      envVarsNeeded: [],
      explanation: 'No database required for this project.',
    };
  }

  return {
    needsDatabase: dba.needsDatabase ?? false,
    supabaseSchema: dba.supabaseSchema || '',
    rlsPolicies: dba.rlsPolicies || '',
    seedData: dba.seedData || '',
    supabaseClientCode: dba.supabaseClientCode || '',
    apiHooksCode: dba.apiHooksCode || '',
    envVarsNeeded: dba.envVarsNeeded || [],
    explanation: dba.explanation || '',
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR: Runs the full agentic pipeline
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full agentic pipeline:
 * 1. PM plans the project
 * 2. Coder generates code (handled by existing runGenerate)
 * 3. VR reviews the output
 * 4. If VR rejects, apply corrections
 * 5. DBA generates database (if needed)
 * 
 * @param {string} userPrompt
 * @param {Object} opts
 * @param {Function} onProgress - Callback for real-time task updates
 * @returns {Promise<Object>} Final result with files, plan, review, and database
 */
export async function runAgenticPipeline(userPrompt, opts = {}, onProgress = () => {}) {
  const { chatHistory = [], currentEntryCode = '', allFiles = {} } = opts;
  const result = {
    plan: null,
    codeResult: null,
    review: null,
    database: null,
    refinedPrompt: userPrompt,
  };

  // ── Step 1: Product Manager ──────────────────────────────────────────
  onProgress({ agent: 'pm', status: 'running', label: 'Planning architecture...' });
  try {
    const contextForPM = chatHistory.map(m => `${m.role}: ${m.content}`);
    result.plan = await runProductManager(userPrompt, contextForPM);
    result.refinedPrompt = result.plan.refinedPrompt || userPrompt;
    onProgress({ agent: 'pm', status: 'success', label: `Plan ready: ${result.plan.summary || 'OK'}` });
  } catch (e) {
    console.error('[Agent:PM]', e);
    onProgress({ agent: 'pm', status: 'error', label: 'Planning failed, using raw prompt' });
    result.plan = { refinedPrompt: userPrompt, complexity: 'medium', dataModel: [], authStrategy: 'none', pages: [] };
  }

  // ── Step 2: Code Generation (delegated to caller — runGenerate) ──────
  // The caller will use result.refinedPrompt to call runGenerate()

  // ── Step 3: Database Architect (runs in parallel with code gen) ───────
  if (result.plan.complexity !== 'simple' && result.plan.dataModel?.length > 0) {
    onProgress({ agent: 'dba', status: 'running', label: 'Designing database schema...' });
    try {
      result.database = await runDatabaseArchitect(result.plan, userPrompt);
      onProgress({
        agent: 'dba',
        status: 'success',
        label: result.database.needsDatabase
          ? `Schema ready (${result.plan.dataModel.length} tables)`
          : 'No database needed',
      });
    } catch (e) {
      console.error('[Agent:DBA]', e);
      onProgress({ agent: 'dba', status: 'error', label: 'Database design failed' });
    }
  }

  return result;
}

/**
 * Post-generation review step.
 * Call this AFTER runGenerate with the generated files.
 * @param {Array<{path: string, content: string}>} files
 * @param {string} originalPrompt
 * @param {Function} onProgress
 * @returns {Promise<Object>} Review result
 */
export async function runPostGenerationReview(files, originalPrompt, onProgress = () => {}) {
  onProgress({ agent: 'vr', status: 'running', label: 'Reviewing UI quality...' });
  try {
    const review = await runVisualReview(files, originalPrompt);
    onProgress({
      agent: 'vr',
      status: review.approved ? 'success' : 'warning',
      label: review.approved
        ? `Design approved (score: ${review.score}/100)`
        : `Design needs fixes (score: ${review.score}/100, ${review.issues.length} issues)`,
    });
    return review;
  } catch (e) {
    console.error('[Agent:VR]', e);
    onProgress({ agent: 'vr', status: 'error', label: 'Visual review failed' });
    return { score: 80, issues: [], corrections: [], approved: true };
  }
}
