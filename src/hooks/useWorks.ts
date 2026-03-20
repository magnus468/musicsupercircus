import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Work = Tables<"works">;
export type WorkInsert = TablesInsert<"works">;
export type WorkUpdate = TablesUpdate<"works">;

export const useWorks = (search?: string) => {
  return useQuery({
    queryKey: ["works", search],
    queryFn: async () => {
      let query = supabase.from("works").select("*").order("created_at", { ascending: false });
      if (search && search.trim()) {
        const term = search.trim();
        const s = `%${term}%`;
        // Also search with accent variants (é↔e, ö↔o, etc.)
        const normalized = term.replace(/[éèê]/gi, 'e').replace(/[öô]/gi, 'o').replace(/[åâä]/gi, 'a').replace(/[ü]/gi, 'u');
        const accented = term !== normalized ? `%${normalized}%` : null;
        const filters = [`title.ilike.${s}`, `creators.ilike.${s}`, `project.ilike.${s}`];
        if (accented) {
          filters.push(`title.ilike.${accented}`, `creators.ilike.${accented}`, `project.ilike.${accented}`);
        }
        query = query.or(filters.join(','));
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Work[];
    },
  });
};

export const useCreateWork = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (work: WorkInsert) => {
      const { data, error } = await supabase.from("works").insert(work).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["works"] }),
  });
};

export const useUpdateWork = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: WorkUpdate & { id: string }) => {
      const { data, error } = await supabase.from("works").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["works"] }),
  });
};

export const useDeleteWork = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("works").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["works"] }),
  });
};

export const useWorksStats = () => {
  return useQuery({
    queryKey: ["works-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("works").select("*");
      if (error) throw error;
      const works = data as Work[];
      const total = works.length;
      const byType: Record<string, number> = { original: 0, MSCE: 0, MSCP: 0, administration: 0 };
      const byCreator: Record<string, number> = {};
      const byStimStatus = { anmäld: 0, claimad: 0, ej_anmäld: 0 };
      const coPublishers: Record<string, number> = {};

      works.forEach((w) => {
        byType[w.publishing_type]++;
        byStimStatus[w.stim_status]++;
        w.creators.split(/[,/]/).forEach((c) => {
          const name = c.trim();
          if (name) byCreator[name] = (byCreator[name] || 0) + 1;
        });
        w.co_publishers?.forEach((cp) => {
          coPublishers[cp] = (coPublishers[cp] || 0) + 1;
        });
      });

      const topCreators = Object.entries(byCreator)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

      const topCoPublishers = Object.entries(coPublishers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      return { total, byType, byStimStatus, topCreators, topCoPublishers };
    },
  });
};

export const useCoPublisherOptions = () => {
  return useQuery({
    queryKey: ["co-publisher-options"],
    queryFn: async () => {
      const [worksRes, clientsRes] = await Promise.all([
        supabase.from("works").select("co_publishers"),
        supabase.from("clients").select("first_name, organization, id").eq("client_type", "company"),
      ]);
      if (worksRes.error) throw worksRes.error;
      if (clientsRes.error) throw clientsRes.error;
      const set = new Set<string>();
      (worksRes.data as { co_publishers: string[] | null }[]).forEach((w) => {
        w.co_publishers?.forEach((cp) => set.add(cp));
      });
      (clientsRes.data as { first_name: string; organization: string | null }[]).forEach((c) => {
        const name = c.organization || c.first_name;
        if (name) set.add(name);
      });
      return Array.from(set).sort();
    },
  });
};
