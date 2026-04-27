/**
 * Huggy DBA (Database Architect) Agent
 *
 * Runs AFTER the PM agent to analyze data model needs and produce:
 * 1. Full Supabase-compatible PostgreSQL DDL (CREATE TABLE, RLS, indexes)
 * 2. Row Level Security policies
 * 3. Seed data suggestions
 * 4. Supabase client integration code for the generated app
 *
 * Pipeline position: PM → WebResearch → **DBA** → Coder → Reviewer → Done
 * Uses Haiku for speed (~0.5s, ~$0.003).
 */
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { generateSchema } from './schemaGen.mjs';

const FAST_MODEL = process.env.ANTHROPIC_MODEL_FAST || 'claude-haiku-4-5-20251001';
const GEMINI_MODEL = process.env.GEMINI_MODEL_GENERATE || 'gemini-2.0-flash';

async function callDBA_AI(systemPrompt, userPrompt) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    const msg = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 3072,
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
    config: { systemInstruction: systemPrompt, temperature: 0.3 },
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

const DBA_SYSTEM = `# ROLE: Senior Database Architect (Supabase/PostgreSQL Expert)
You are the DBA agent of Huggy Studio. Analyze the PM agent's plan and produce a complete database architecture.

# INPUT
You receive the PM agent's plan including dataModel, authStrategy, and pages.

# OUTPUT FORMAT
Single valid JSON object only (no markdown fences):
{
  "needsDatabase": true,
  "explanation": "Brief explanation of why a database is needed and the chosen architecture.",
  "tables": [
    {
      "name": "posts",
      "description": "User-created blog posts",
      "columns": [
        { "name": "id", "type": "uuid", "primary": true, "default": "gen_random_uuid()" },
        { "name": "title", "type": "text", "required": true },
        { "name": "content", "type": "text", "required": true },
        { "name": "author_id", "type": "uuid", "references": "auth.users(id)" },
        { "name": "published", "type": "boolean", "default": "false" },
        { "name": "created_at", "type": "timestamptz", "default": "now()" }
      ],
      "indexes": ["CREATE INDEX idx_posts_author ON posts(author_id);"],
      "rls_policies": [
        "CREATE POLICY \\"Users can read all posts\\" ON posts FOR SELECT USING (published = true);",
        "CREATE POLICY \\"Users can manage own posts\\" ON posts FOR ALL USING (auth.uid() = author_id);"
      ]
    }
  ],
  "relationships": [
    { "from": "posts.author_id", "to": "auth.users.id", "type": "many-to-one" }
  ],
  "seedData": [
    { "table": "posts", "description": "3 sample blog posts for demo purposes" }
  ],
  "supabaseClientCode": "// Auto-generated Supabase client helper\\nimport { createClient } from '@supabase/supabase-js';\\nconst supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);\\nexport default supabase;"
}

# RULES
- If the app does not need a database (static landing page, portfolio), set needsDatabase: false and leave tables empty.
- Always use Supabase conventions: auth.users for user references, RLS enabled by default.
- Include sensible indexes for foreign keys and frequently queried columns.
- supabaseClientCode should be a ready-to-use utility file the Coder agent can import.
- Be practical: do not over-engineer. Only create tables the app actually needs.`;

/**
 * Analyze the PM plan and determine if a database is needed.
 * If so, generate the full schema architecture.
 * @param {object} pmPlan - The PM agent's output
 * @param {string} userPrompt - Original user request
 * @returns {Promise<{needsDatabase: boolean, schema: {sql: string, tables: string[]}|null, architecture: object|null}>}
 */
