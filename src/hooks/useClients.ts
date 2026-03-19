import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;
export type ClientInsert = TablesInsert<"clients">;
export type ClientUpdate = TablesUpdate<"clients">;

export const useClients = (search?: string) => {
  return useQuery({
    queryKey: ["clients", search],
    queryFn: async () => {
      let query = supabase.from("clients").select("*").order("first_name").order("last_name");
      if (search && search.trim()) {
        const term = search.trim();
        const s = `%${term}%`;
        const normalized = term.replace(/[éèê]/gi, 'e').replace(/[öô]/gi, 'o').replace(/[åâä]/gi, 'a').replace(/[ü]/gi, 'u');
        const accented = term !== normalized ? `%${normalized}%` : null;
        const fields = ['first_name', 'last_name', 'email', 'organization', 'city', 'country'];
        const filters = fields.map(f => `${f}.ilike.${s}`);
        if (accented) {
          filters.push(...fields.map(f => `${f}.ilike.${accented}`));
        }
        query = query.or(filters.join(','));
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Client[];
    },
  });
};

export const useClient = (id?: string) => {
  return useQuery({
    queryKey: ["clients", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Client;
    },
  });
};

export const useCreateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      const { data, error } = await supabase.from("clients").insert(client).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useUpdateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
      const { data, error } = await supabase.from("clients").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useDeleteClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
};
