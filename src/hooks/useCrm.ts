import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { StickyNote, Phone, Mail, CalendarDays, ListChecks } from "lucide-react";

export const typeMeta: Record<string, { label: string; icon: typeof StickyNote; className: string }> = {
  note: { label: "Anteckning", icon: StickyNote, className: "bg-violet-100 text-violet-700" },
  call: { label: "Samtal", icon: Phone, className: "bg-blue-100 text-blue-700" },
  email: { label: "E-post", icon: Mail, className: "bg-emerald-100 text-emerald-700" },
  meeting: { label: "Möte", icon: CalendarDays, className: "bg-amber-100 text-amber-700" },
  task: { label: "Uppgift", icon: ListChecks, className: "bg-rose-100 text-rose-700" },
};

export type CrmActivity = Tables<"crm_activities">;
export type CrmActivityInsert = TablesInsert<"crm_activities">;
export type CrmActivityUpdate = TablesUpdate<"crm_activities">;

export type FollowUp = CrmActivity & {
  clients: { id: string; first_name: string | null; last_name: string | null; organization: string | null } | null;
};

export const useClientActivities = (clientId?: string) => {
  return useQuery({
    queryKey: ["crm-activities", clientId],
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("client_id", clientId!)
        .order("activity_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmActivity[];
    },
  });
};

export const useCreateActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (activity: CrmActivityInsert) => {
      const { data, error } = await supabase.from("crm_activities").insert(activity).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: CrmActivity) => {
      qc.invalidateQueries({ queryKey: ["crm-activities", data.client_id] });
      qc.invalidateQueries({ queryKey: ["crm-followups"] });
    },
  });
};

export const useUpdateActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: CrmActivityUpdate & { id: string }) => {
      const { data, error } = await supabase.from("crm_activities").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: CrmActivity) => {
      qc.invalidateQueries({ queryKey: ["crm-activities", data.client_id] });
      qc.invalidateQueries({ queryKey: ["crm-followups"] });
    },
  });
};

export const useDeleteActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-activities"] });
      qc.invalidateQueries({ queryKey: ["crm-followups"] });
    },
  });
};

export const useFollowUps = () => {
  return useQuery({
    queryKey: ["crm-followups"],
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_activities")
        .select("*, clients(id, first_name, last_name, organization)")
        .eq("status", "open")
        .not("follow_up_date", "is", null)
        .order("follow_up_date", { ascending: true });
      if (error) throw error;
      return data as FollowUp[];
    },
  });
};
