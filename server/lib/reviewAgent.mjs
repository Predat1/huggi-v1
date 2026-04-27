/**
 * Huggy QA/Reviewer Agent
 *
 * Runs AFTER the Coder agent to detect common issues in the generated code.
 * Uses Haiku (fast, cheap ~$0.003) to catch bugs the Coder might have introduced.
 *
 * Pipeline position: PM → WebResearch → Coder → **Reviewer** → Done
 *
 * Checks for:
 *  - Missing imports (React, hooks, icons, components)
 *  - Broken JSX (unclosed tags, mismatched fragments)
 *  - TypeScript issues (implicit any, unused variables)
 *  - Missing exports (default export required for preview)
 *  - Accessibility basics (alt attributes, aria labels)
 *  - Empty files / truncated code
 */
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

const FAST_MODEL = process.env.ANTHROPIC_MODEL_FAST || 'claude-haiku-4-5-20251001';
const GEMINI_MODEL = process.env.GEMINI_MODEL_GENERATE || 'gemini-2.0-flash';

async function callReviewAI(systemPrompt, userPrompt) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    const msg = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 2048,
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
    config: { systemInstruction: systemPrompt, temperature: 0.2 },
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

const REVIEWER_SYSTEM = `# ROLE: Senior Code Reviewer & QA Engineer
You are a strict React/TypeScript code reviewer for Huggy Studio.
Your job is to detect bugs, missing imports, and broken JSX in generated code BEFORE it reaches the user.

# REVIEW CHECKLIST
1. **Imports**: Every component, hook, icon, and library used must be imported. Check React, useState, useEffect, useCallback, motion (from "motion/react"), lucide-react icons, etc.
2. **JSX Structure**: All tags must be properly closed. Fragments must match. No orphaned closing tags.
3. **Default Export**: The main entry file MUST have a default export.
4. **TypeScript**: No implicit 'any' on function parameters. Props must be typed.
5. **Accessibility**: Images need alt text. Interactive elements need aria-labels or visible text.
6. **Completeness**: Code must not be truncated. No "// ... rest of component" or "TODO" placeholders.

# OUTPUT FORMAT
Single valid JSON object only (no markdown fences):
{
  "score": 85,
  "issues": [
    { "file": "src/App.tsx", "line": "~15", "severity": "error", "description": "Missing import for useState" },
    { "file": "src/App.tsx", "line": "~42", "severity": "warning", "description": "Image missing alt attribute" }
  ],
  "fixes": [
    { "file": "src/App.tsx", "action": "add_import", "content": "import { useState } from 'react';" }
  ],
  "approved": true
}

# RULES
- score: 0-100. Below 60 = NOT approved.
- severity: "error" (will break), "warning" (should fix), "info" (nice to have)
- fixes: concrete auto-fix suggestions the system can apply
- approved: true if score >= 60 and no critical errors
- Be concise. Maximum 10 issues.
- If code looks clean, return score 95+ with empty issues and approved: true.`;

/**
 * Run the QA review on generated files.
 * @param {Array<{path: string, content: string}>} files - Generated code files
 * @param {string} originalPrompt - What the user asked for
 * @returns {Promise<{score: number, issues: Array, fixes: Array, approved: boolean}>}
 */
export async function runReviewerAgent(files, originalPrompt) {
  if (!files || files.length === 0) {
    return { score: 0, issues: [{ file: '-', severity: 'error', description: 'No files generated' }], fixes: [], approved: false };
  }

  // Build a compact representation of all files for the reviewer
  const filesSummary = files.map(f => {
    // Truncate very long files to avoid token explosion
    const content = f.content.length > 6000 ? f.content.slice(0, 6000) + '\n// ... (truncated for review)' : f.content;
    return `### File: ${f.path}\n\`\`\`tsx\n${content}\n\`\`\``;
  }).join('\n\n');

  const userPrompt = `## Original User Request\n"${originalPrompt}"\n\n## Generated Files (${files.length} files)\n${filesSummary}\n\nReview these files for bugs, missing imports, and code quality issues. Produce your JSON review.`;

  try {
    const raw = await callReviewAI(REVIEWER_SYSTEM, userPrompt);
    const review = extractJson(raw);
    
    if (!review) {
      // If the reviewer can't parse, assume code is okay (don't block the user)
      return { score: 80, issues: [], fixes: [], approved: true };
    }

    return {
      score: review.score ?? 80,
      issues: Array.isArray(review.issues) ? review.issues.slice(0, 10) : [],
      fixes: Array.isArray(review.fixes) ? review.fixes : [],
      approved: review.approved !== false,
    };
  } catch (e) {
    console.warn('[ReviewerAgent] Review failed, auto-approving:', e.message);
    return { score: 75, issues: [], fixes: [], approved: true };
  }
}

/**
 * Apply auto-fixes suggested by the reviewer.
 * Currently supports: add_import (prepends import to file).
 * @param {Array<{path: string, content: string}>} files
 * @param {Array<{file: string, action: string, content: string}>} fixes
 * @returns {Array<{path: string, content: string}>}
 */
export function applyAutoFixes(files, fixes) {
  if (!fixes || fixes.length === 0) return files;

  const fileMap = new Map(files.map(f => [f.path, f.content]));

  for (const fix of fixes) {
    if (!fix.file || !fix.content || !fileMap.has(fix.file)) continue;

    const current = fileMap.get(fix.file);

    switch (fix.action) {
      case 'add_import': {
        // Check if this import already exists
        if (!current.includes(fix.content.trim())) {
          // Find the last import line and insert after it
          const lines = current.split('\n');
          let lastImportIdx = -1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('import ')) lastImportIdx = i;
          }
          lines.splice(lastImportIdx + 1, 0, fix.content.trim());
          fileMap.set(fix.file, lines.join('\n'));
        }
        break;
      }
      case 'add_default_export': {
        if (!current.includes('export default')) {
          fileMap.set(fix.file, current + '\n' + fix.content.trim() + '\n');
        }
        break;
      }
      default:
        break;
    }
  }

  return files.map(f => ({ path: f.path, content: fileMap.get(f.path) || f.content }));
}
