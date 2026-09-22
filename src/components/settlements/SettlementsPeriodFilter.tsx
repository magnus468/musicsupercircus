import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarRange, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SettlementPeriod } from "@/hooks/useSettlements";
import {
  decodeSettlementPeriodKey,
  encodeSettlementPeriodKey,
  extractYearFromLabel,
  payoutChronoValue,
  resolveStimPayoutLabels,
  type SettlementPublisher,
} from "./settlementPeriodGrouping";

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

const PublisherBadge = ({ pub }: { pub: SettlementPublisher }) => (
  <span
    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${
      pub === "MSCP"
        ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
        : "bg-primary/15 text-primary"
    }`}
    title={pub === "MSCP" ? "Music Super Circus Publishing" : "Music Super Circus Extravaganza"}
  >
    {pub}
  </span>
);

interface GroupedPeriod {
  label: string;
  publisher: SettlementPublisher;
  keys: string[];
  total: number;
  rowCount: number;
}

interface PayoutGroup {
  label: string;
  publisher: SettlementPublisher;
  keys: string[];
  periods: GroupedPeriod[];
  total: number;
  rowCount: number;
}

interface YearGroup {
  year: string;
  payouts: PayoutGroup[];
  publishers: SettlementPublisher[];
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
  const [pendingDelete, setPendingDelete] = useState<GroupedPeriod | null>(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const stimPayoutLabels = useMemo(() => resolveStimPayoutLabels(periods), [periods]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const rawKeys = pendingDelete.keys.map((key) => decodeSettlementPeriodKey(key).key);
    const { error } = await supabase
      .from("settlements")
      .delete()
      .in("distribution_key", rawKeys)
      .eq("publisher", pendingDelete.publisher);
    setDeleting(false);
    if (error) {
      toast.error("Kunde inte ta bort: " + error.message);
      return;
    }
    toast.success(`Tog bort ${pendingDelete.rowCount} rader (${pendingDelete.label})`);
    if (pendingDelete.keys.join(",") === selectedKey) onSelect(null);
    setPendingDelete(null);
    queryClient.invalidateQueries({ queryKey: ["settlements"] });
    queryClient.invalidateQueries({ queryKey: ["settlement-stats"] });
    queryClient.invalidateQueries({ queryKey: ["unmatched-settlement-works"] });
    queryClient.invalidateQueries({ queryKey: ["work-settlements"] });
  };


  // Varje avräkning (distributionsnyckel) listas separat så historiken syns
  // avräkning för avräkning. MSCE och MSCP hålls alltid isär.
  const groupedPeriods = useMemo((): GroupedPeriod[] => {
    if (!periods || periods.length === 0) return [];
    const map = new Map<string, GroupedPeriod>();
    for (const p of periods) {
      const qualifiedKey = encodeSettlementPeriodKey(p.publisher, p.distributionKey);
      const label = p.distribution || p.distributionKey;
      if (!map.has(qualifiedKey)) {
        map.set(qualifiedKey, { label, publisher: p.publisher, keys: [qualifiedKey], total: 0, rowCount: 0 });
      }
      const g = map.get(qualifiedKey);
      if (!g) continue;
      g.total += p.total;
      g.rowCount += p.rowCount;
    }
    return Array.from(map.values()).sort((a, b) =>
      decodeSettlementPeriodKey(b.keys[0]).key.localeCompare(decodeSettlementPeriodKey(a.keys[0]).key)
    );
  }, [periods]);

  // Varje utbetalning (t.ex. "Augusti 2026") samlas som en rad. Expanderas den
  // syns varje avräkningsområde som ingick i utbetalningen.
  const yearGroups = useMemo((): YearGroup[] => {
    if (groupedPeriods.length === 0) return [];

    const map = new Map<string, YearGroup>();
    const payoutMap = new Map<string, PayoutGroup>();

    for (const gp of groupedPeriods) {
      const first = decodeSettlementPeriodKey(gp.keys[0]);
      const isWc = first.key.startsWith("WC-");
      const payoutLabel = isWc ? gp.label : stimPayoutLabels.get(gp.keys[0]) ?? gp.label;
      const year = isWc
        ? first.key.slice(3, 7)
        : extractYearFromLabel(gp.label) ??
          extractYearFromLabel(payoutLabel) ??
          gp.label.match(/(\d{4})/)?.[1] ??
          "Övrigt";

      if (!map.has(year)) {
        map.set(year, { year, payouts: [], publishers: [], totalAmount: 0, totalRows: 0 });
      }
      const yg = map.get(year);
      if (!yg) continue;

      const payoutId = `${year}|${gp.publisher}|${payoutLabel}`;
      let payout = payoutMap.get(payoutId);
      if (!payout) {
        payout = {
          label: payoutLabel,
          publisher: gp.publisher,
          keys: [],
          periods: [],
          total: 0,
          rowCount: 0,
        };
        payoutMap.set(payoutId, payout);
        yg.payouts.push(payout);
      }
      payout.periods.push(gp);
      payout.keys.push(...gp.keys);
      payout.total += gp.total;
      payout.rowCount += gp.rowCount;

      if (!yg.publishers.includes(gp.publisher)) yg.publishers.push(gp.publisher);
      yg.totalAmount += gp.total;
      yg.totalRows += gp.rowCount;
    }

    // Senaste avräkningen högst upp, den första längst ner
    const chrono = (label: string, keys: string[]) =>
      Math.max(...keys.map((k) => payoutChronoValue(label, decodeSettlementPeriodKey(k).key)));

    for (const yg of map.values()) {
      yg.payouts.sort((a, b) => {
        const diff = chrono(b.label, b.keys) - chrono(a.label, a.keys);
        if (diff !== 0) return diff;
        return decodeSettlementPeriodKey(b.keys[0]).key.localeCompare(
          decodeSettlementPeriodKey(a.keys[0]).key
        );
      });
      for (const payout of yg.payouts) {
        payout.periods.sort((a, b) =>
          decodeSettlementPeriodKey(a.keys[0]).key.localeCompare(decodeSettlementPeriodKey(b.keys[0]).key)
        );
      }
    }

    return Array.from(map.values()).sort((a, b) => b.year.localeCompare(a.year));
  }, [groupedPeriods, stimPayoutLabels]);

  const selectedKeys = useMemo(() => (selectedKey ? selectedKey.split(",") : []), [selectedKey]);

  const matchesSelection = (keys: string[]) =>
    keys.length === selectedKeys.length && keys.every((k) => selectedKeys.includes(k));

  // Markerad rad kan vara antingen en hel utbetalning eller ett enskilt område
  const selectedGroupedPeriod = useMemo((): GroupedPeriod | null => {
    if (selectedKeys.length === 0) return null;
    for (const yg of yearGroups) {
      for (const payout of yg.payouts) {
        if (matchesSelection(payout.keys)) {
          return {
            label: payout.label,
            publisher: payout.publisher,
            keys: payout.keys,
            total: payout.total,
            rowCount: payout.rowCount,
          };
        }
        for (const gp of payout.periods) {
          if (matchesSelection(gp.keys)) return gp;
        }
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKeys, yearGroups]);

  const selectedYear = useMemo(() => {
    if (selectedKeys.length === 0) return null;
    for (const yg of yearGroups) {
      for (const payout of yg.payouts) {
        if (matchesSelection(payout.keys)) return yg.year;
        if (payout.periods.some((gp) => matchesSelection(gp.keys))) return yg.year;
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKeys, yearGroups]);

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };


  const handleSelectKeys = (keys: string[]) => {
    const keyStr = keys.join(",");
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
            const hasSelectedPeriod = selectedYear === group.year;

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
                      <span className="flex items-center gap-1">
                        {group.publishers.map((pub) => (
                          <PublisherBadge key={pub} pub={pub} />
                        ))}
                      </span>
                    </div>
                    <span className="font-medium tabular-nums text-sm">
                      {fmt(group.totalAmount)}
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-5 mt-1 space-y-0.5 pb-1">
                    {group.payouts.map((payout) => {
                      const payoutId = `${group.year}|${payout.publisher}|${payout.label}`;
                      const payoutKeyStr = payout.keys.join(",");
                      const isActive = selectedKey === payoutKeyStr;

                      return (
                        <div
                          key={payoutId}
                          className={`group/row w-full flex items-center rounded-md transition-colors ${
                            isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"
                          }`}
                        >
                          <button
                            onClick={() => handleSelectKeys(payout.keys)}
                            className="flex-1 flex items-center justify-between px-3 py-2 text-sm text-left"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <PublisherBadge pub={payout.publisher} />
                              <span className={`truncate ${isActive ? "font-medium" : ""}`}>
                                {payout.label}
                              </span>
                            </span>
                            <span
                              className={`tabular-nums text-sm shrink-0 ml-2 ${
                                isActive ? "" : "text-muted-foreground"
                              }`}
                            >
                              {fmt(payout.total)}
                            </span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDelete({
                                label: payout.label,
                                publisher: payout.publisher,
                                keys: payout.keys,
                                total: payout.total,
                                rowCount: payout.rowCount,
                              });
                            }}
                            title="Ta bort hela denna avräkning"
                            className={`opacity-0 group-hover/row:opacity-100 transition-opacity p-2 mr-1 rounded hover:bg-destructive/10 ${
                              isActive ? "text-primary-foreground hover:bg-primary-foreground/10" : "text-destructive"
                            }`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {selectedGroupedPeriod && (
          <p className="mt-3 text-xs text-muted-foreground border-t pt-2 flex items-center gap-2 flex-wrap">
            <span>Visar data för:</span>
            <PublisherBadge pub={selectedGroupedPeriod.publisher} />
            <span className="font-medium text-foreground">{selectedGroupedPeriod.label}</span>
            <span>— {fmt(selectedGroupedPeriod.total)}</span>
          </p>
        )}

      </CardContent>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort avräkningsperiod?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta tar permanent bort <strong>{pendingDelete?.rowCount}</strong> rader för{" "}
              <strong>{pendingDelete?.label}</strong> ({pendingDelete ? fmt(pendingDelete.total) : ""}).
              Åtgärden kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Tar bort..." : "Ta bort"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

