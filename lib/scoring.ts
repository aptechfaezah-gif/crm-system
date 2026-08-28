import type { LeadTemperature } from "@/types";

export function computeLeadScore(input: {
  estimatedBudget?: number | null;
  website?: string | null;
  companyName?: string | null;
  requirements?: string | null;
  whatsApp?: string | null;
  nextFollowUpDate?: string | null;
  statusName?: string | null;
  temperature?: LeadTemperature | null;
}): number {
  let score = 35;

  const budget = Number(input.estimatedBudget || 0);
  if (budget >= 2_000_000) score += 25;
  else if (budget >= 500_000) score += 18;
  else if (budget >= 100_000) score += 10;
  else if (budget > 0) score += 5;

  if (input.website) score += 8;
  if (input.companyName) score += 8;
  if (input.requirements && input.requirements.length > 20) score += 10;
  if (input.whatsApp) score += 6;
  if (input.nextFollowUpDate) score += 6;

  const status = (input.statusName || "").toLowerCase();
  if (["qualified", "follow-up", "proposal sent", "negotiation"].includes(status)) score += 12;
  if (status === "won") score += 20;

  if (input.temperature === "Hot") score += 8;
  if (input.temperature === "Cold") score -= 8;

  return Math.max(0, Math.min(100, score));
}

export function temperatureFromScore(score: number): LeadTemperature {
  if (score >= 75) return "Hot";
  if (score >= 45) return "Warm";
  return "Cold";
}
