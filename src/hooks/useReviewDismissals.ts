import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Ärenden som manuellt tagits bort från Granska verk – visas aldrig igen. */
export const useReviewDismissals = () => {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["review_dismissals"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const all: { section: string; item_key: string }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await (supabase as any)
          .from("review_dismissals").select("section, item_key").range(from, from + 999);
        if (error) throw error;
        all.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return new Set(all.map((d) => `${d.section}:${d.item_key}`));
    },
  });
  const set = data ?? new Set<string>();
  const isDismissed = (section: string, key: string) => set.has(`${section}:${key}`);
  const dismiss = async (section: string, key: string) => {
    if (!confirm("Ta bort från granskningslistan? Ärendet visas inte igen.")) return;
    qc.setQueryData(["review_dismissals"], new Set(set).add(`${section}:${key}`));
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("review_dismissals")
      .upsert({ section, item_key: key, dismissed_by: u.user?.id ?? null }, { onConflict: "section,item_key" });
    if (error) {
      qc.invalidateQueries({ queryKey: ["review_dismissals"] });
      return toast.error("Kunde inte ta bort från listan");
    }
    toast.success("Borttagen från granskningslistan");
  };
  return { isDismissed, dismiss };
};
