/**
 * Plan definitions and enforcement.
 * Pricing: Free / Starter / Pro / Agency
 */

export const PLANS = {
  free: {
    name: 'Free',
    maxProjects: 3,
    maxGenerationsPerMonth: 15,
    maxDeployments: 3,
    customDomain: false,
    removeBadge: false,
    apiAccess: false,
    teamSeats: 1,
    priorityAI: false,
  },
  pro: {
    name: 'Pro',
    maxProjects: 15,
    maxGenerationsPerMonth: 150,
    maxDeployments: null,
    customDomain: true,
    removeBadge: true,
    apiAccess: false,
    teamSeats: 1,
    priorityAI: true,
  },
  scale: {
    name: 'Scale',
    maxProjects: null,
    maxGenerationsPerMonth: 500,
    maxDeployments: null,
    customDomain: true,
    removeBadge: true,
    apiAccess: false,
    teamSeats: 3,
    priorityAI: true,
  },
  business: {
    name: 'Business',
    maxProjects: null,
    maxGenerationsPerMonth: null, // Unlimited fair use
    maxDeployments: null,
    customDomain: true,
    removeBadge: true,
    apiAccess: true,
    teamSeats: 10,
    priorityAI: true,
  },
};

/** Map Stripe plan IDs / tier names → plan key */
export function resolvePlan(tier, isPro) {
  if (!tier || tier === 'free') return 'free';
  if (tier === 'business') return 'business';
  if (tier === 'scale') return 'scale';
  if (tier === 'pro' || isPro) return 'pro';
  return 'free';
}

/** @returns {{ allowed: boolean, reason?: string }} */
export function canGenerate(profile, monthlyCount) {
  const plan = PLANS[resolvePlan(profile.tier, profile.is_pro)];
  if (plan.maxGenerationsPerMonth === null) return { allowed: true };
  if (monthlyCount >= plan.maxGenerationsPerMonth) {
    return {
      allowed: false,
      reason: `Limite mensuelle atteinte (${plan.maxGenerationsPerMonth} générations). Passez au plan supérieur.`,
    };
  }
  return { allowed: true };
}

/** @returns {{ allowed: boolean, reason?: string }} */
export function canCreateProject(profile, currentProjectCount) {
  const plan = PLANS[resolvePlan(profile.tier, profile.is_pro)];
  if (plan.maxProjects === null) return { allowed: true };
  if (currentProjectCount >= plan.maxProjects) {
    return {
      allowed: false,
      reason: `Limite de ${plan.maxProjects} projets atteinte sur le plan ${plan.name}. Passez au plan supérieur.`,
    };
  }
  return { allowed: true };
}

/** Should the viral badge be shown on deployed apps? */
export function showViralBadge(profile) {
  const plan = PLANS[resolvePlan(profile.tier, profile.is_pro)];
  return !plan.removeBadge;
}
