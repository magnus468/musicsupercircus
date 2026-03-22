import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Project = {
  id: string;
  project_number: string | null;
  name: string;
  client: string | null;
  supervisor: string | null;
  description: string | null;
  composer: string | null;
  publishing: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export const useProjects = () => {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Project[];
    },
  });
};

export const useProject = (name: string) => {
  return useQuery({
    queryKey: ["projects", name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("name", name)
        .maybeSingle();
      if (error) throw error;
      return data as Project | null;
    },
    enabled: !!name,
  });
};

export const useUpdateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
};
