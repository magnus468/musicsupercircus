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

export const useWorkRevenueBreakdown = (workTitle: string | undefined) => {
  const byCountry = useQuery<RevenueByCountry[]>({
    queryKey: ["work-revenue-country", workTitle],
    enabled: !!workTitle,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settlements")
        .select("country, amount")
        .ilike("work_title", workTitle!.trim());
      if (error) throw error;
      const map = new Map<string, number>();
      (data as any[]).forEach((r) => {
        const c = r.country || "Okänt";
        map.set(c, (map.get(c) || 0) + Number(r.amount));
      });
      return Array.from(map.entries())
        .map(([country, total]) => ({ country, total }))
        .sort((a, b) => b.total - a.total);
    },
  });

  const bySource = useQuery<RevenueBySource[]>({
    queryKey: ["work-revenue-source", workTitle],
    enabled: !!workTitle,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settlements")
        .select("source, amount")
        .ilike("work_title", workTitle!.trim());
      if (error) throw error;
      const map = new Map<string, number>();
      (data as any[]).forEach((r) => {
        const s = r.source || "Okänt";
        map.set(s, (map.get(s) || 0) + Number(r.amount));
      });
      return Array.from(map.entries())
        .map(([source, total]) => ({ source, total }))
        .sort((a, b) => b.total - a.total);
    },
  });

  return { byCountry, bySource };
};
