import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarRange, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { SettlementPeriod } from "@/hooks/useSettlements";

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

function extractYear(distribution: string | null, distributionKey: string): string {
  if (distribution) {
    const match = distribution.match(/\d{4}/);
    if (match) return match[0];
  }
  if (distributionKey.startsWith("WC-")) return distributionKey.slice(3, 7);
  const keyMatch = distributionKey.match(/\d{4}/);
  return keyMatch ? keyMatch[0] : "Övrigt";
}

interface YearGroup {
  year: string;
  periods: SettlementPeriod[];
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

  const yearGroups = useMemo((): YearGroup[] => {
    if (!periods || periods.length === 0) return [];
    const map = new Map<string, YearGroup>();
    for (const p of periods) {
      const year = extractYear(p.distribution, p.distributionKey);
      if (!map.has(year)) {
        map.set(year, { year, periods: [], totalAmount: 0, totalRows: 0 });
      }
      const g = map.get(year)!;
      g.periods.push(p);
      g.totalAmount += p.total;
      g.totalRows += p.rowCount;
    }
    return Array.from(map.values()).sort((a, b) => b.year.localeCompare(a.year));
  }, [periods]);

  // Auto-expand the year that contains the selected period
  const selectedYear = useMemo(() => {
    if (!selectedKey) return null;
    const p = periods.find((p) => p.distributionKey === selectedKey);
    return p ? extractYear(p.distribution, p.distributionKey) : null;
  }, [selectedKey, periods]);

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
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
            const hasSelectedPeriod = group.periods.some((p) => p.distributionKey === selectedKey);

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
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 font-normal">
                        {group.periods.length} {group.periods.length === 1 ? "period" : "perioder"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {group.totalRows.toLocaleString("sv-SE")} rader
                      </span>
                      <span className="font-medium tabular-nums text-sm">
                        {fmt(group.totalAmount)}
                      </span>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-5 mt-1 space-y-0.5 pb-1">
                    {group.periods.map((p) => {
                      const isActive = selectedKey === p.distributionKey;
                      return (
                        <button
                          key={p.distributionKey}
                          onClick={() => onSelect(isActive ? null : p.distributionKey)}
                          className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={isActive ? "font-medium" : ""}>{p.distribution}</span>
                            <Badge
                              variant={isActive ? "outline" : "secondary"}
                              className={`text-xs px-1.5 py-0 ${isActive ? "border-primary-foreground/30 text-primary-foreground" : ""}`}
                            >
                              {p.rowCount.toLocaleString("sv-SE")}
                            </Badge>
                          </div>
                          <span className={`tabular-nums text-sm ${isActive ? "" : "text-muted-foreground"}`}>
                            {fmt(p.total)}
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

        {selectedKey && (
          <p className="mt-3 text-xs text-muted-foreground border-t pt-2">
            Visar data för: <span className="font-medium text-foreground">{periods.find((p) => p.distributionKey === selectedKey)?.distribution}</span>
            {" — "}
            {fmt(periods.find((p) => p.distributionKey === selectedKey)?.total ?? 0)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
