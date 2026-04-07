import { useQuery } from "@tanstack/react-query";
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
