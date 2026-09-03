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
const DIRECT_PAYOUT_PATTERN = new RegExp(`^\\s*${monthPatternSource}\\s*$`, "i");

const toTitleCase = (month: string) => month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();

export type SettlementPublisher = "MSCE" | "MSCP";

export const encodeSettlementPeriodKey = (publisher: SettlementPublisher, key: string) =>
  `${publisher}::${key}`;

export const decodeSettlementPeriodKey = (value: string): { publisher: SettlementPublisher | null; key: string } => {
  const separatorIndex = value.indexOf("::");
  if (separatorIndex < 0) return { publisher: null, key: value };

  const publisher = value.slice(0, separatorIndex);
  return {
    publisher: publisher === "MSCE" || publisher === "MSCP" ? publisher : null,
    key: value.slice(separatorIndex + 2),
  };
};

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
  const directPayouts = new Map<SettlementPublisher, { key: number; label: string }[]>();

  for (const period of periods) {
    if (!isStimPeriod(period.distributionKey)) continue;
    const key = Number.parseInt(period.distributionKey, 10);
    const label = extractDirectPayoutLabel(period.distribution);
    if (Number.isNaN(key) || !label) continue;
    const payouts = directPayouts.get(period.publisher) ?? [];
    payouts.push({ key, label });
    directPayouts.set(period.publisher, payouts);
  }

  for (const payouts of directPayouts.values()) payouts.sort((a, b) => a.key - b.key);

  const findNearestDirectLabel = (publisher: SettlementPublisher, distributionKey: string): string | null => {
    const payouts = directPayouts.get(publisher) ?? [];
    const key = Number.parseInt(distributionKey, 10);
    if (Number.isNaN(key) || payouts.length === 0) return null;

    // Sub-periods always have keys >= their main period's key,
    // so pick the nearest preceding (or equal) direct payout.
    let best: { key: number; label: string } | null = null;
    for (const payout of payouts) {
      if (payout.key <= key && (!best || payout.key > best.key)) best = payout;
    }

    // Fallback: if no preceding payout exists, use the closest one overall.
    if (!best) {
      best = payouts[0];
      let minDistance = Math.abs(key - best.key);
      for (const payout of payouts) {
        const distance = Math.abs(key - payout.key);
        if (distance < minDistance) {
          best = payout;
          minDistance = distance;
        }
      }
    }

    return best.label;
  };

  const resolved = new Map<string, string>();
  for (const period of periods) {
    if (!isStimPeriod(period.distributionKey)) continue;

    const qualifiedKey = encodeSettlementPeriodKey(period.publisher, period.distributionKey);
    const label =
      extractDirectPayoutLabel(period.distribution) ??
      extractMonthYearAnywhere(period.distribution) ??
      findNearestDirectLabel(period.publisher, period.distributionKey) ??
      period.distribution;

    resolved.set(qualifiedKey, label);
    // Keep a raw-key fallback for callers working with legacy, unqualified data.
    if (!resolved.has(period.distributionKey)) resolved.set(period.distributionKey, label);
  }

  return resolved;
}
