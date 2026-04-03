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

export const useSettlements = () => {
  return useQuery({
    queryKey: ["settlements"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Fetch all rows (may exceed 1000 default limit)
      let all: Settlement[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("settlements")
          .select("*")
          .order("amount", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data as Settlement[]);
        if (!data || data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });
};

export const useSettlementStats = () => {
  return useQuery({
    queryKey: ["settlement-stats"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      let all: Settlement[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("settlements")
          .select("*")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data as Settlement[]);
        if (!data || data.length < PAGE) break;
        from += PAGE;
      }

      const totalAmount = all.reduce((s, r) => s + Number(r.amount), 0);
      const totalRows = all.length;

      // By work title
      const byWork: Record<string, number> = {};
      all.forEach((r) => {
        byWork[r.work_title] = (byWork[r.work_title] || 0) + Number(r.amount);
      });
      const topWorks = Object.entries(byWork)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

      // By composer
      const byComposer: Record<string, number> = {};
      all.forEach((r) => {
        if (r.composers) {
          byComposer[r.composers] = (byComposer[r.composers] || 0) + Number(r.amount);
        }
      });
      const topComposers = Object.entries(byComposer)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

      // By country
      const byCountry: Record<string, number> = {};
      all.forEach((r) => {
        if (r.country) {
          byCountry[r.country] = (byCountry[r.country] || 0) + Number(r.amount);
        }
      });
      const topCountries = Object.entries(byCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      // By source
      const bySource: Record<string, number> = {};
      all.forEach((r) => {
        if (r.source) {
          bySource[r.source] = (bySource[r.source] || 0) + Number(r.amount);
        }
      });
      const topSources = Object.entries(bySource)
        .sort((a, b) => b[1] - a[1]);

      // By type of right
      const byRight: Record<string, number> = {};
      all.forEach((r) => {
        if (r.type_of_right) {
          byRight[r.type_of_right] = (byRight[r.type_of_right] || 0) + Number(r.amount);
        }
      });

      const uniqueWorks = Object.keys(byWork).length;
      const uniqueCountries = Object.keys(byCountry).length;

      return { totalAmount, totalRows, topWorks, topComposers, topCountries, topSources, byRight, uniqueWorks, uniqueCountries };
    },
  });
};
