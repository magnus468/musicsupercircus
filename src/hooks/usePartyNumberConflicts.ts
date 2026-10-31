import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePartyNumberConflicts = () => useQuery({
  queryKey: ["party-number-conflicts"],
  staleTime: 5 * 60 * 1000,
  queryFn: async () => {
    const rows: { work_id: string; party_name: string; is_publisher: boolean; conflict_note: string | null }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("work_party_numbers")
        .select("work_id, party_name, is_publisher, conflict_note")
        .eq("conflict", true).order("id").range(from, from + 999);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return rows;
  },
});