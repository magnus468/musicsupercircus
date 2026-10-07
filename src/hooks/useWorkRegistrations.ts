import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RegParty = {
  role: string;
  name: string;
  ipi: string | null;
  agreement?: string | null;
  perf: number;
  mech: number | null;
};

export type WorkRegistration = {
  id: string;
  work_id: string | null;
  title: string;
  alt_title: string | null;
  duration: string | null;
  artist: string | null;
  folder: string | null;
  file_name: string | null;
  pdf_path: string | null;
  creators: RegParty[];
  publishers: RegParty[];
  match_status: "matched" | "uncertain" | "unmatched";
  match_note: string | null;
  share_mismatch: boolean;
  mismatch_note: string | null;
};

const COLS =
  "id, work_id, title, alt_title, duration, artist, folder, file_name, pdf_path, creators, publishers, match_status, match_note, share_mismatch, mismatch_note";

export const useWorkRegistrations = (workId?: string) =>
  useQuery({
    queryKey: ["work_registrations", workId ?? "all"],
    queryFn: async () => {
      const all: WorkRegistration[] = [];
      for (let from = 0; ; from += 1000) {
        let q = supabase.from("work_registrations").select(COLS).order("title").range(from, from + 999);
        if (workId) q = q.eq("work_id", workId);
        const { data, error } = await q;
        if (error) throw error;
        all.push(...((data ?? []) as unknown as WorkRegistration[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
  });

export const useInvalidateRegistrations = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["work_registrations"] });
};

export const openRegistrationPdf = async (path: string) => {
  const win = window.open("", "_blank");
  const { data, error } = await supabase.storage.from("work-registrations").createSignedUrl(path, 600);
  if (error || !data) {
    win?.close();
    throw error ?? new Error("Ingen länk");
  }
  if (win) win.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
};