export async function runDBAAgent(pmPlan, userPrompt) {
  // Quick check: if PM says no data model and no auth, skip the DBA entirely (save cost)
  const hasDataModel = pmPlan?.dataModel && pmPlan.dataModel.length > 0;
  const hasAuth = pmPlan?.authStrategy && pmPlan.authStrategy !== 'none';
  const promptHintDB = /base de données|database|supabase|postgres|sql|auth|login|signup|inscription|connexion|crud|api/i.test(userPrompt);

  if (!hasDataModel && !hasAuth && !promptHintDB) {
    return { needsDatabase: false, schema: null, architecture: null };
  }

  // If PM already provided a data model, we can generate schema directly (fast path)
  if (hasDataModel && !hasAuth) {
    const schema = generateSchema(pmPlan.dataModel);
    return {
      needsDatabase: true,
      schema,
      architecture: {
        needsDatabase: true,
        explanation: 'Schema generated from PM data model.',
        tables: pmPlan.dataModel.map(e => ({
          name: e.entity,
          columns: e.fields || [],
        })),
        relationships: [],
        seedData: [],
        supabaseClientCode: generateSupabaseClient(),
      },
    };
  }

  // Full DBA agent call for complex scenarios (auth, relationships, etc.)
  try {
    const planSummary = JSON.stringify({
      pages: pmPlan?.pages || [],
      dataModel: pmPlan?.dataModel || [],
      authStrategy: pmPlan?.authStrategy || 'none',
      complexity: pmPlan?.complexity || 'medium',
    }, null, 2);

    const prompt = `## User Request\n"${userPrompt}"\n\n## PM Agent Plan\n${planSummary}\n\nAnalyze this and produce the database architecture.`;

    const raw = await callDBA_AI(DBA_SYSTEM, prompt);
    const architecture = extractJson(raw);

    if (!architecture || !architecture.needsDatabase) {
      return { needsDatabase: false, schema: null, architecture: null };
    }

    // Generate SQL from the DBA's table definitions
    const sqlParts = [];
    const tableNames = [];

    sqlParts.push('-- Auto-generated by Huggy DBA Agent');
    sqlParts.push('-- Run this in your Supabase SQL Editor\n');

    for (const table of (architecture.tables || [])) {
      tableNames.push(table.name);
      
      const cols = (table.columns || []).map(col => {
        let def = `  ${col.name} ${mapType(col.type)}`;
        if (col.primary) def += ' PRIMARY KEY';
        if (col.default) def += ` DEFAULT ${col.default}`;
        if (col.required) def += ' NOT NULL';
        if (col.unique) def += ' UNIQUE';
        if (col.references) def += ` REFERENCES ${col.references}`;
        return def;
      });

      sqlParts.push(`-- Table: ${table.name}`);
      if (table.description) sqlParts.push(`-- ${table.description}`);
      sqlParts.push(`CREATE TABLE IF NOT EXISTS ${table.name} (`);
      sqlParts.push(cols.join(',\n'));
      sqlParts.push(`);\n`);
      sqlParts.push(`ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;\n`);

      // Add RLS policies
      for (const policy of (table.rls_policies || [])) {
        sqlParts.push(policy);
      }

      // Add indexes
      for (const idx of (table.indexes || [])) {
        sqlParts.push(idx);
      }

      sqlParts.push('');
    }

    return {
      needsDatabase: true,
      schema: { sql: sqlParts.join('\n'), tables: tableNames },
      architecture,
    };
  } catch (e) {
    console.warn('[DBAAgent] Failed, falling back to schemaGen:', e.message);
    // Fallback to simple schema generation
    if (hasDataModel) {
      const schema = generateSchema(pmPlan.dataModel);
      return { needsDatabase: true, schema, architecture: null };
    }
    return { needsDatabase: false, schema: null, architecture: null };
  }
}

function mapType(type = 'text') {
  const map = {
    uuid: 'UUID', text: 'TEXT', string: 'TEXT', varchar: 'TEXT',
    number: 'NUMERIC', numeric: 'NUMERIC', integer: 'INTEGER', int: 'INTEGER',
    bigint: 'BIGINT', boolean: 'BOOLEAN', bool: 'BOOLEAN',
    timestamp: 'TIMESTAMPTZ', date: 'TIMESTAMPTZ', datetime: 'TIMESTAMPTZ',
    timestamptz: 'TIMESTAMPTZ', json: 'JSONB', jsonb: 'JSONB', array: 'JSONB',
  };
  return map[type?.toLowerCase()] || 'TEXT';
}

function generateSupabaseClient() {
  return `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;`;
}
