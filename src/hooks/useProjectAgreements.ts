import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useProjectAgreements = (projectId?: string) => {
  return useQuery({
    queryKey: ["project-agreements", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_agreements")
        .select("agreement_id")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data.map((d: any) => d.agreement_id as string);
    },
  });
};

export const useSaveProjectAgreements = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, agreementIds }: { projectId: string; agreementIds: string[] }) => {
      // Delete existing links
      const { error: delError } = await supabase
        .from("project_agreements")
        .delete()
        .eq("project_id", projectId);
      if (delError) throw delError;

      // Insert new links
      if (agreementIds.length > 0) {
        const { error: insError } = await supabase
          .from("project_agreements")
          .insert(agreementIds.map((aid) => ({ project_id: projectId, agreement_id: aid })));
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-agreements"] });
    },
  });
};
