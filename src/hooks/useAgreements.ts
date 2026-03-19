import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Agreement {
  id: string;
  client_id: string;
  agreement_type: string;
  agreement_date: string;
  expiry_date: string | null;
  share_percentage: number | null;
  status: string;
  notes: string | null;
  life_of_copyright: boolean;
  file_path: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  work_ids?: string[];
}

export interface AgreementInsert {
  client_id: string;
  agreement_type: string;
  agreement_date: string;
  expiry_date?: string | null;
  share_percentage?: number | null;
  status?: string;
  notes?: string | null;
  life_of_copyright?: boolean;
  file_path?: string | null;
}

export const useAgreements = () => {
  return useQuery({
    queryKey: ["agreements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreements")
        .select("*, clients(first_name, last_name, organization)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((a) => ({
        ...a,
        client_name: a.clients
          ? a.clients.organization || `${a.clients.first_name} ${a.clients.last_name}`.trim()
          : "Okänd",
      })) as Agreement[];
    },
  });
};

export const useAgreementWorks = (agreementId?: string) => {
  return useQuery({
    queryKey: ["agreement-works", agreementId],
    enabled: !!agreementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreement_works")
        .select("work_id")
        .eq("agreement_id", agreementId!);
      if (error) throw error;
      return data.map((d: any) => d.work_id as string);
    },
  });
};

export const useCreateAgreement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workIds, ...agreement }: AgreementInsert & { workIds?: string[] }) => {
      const { data, error } = await supabase.from("agreements").insert(agreement).select().single();
      if (error) throw error;
      if (workIds?.length) {
        const { error: linkError } = await supabase.from("agreement_works").insert(
          workIds.map((work_id) => ({ agreement_id: (data as any).id, work_id }))
        );
        if (linkError) throw linkError;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agreements"] }),
  });
};

export const useDeleteAgreement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agreements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agreements"] }),
  });
};

export const uploadAgreementFile = async (file: File, agreementId: string) => {
  const ext = file.name.split(".").pop();
  const path = `${agreementId}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("agreements")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from("agreements")
    .update({ file_path: path })
    .eq("id", agreementId);
  if (updateError) throw updateError;

  return path;
};

export const getAgreementFileUrl = (filePath: string) => {
  const { data } = supabase.storage.from("agreements").getPublicUrl(filePath);
  return data.publicUrl;
};

export const getAgreementSignedUrl = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from("agreements")
    .createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
};
