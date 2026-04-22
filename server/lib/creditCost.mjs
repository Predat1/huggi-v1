/**
 * Credit cost per generation, based on PM agent complexity classification.
 *
 * Pricing tiers (aligned with Lovable/Bolt model):
 *   simple  → 0.5 credits  (style tweaks, single-element changes)
 *   medium  → 1.0 credits  (new component, page update, feature addition)
 *   complex → 2.0 credits  (auth, multi-page, full app creation, integrations)
 *
 * Profitability at Hobby plan (400 credits / €19 = €0.047/credit):
 *   simple:  0.5 × €0.047 = €0.024 revenue  | Haiku cost ≈ €0.003   → 8× margin
 *   medium:  1.0 × €0.047 = €0.047 revenue  | Sonnet cost ≈ €0.045  → ~1× margin (cached: 3×)
 *   complex: 2.0 × €0.047 = €0.094 revenue  | Sonnet cost ≈ €0.065  → 1.4× margin
 *
 * Redis cache (aiCache.mjs) cuts real AI costs by ~60% on repeated queries → improves margins.
 */

const COSTS = {
  simple: 0.5,
  medium: 1.0,
  complex: 2.0,
};

/** @param {'simple'|'medium'|'complex'|string|undefined} complexity */
export function getCreditCost(complexity) {
  return COSTS[complexity] ?? 1.0;
}

/** Format for display: "0.5", "1", "2" */
export function formatCost(cost) {
  return Number.isInteger(cost) ? String(cost) : cost.toFixed(1);
}
