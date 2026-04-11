import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarRange, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { SettlementPeriod } from "@/hooks/useSettlements";
import { extractYearFromLabel, isStimPeriod, resolveStimPayoutLabels } from "./settlementPeriodGrouping";

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

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
  const stimPayoutLabels = useMemo(() => resolveStimPayoutLabels(periods), [periods]);

  // Group sub-periods by base name for STIM periods
  const groupedPeriods = useMemo((): GroupedPeriod[] => {
    if (!periods || periods.length === 0) return [];
    const map = new Map<string, GroupedPeriod>();
    for (const p of periods) {
      let groupKey: string;
      let label: string;
      if (isStimPeriod(p.distributionKey)) {
        label = stimPayoutLabels.get(p.distributionKey) ?? p.distribution;
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
  }, [periods, stimPayoutLabels]);

  const yearGroups = useMemo((): YearGroup[] => {
    if (groupedPeriods.length === 0) return [];

    const map = new Map<string, YearGroup>();
    for (const gp of groupedPeriods) {
      const firstKey = gp.keys[0];
      const year = firstKey.startsWith("WC-")
        ? firstKey.slice(3, 7)
        : extractYearFromLabel(stimPayoutLabels.get(firstKey) ?? gp.label) ?? "Övrigt";
      if (!map.has(year)) {
        map.set(year, { year, periods: [], totalAmount: 0, totalRows: 0 });
      }
      const g = map.get(year)!;
      g.periods.push(gp);
      g.totalAmount += gp.total;
      g.totalRows += gp.rowCount;
    }
    return Array.from(map.values()).sort((a, b) => b.year.localeCompare(a.year));
  }, [groupedPeriods, stimPayoutLabels]);

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
    // Find the year group that contains this grouped period
    for (const yg of yearGroups) {
      if (yg.periods.some((gp) => gp === selectedGroupedPeriod)) return yg.year;
    }
    return null;
  }, [selectedGroupedPeriod, yearGroups]);

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
