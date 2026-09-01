import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RevenueByCountry {
  country: string;
  total: number;
}

export interface RevenueBySource {
  source: string;
  total: number;
}

interface Breakdown {
  byCountry: RevenueByCountry[];
  bySource: RevenueBySource[];
}

export const useWorkRevenueBreakdown = (workTitle: string | undefined) => {
  const query = useQuery<Breakdown>({
    queryKey: ["work-revenue-breakdown", workTitle],
    enabled: !!workTitle,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settlements")
        .select("country, source, amount")
        .ilike("work_title", workTitle!.trim());
      if (error) throw error;

      const countryMap = new Map<string, number>();
      const sourceMap = new Map<string, number>();
      (data as any[]).forEach((r) => {
        const c = r.country || "Okänt";
        countryMap.set(c, (countryMap.get(c) || 0) + Number(r.amount));
        const s = r.source || "Okänt";
        sourceMap.set(s, (sourceMap.get(s) || 0) + Number(r.amount));
      });

      return {
        byCountry: Array.from(countryMap.entries())
          .map(([country, total]) => ({ country, total }))
          .sort((a, b) => b.total - a.total),
        bySource: Array.from(sourceMap.entries())
          .map(([source, total]) => ({ source, total }))
          .sort((a, b) => b.total - a.total),
      };
    },
  });

  // Keep the previous API shape (two query-like objects) for consumers.
  const byCountry = {
    ...query,
    data: query.data?.byCountry,
  } as unknown as ReturnType<typeof useQuery<RevenueByCountry[]>>;
  const bySource = {
    ...query,
    data: query.data?.bySource,
  } as unknown as ReturnType<typeof useQuery<RevenueBySource[]>>;

  return { byCountry, bySource };
};
