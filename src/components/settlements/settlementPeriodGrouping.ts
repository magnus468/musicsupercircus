import type { SettlementPeriod } from "@/hooks/useSettlements";

const MONTH_NAMES = [
  "januari",
  "februari",
  "mars",
  "april",
  "maj",
  "juni",
  "juli",
  "augusti",
  "september",
  "oktober",
  "november",
  "december",
] as const;

const monthPatternSource = `(${MONTH_NAMES.join("|")})\\s+(\\d{4})`;

const MONTH_PATTERN = new RegExp(monthPatternSource, "i");
const DIRECT_PAYOUT_PATTERN = new RegExp(`^\\s*${monthPatternSource}\\b`, "i");

const toTitleCase = (month: string) => month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();

export function isStimPeriod(distributionKey: string): boolean {
  return !distributionKey.startsWith("WC-");
}

export function extractYearFromLabel(label: string | null): string | null {
  if (!label) return null;
  const match = label.match(MONTH_PATTERN);
  return match ? match[2] : null;
}

function extractDirectPayoutLabel(distribution: string | null): string | null {
  if (!distribution) return null;
  const match = distribution.match(DIRECT_PAYOUT_PATTERN);
  if (!match) return null;
  return `${toTitleCase(match[1])} ${match[2]}`;
}

function extractMonthYearAnywhere(distribution: string | null): string | null {
  if (!distribution) return null;
  const match = distribution.match(MONTH_PATTERN);
  if (!match) return null;
  return `${toTitleCase(match[1])} ${match[2]}`;
}

export function resolveStimPayoutLabels(periods: SettlementPeriod[]): Map<string, string> {
  const directPayouts: { key: number; label: string }[] = [];

  for (const period of periods) {
    if (!isStimPeriod(period.distributionKey)) continue;
    const key = Number.parseInt(period.distributionKey, 10);
    const label = extractDirectPayoutLabel(period.distribution);
    if (Number.isNaN(key) || !label) continue;
    directPayouts.push({ key, label });
  }

  directPayouts.sort((a, b) => a.key - b.key);

  const findNearestDirectLabel = (distributionKey: string): string | null => {
    const key = Number.parseInt(distributionKey, 10);
    if (Number.isNaN(key) || directPayouts.length === 0) return null;

    let closest = directPayouts[0];
    let minDistance = Math.abs(key - closest.key);

    for (const payout of directPayouts) {
      const distance = Math.abs(key - payout.key);
      if (distance < minDistance) {
        closest = payout;
        minDistance = distance;
      }
    }

    return closest.label;
  };

  const resolved = new Map<string, string>();

  for (const period of periods) {
    if (!isStimPeriod(period.distributionKey)) continue;

    const label =
      extractDirectPayoutLabel(period.distribution) ??
      findNearestDirectLabel(period.distributionKey) ??
      extractMonthYearAnywhere(period.distribution) ??
      period.distribution;

    resolved.set(period.distributionKey, label);
  }

  return resolved;
}