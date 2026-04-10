import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarRange, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { SettlementPeriod } from "@/hooks/useSettlements";

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

/** Swedish month names for matching distribution period names */
const MONTHS = /^(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+(\d{4})/i;

/**
 * Extract the distribution year from the BASE period name (before comma).
 * Only uses the year from the base part (e.g. "November 2025" → 2025).
 * For WC periods, uses the key prefix.
 * For STIM periods without a clear month+year base name (like "Privatkopieringsersättning"),
 * returns null so the caller can infer from neighboring periods.
 */
function extractYear(distribution: string | null, distributionKey: string): string | null {
  if (distributionKey.startsWith("WC-")) return distributionKey.slice(3, 7);
  if (!distribution) return null;
  const baseName = getBasePeriodName(distribution);
  // Try month+year pattern first
  const monthMatch = baseName.match(MONTHS);
  if (monthMatch) return monthMatch[2];
  // Try just a 4-digit year in the base name (e.g. "Mars 2026")
  const yearMatch = baseName.match(/\b(\d{4})\b/);
  if (yearMatch) return yearMatch[1];
  // No year in base name – caller should infer
  return null;
}

/** Extract base period name: "November 2025, Spotify Norden" → "November 2025" */
function getBasePeriodName(distribution: string): string {
  const commaIdx = distribution.indexOf(",");
  if (commaIdx > 0) return distribution.slice(0, commaIdx).trim();
  return distribution;
}

/** Check if this is a STIM period (not WC-prefixed) */
function isStimPeriod(distributionKey: string): boolean {
  return !distributionKey.startsWith("WC-");
}

interface GroupedPeriod {
  label: string;
  keys: string[];
  total: number;
  rowCount: number;
}

interface YearGroup {
  year: string;
  periods: GroupedPeriod[];
  totalAmount: number;
  totalRows: number;
}

interface Props {
  periods: SettlementPeriod[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
}

export const SettlementsPeriodFilter = ({ periods, selectedKey, onSelect }: Props) => {
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  // Group sub-periods by base name for STIM periods
  const groupedPeriods = useMemo((): GroupedPeriod[] => {
    if (!periods || periods.length === 0) return [];
    const map = new Map<string, GroupedPeriod>();
    for (const p of periods) {
      let groupKey: string;
      let label: string;
      if (isStimPeriod(p.distributionKey)) {
        label = getBasePeriodName(p.distribution);
        groupKey = `stim-${label}`;
      } else {
        label = p.distribution;
        groupKey = p.distributionKey;
      }
      if (!map.has(groupKey)) {
        map.set(groupKey, { label, keys: [], total: 0, rowCount: 0 });
      }
      const g = map.get(groupKey)!;
      g.keys.push(p.distributionKey);
      g.total += p.total;
      g.rowCount += p.rowCount;
    }
    return Array.from(map.values());
  }, [periods]);

  const yearGroups = useMemo((): YearGroup[] => {
    if (groupedPeriods.length === 0) return [];

    // Build a sorted list of all numeric STIM keys with known years for inference
    const knownYears: { key: number; year: string }[] = [];
    for (const p of periods) {
      if (p.distributionKey.startsWith("WC-")) continue;
      const num = parseInt(p.distributionKey, 10);
      if (isNaN(num)) continue;
      const y = extractYear(p.distribution, p.distributionKey);
      if (y) knownYears.push({ key: num, year: y });
    }
    knownYears.sort((a, b) => a.key - b.key);

    /** Infer year for a STIM key by finding the closest key with a known year */
    const inferYear = (distributionKey: string): string => {
      const num = parseInt(distributionKey, 10);
      if (isNaN(num) || knownYears.length === 0) return "Övrigt";
      let closest = knownYears[0];
      let minDist = Math.abs(num - closest.key);
      for (const ky of knownYears) {
        const d = Math.abs(num - ky.key);
        if (d < minDist) { minDist = d; closest = ky; }
      }
      return closest.year;
    };

    const map = new Map<string, YearGroup>();
    for (const gp of groupedPeriods) {
      const firstKey = gp.keys[0];
      const firstPeriod = periods.find((p) => p.distributionKey === firstKey);
      let year = extractYear(firstPeriod?.distribution ?? null, firstKey);
      if (!year) year = inferYear(firstKey);
      if (!map.has(year)) {
        map.set(year, { year, periods: [], totalAmount: 0, totalRows: 0 });
      }
      const g = map.get(year)!;
      g.periods.push(gp);
      g.totalAmount += gp.total;
      g.totalRows += gp.rowCount;
    }
    return Array.from(map.values()).sort((a, b) => b.year.localeCompare(a.year));
  }, [groupedPeriods, periods]);

  const selectedKeys = useMemo(() => (selectedKey ? selectedKey.split(",") : []), [selectedKey]);

  // Find which grouped period is currently selected
  const selectedGroupedPeriod = useMemo(() => {
    if (selectedKeys.length === 0) return null;
    return groupedPeriods.find((gp) =>
      gp.keys.length === selectedKeys.length && gp.keys.every((k) => selectedKeys.includes(k))
    ) ?? null;
  }, [selectedKeys, groupedPeriods]);

  const selectedYear = useMemo(() => {
    if (!selectedGroupedPeriod) return null;
    const firstKey = selectedGroupedPeriod.keys[0];
    const firstPeriod = periods.find((p) => p.distributionKey === firstKey);
    return extractYear(firstPeriod?.distribution ?? null, firstKey);
  }, [selectedGroupedPeriod, periods]);

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const handleSelect = (gp: GroupedPeriod) => {
    const keyStr = gp.keys.join(",");
    onSelect(selectedKey === keyStr ? null : keyStr);
  };

  if (!periods || periods.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Avräkningsperioder</span>
          </div>
          <Button
            variant={selectedKey === null ? "default" : "ghost"}
            size="sm"
            onClick={() => onSelect(null)}
            className="text-xs h-7"
          >
            Alla perioder
          </Button>
        </div>

        <div className="space-y-1">
          {yearGroups.map((group) => {
            const isExpanded = expandedYears.has(group.year) || selectedYear === group.year;
            const hasSelectedPeriod = group.periods.some((gp) => {
              const keyStr = gp.keys.join(",");
              return keyStr === selectedKey;
            });

            return (
              <Collapsible
                key={group.year}
                open={isExpanded}
                onOpenChange={() => toggleYear(group.year)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/80 ${
                      hasSelectedPeriod ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="font-semibold">{group.year}</span>
                    </div>
                    <span className="font-medium tabular-nums text-sm">
                      {fmt(group.totalAmount)}
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-5 mt-1 space-y-0.5 pb-1">
                    {group.periods.map((gp) => {
                      const keyStr = gp.keys.join(",");
                      const isActive = selectedKey === keyStr;
                      return (
                        <button
                          key={keyStr}
                          onClick={() => handleSelect(gp)}
                          className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={isActive ? "font-medium" : ""}>{gp.label}</span>
                          </div>
                          <span className={`tabular-nums text-sm ${isActive ? "" : "text-muted-foreground"}`}>
                            {fmt(gp.total)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {selectedGroupedPeriod && (
          <p className="mt-3 text-xs text-muted-foreground border-t pt-2">
            Visar data för: <span className="font-medium text-foreground">{selectedGroupedPeriod.label}</span>
            {" — "}
            {fmt(selectedGroupedPeriod.total)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
