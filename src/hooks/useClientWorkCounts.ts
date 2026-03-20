import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useClientWorkCounts = () => {
  return useQuery({
    queryKey: ["client-work-counts"],
    queryFn: async () => {
      const [clientsRes, worksRes, agreementsRes, awRes] = await Promise.all([
        supabase.from("clients").select("id, first_name, last_name"),
        supabase.from("works").select("id, creators"),
        supabase.from("agreements").select("id, client_id"),
        supabase.from("agreement_works").select("agreement_id, work_id"),
      ]);
      if (clientsRes.error) throw clientsRes.error;
      if (worksRes.error) throw worksRes.error;
      if (agreementsRes.error) throw agreementsRes.error;
      if (awRes.error) throw awRes.error;

      // Build client_id -> Set<work_id>
      const counts: Record<string, Set<string>> = {};

      // Agreement-based linking
      const clientByAgreement: Record<string, string> = {};
      for (const a of agreementsRes.data) {
        clientByAgreement[a.id] = a.client_id;
      }
      for (const aw of awRes.data) {
        const clientId = clientByAgreement[aw.agreement_id];
        if (clientId) {
          if (!counts[clientId]) counts[clientId] = new Set();
          counts[clientId].add(aw.work_id);
        }
      }

      // Name-based matching
      const clientNames: { id: string; name: string }[] = clientsRes.data.map((c: any) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`.trim().toLowerCase(),
      }));

      for (const w of worksRes.data as { id: string; creators: string }[]) {
        const creatorNames = (w.creators.match(/(?:^|,\s*)([^,(]+?)(?:\s*\([^)]*\))?(?=,|$)/g) || [])
          .map((c: string) => c.replace(/^,\s*/, "").replace(/\s*\(.*\)$/, "").trim().toLowerCase());
        for (const cn of clientNames) {
          if (cn.name && creatorNames.includes(cn.name)) {
            if (!counts[cn.id]) counts[cn.id] = new Set();
            counts[cn.id].add(w.id);
          }
        }
      }

      // Convert to simple count map
      const result: Record<string, number> = {};
      for (const [clientId, workSet] of Object.entries(counts)) {
        result[clientId] = workSet.size;
      }
      return result;
    },
  });
};
