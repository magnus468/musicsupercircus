import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

interface Props {
  country: string | null;
  onClose: () => void;
  distributionKey: string | null;
}

/** Extract a display year from a distribution_key */
function extractYear(dk: string): string {
  if (dk.startsWith("WC-")) {
    return dk.slice(3, 7);
  }
  // STIM keys are like "1961", "1954" etc
  return dk.slice(0, 4);
}

export const CountryWorksDialog = ({ country, onClose, distributionKey }: Props) => {
  const [yearFilter, setYearFilter] = useState<string>("all");

  // Reset year filter when country changes
  useEffect(() => {
    setYearFilter("all");
  }, [country]);

  const { data, isLoading } = useQuery({
    queryKey: ["country-works", country, distributionKey, yearFilter],
    enabled: !!country,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!country) return { works: [], years: [] };

      // First get available years for this country
      let yearsQuery = supabase
        .from("settlements")
        .select("distribution_key")
        .eq("country", country);

      if (distributionKey) {
        yearsQuery = yearsQuery.eq("distribution_key", distributionKey);
      }

      const { data: yearRows } = await yearsQuery;
      const yearSet = new Set<string>();
      (yearRows ?? []).forEach((r: any) => {
        if (r.distribution_key) yearSet.add(extractYear(r.distribution_key));
      });
      const years = Array.from(yearSet).sort().reverse();

      // Now get works grouped by title
      let query = supabase
        .from("settlements")
        .select("work_title, amount, distribution_key, composers")
        .eq("country", country);

      if (distributionKey) {
        query = query.eq("distribution_key", distributionKey);
      }

      const { data: rows, error } = await query;
      if (error) throw error;

      // Filter by year client-side and aggregate
      const workMap = new Map<string, { total: number; count: number; composers: string | null }>();
      (rows ?? []).forEach((r: any) => {
        if (yearFilter !== "all" && r.distribution_key) {
          const ry = extractYear(r.distribution_key);
          if (ry !== yearFilter) return;
        }
        const existing = workMap.get(r.work_title);
        if (existing) {
          existing.total += Number(r.amount);
          existing.count += 1;
        } else {
          workMap.set(r.work_title, { total: Number(r.amount), count: 1, composers: r.composers });
        }
      });

      const works = Array.from(workMap.entries())
        .map(([title, d]) => ({ title, total: d.total, count: d.count, composers: d.composers }))
        .sort((a, b) => b.total - a.total);

      return { works, years };
    },
  });

  const totalForCountry = (data?.works ?? []).reduce((s, w) => s + w.total, 0);

  return (
    <Dialog open={!!country} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Verk från {country}</span>
            <Badge variant="secondary" className="text-xs">
              {fmt(totalForCountry)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {(data?.years?.length ?? 0) > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">År:</span>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla år</SelectItem>
                {data?.years.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Laddar...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Verk</TableHead>
                  <TableHead>Upphovsperson</TableHead>
                  <TableHead className="text-right">Rader</TableHead>
                  <TableHead className="text-right">Belopp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.works ?? []).map((w) => (
                  <TableRow key={w.title}>
                    <TableCell className="font-medium">{w.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{w.composers ?? "–"}</TableCell>
                    <TableCell className="text-right tabular-nums">{w.count}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{fmt(w.total)}</TableCell>
                  </TableRow>
                ))}
                {(data?.works ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Inga verk hittades
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
