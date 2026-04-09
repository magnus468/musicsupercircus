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

interface WorkRow {
  title: string;
  total: number;
  count: number;
  composers: string | null;
}

export const CountryWorksDialog = ({ country, onClose, distributionKey }: Props) => {
  const [yearFilter, setYearFilter] = useState<string>("all");

  useEffect(() => {
    setYearFilter("all");
  }, [country]);

  const { data, isLoading } = useQuery({
    queryKey: ["country-works", country, distributionKey, yearFilter],
    enabled: !!country,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!country) return { works: [] as WorkRow[], years: [] as string[] };

      const { data: result, error } = await supabase.rpc("get_country_works", {
        p_country: country,
        p_distribution_key: distributionKey,
        p_year: yearFilter === "all" ? null : yearFilter,
      } as any);
      if (error) throw error;

      const parsed = result as unknown as { works: WorkRow[]; years: string[] };
      return parsed;
    },
  });

  // For the year selector, fetch all years (without year filter)
  const { data: allData } = useQuery({
    queryKey: ["country-works-years", country, distributionKey],
    enabled: !!country,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!country) return { works: [], years: [] as string[] };
      const { data: result, error } = await supabase.rpc("get_country_works", {
        p_country: country,
        p_distribution_key: distributionKey,
      } as any);
      if (error) throw error;
      return result as unknown as { works: WorkRow[]; years: string[] };
    },
  });

  const years = allData?.years ?? [];
  const works = data?.works ?? [];
  const totalForCountry = works.reduce((s, w) => s + w.total, 0);

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

        {years.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">År:</span>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla år</SelectItem>
                {years.map((y) => (
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
                {works.map((w) => (
                  <TableRow key={w.title}>
                    <TableCell className="font-medium">{w.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{w.composers ?? "–"}</TableCell>
                    <TableCell className="text-right tabular-nums">{w.count}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{fmt(w.total)}</TableCell>
                  </TableRow>
                ))}
                {works.length === 0 && (
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
