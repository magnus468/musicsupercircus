import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Settlement {
  id: string;
  work_title: string;
  work_key: string | null;
  amount: number;
  distribution: string | null;
  distribution_key: string | null;
  recipient_name: string | null;
  member_number: string | null;
  ipi_name_number: string | null;
  role: string | null;
  share: number | null;
  type_of_right: string | null;
  country: string | null;
  source: string | null;
  sub_source: string | null;
  production_title: string | null;
  episode_title: string | null;
  agreement_key: string | null;
  number_of_uses: number | null;
  from_date: string | null;
  to_date: string | null;
  composers: string | null;
  created_at: string;
}

export interface SettlementPeriod {
  distribution: string;
  distributionKey: string;
  rowCount: number;
  total: number;
}

export interface SettlementStats {
  totalAmount: number;
  totalRows: number;
  topWorks: [string, number][];
  topComposers: [string, number][];
  topCountries: [string, number][];
  topSources: [string, number][];
  byRight: Record<string, number>;
  uniqueWorks: number;
  uniqueCountries: number;
  periods: SettlementPeriod[];
}

/** Fetch paginated settlement rows with optional server-side search and period filter */
export const useSettlements = (
  page: number,
  pageSize: number,
  search: string,
  distributionKey: string | null
) => {
  return useQuery({
    queryKey: ["settlements", page, pageSize, search, distributionKey],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("settlements")
        .select("*", { count: "exact" })
        .order("amount", { ascending: false })
        .range(from, to);

      if (distributionKey) {
        query = query.eq("distribution_key", distributionKey);
      }

      if (search.trim()) {
        const q = `%${search.trim()}%`;
        query = query.or(
          `work_title.ilike.${q},composers.ilike.${q},country.ilike.${q},source.ilike.${q},production_title.ilike.${q}`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data as Settlement[], totalCount: count ?? 0 };
    },
  });
};

export interface WorkSettlementSummary {
  distribution: string;
  distribution_key: string;
  total_amount: number;
  row_count: number;
  countries: string[];
  sources: string[];
}

/** Fetch settlement breakdown for a specific work by title */
export const useWorkSettlements = (workTitle: string | undefined) => {
  return useQuery<WorkSettlementSummary[]>({
    queryKey: ["work-settlements", workTitle],
    enabled: !!workTitle,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!workTitle) return [];
      const { data, error } = await supabase
        .from("settlements")
        .select("distribution, distribution_key, amount, country, source")
        .ilike("work_title", workTitle.trim());
      if (error) throw error;

      const byPeriod = new Map<string, { distribution: string; distribution_key: string; total: number; count: number; countries: Set<string>; sources: Set<string> }>();
      (data as any[]).forEach((r) => {
        const key = r.distribution_key || "unknown";
        if (!byPeriod.has(key)) {
          byPeriod.set(key, { distribution: r.distribution || key, distribution_key: key, total: 0, count: 0, countries: new Set(), sources: new Set() });
        }
        const p = byPeriod.get(key)!;
        p.total += Number(r.amount);
        p.count += 1;
        if (r.country) p.countries.add(r.country);
        if (r.source) p.sources.add(r.source);
      });

      return Array.from(byPeriod.values())
        .map((p) => ({
          distribution: p.distribution,
          distribution_key: p.distribution_key,
          total_amount: p.total,
          row_count: p.count,
          countries: Array.from(p.countries),
          sources: Array.from(p.sources),
        }))
        .sort((a, b) => b.distribution_key.localeCompare(a.distribution_key));
    },
  });
};

export interface UnmatchedSettlementWork {
  work_title: string;
  total_amount: number;
  row_count: number;
  composers: string | null;
}

/** Fetch settlement work titles that don't match any work in the works table */
export const useUnmatchedSettlementWorks = () => {
  return useQuery<UnmatchedSettlementWork[]>({
    queryKey: ["unmatched-settlement-works"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_unmatched_settlement_works");
      if (error) throw error;
      return data as unknown as UnmatchedSettlementWork[];
    },
  });
};

/** Fetch pre-aggregated stats from the database function */
export const useSettlementStats = (distributionKey: string | null) => {
  return useQuery<SettlementStats>({
    queryKey: ["settlement-stats", distributionKey],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_settlement_stats", {
        p_distribution_key: distributionKey,
      });
      if (error) throw error;
      return data as unknown as SettlementStats;
    },
  });
};
