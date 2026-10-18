import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorks } from "@/hooks/useWorks";
import { useAgreements } from "@/hooks/useAgreements";
import { useUnmatchedSettlementWorks } from "@/hooks/useSettlements";
import { useWorkRegistrations } from "@/hooks/useWorkRegistrations";
import { detectIssues } from "@/lib/workIssues";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Music, AlertTriangle, Copy, Film, FileCheck, FileWarning, ListChecks, ArrowRight, CheckCircle2,
} from "lucide-react";

const fmtKr = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kr";

interface Task {
  id: string;
  title: string;
  description: string;
  count: number | null; // null = loading
  extra?: string;
  to: string;
  icon: React.ReactNode;
  urgent?: boolean;
}

const Dashboard = () => {
  const { data: works } = useWorks();
  const { data: agreements } = useAgreements();
  const { data: unmatchedWorks } = useUnmatchedSettlementWorks();
  const { data: regs } = useWorkRegistrations();

  const { data: conflictCount } = useQuery({
    queryKey: ["party-number-conflicts-count"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("work_party_numbers")
        .select("id", { count: "exact", head: true })
        .eq("conflict", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: soundtrackCount } = useQuery({
    queryKey: ["unregistered-soundtrack-titles-count"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_unregistered_soundtrack_titles");
      if (error) throw error;
      const titles = (data as { titles?: unknown[] }[] | null) ?? [];
      return titles.reduce((sum, g) => sum + (g.titles?.length ?? 0), 0);
    },
  });

  const { data: stimCounts } = useQuery({
    queryKey: ["stim-works-counts"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [uncertain, unmatched] = await Promise.all([
        supabase.from("stim_works").select("id", { count: "exact", head: true }).eq("match_status", "uncertain"),
        supabase.from("stim_works").select("id", { count: "exact", head: true }).eq("match_status", "unmatched"),
      ]);
      if (uncertain.error) throw uncertain.error;
      if (unmatched.error) throw unmatched.error;
      return { uncertain: uncertain.count ?? 0, unmatched: unmatched.count ?? 0 };
    },
  });

  const agreementClientNames = useMemo(() => {
    const set = new Set<string>();
    agreements?.forEach((a) => {
      if (a.client_name) set.add(a.client_name.toLowerCase());
    });
    return set;
  }, [agreements]);

  const workIssueCount = useMemo(() => {
    if (!works || !agreements) return null;
    return works.filter((w) => detectIssues(w, agreementClientNames).length > 0).length;
  }, [works, agreements, agreementClientNames]);

  const duplicateCount = useMemo(() => {
    if (!works) return null;
    const key = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
    const m = new Map<string, number>();
    works.forEach((w) => {
      const k = `${key(w.title)}||${key(w.project)}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return [...m.values()].filter((n) => n > 1).length;
  }, [works]);

  const shareMismatchCount = useMemo(() => {
    if (!regs) return null;
    return regs.filter((r) => r.work_id && r.share_mismatch).length;
  }, [regs]);

  const unmatchedTotal = useMemo(
    () => (unmatchedWorks ?? []).reduce((sum, u) => sum + Number(u.total_amount), 0),
    [unmatchedWorks]
  );

  // Priority order: money first, then data conflicts, then structural issues.
  const tasks: Task[] = [
    {
      id: "unmatched",
      title: "Omatchade avräkningsverk",
      description: "Verk med intäkter i avräkningar som inte matchar något verk i verklistan.",
      count: unmatchedWorks ? unmatchedWorks.length : null,
      extra: unmatchedWorks && unmatchedWorks.length > 0 ? `${fmtKr(unmatchedTotal)} väntar på koppling` : undefined,
      to: "/review#unmatched",
      icon: <Music className="h-5 w-5" />,
      urgent: true,
    },
    {
      id: "mismatch",
      title: "Avvikande andelar mot STIM",
      description: "STIM-kvitton där andelarna skiljer sig från katalogen.",
      count: shareMismatchCount,
      to: "/review#registrations",
      icon: <FileWarning className="h-5 w-5" />,
      urgent: true,
    },
    {
      id: "conflicts",
      title: "Konflikter i IPI/avtalsnummer",
      description: "Parter där nummer skiljer sig mellan klientkort och STIM-kvitton.",
      count: conflictCount ?? null,
      to: "/review#conflicts",
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    {
      id: "issues",
      title: "Verk med problem",
      description: "Saknar förlag, felaktig split, saknar representation, projekt eller avtal.",
      count: workIssueCount,
      to: "/review#issues",
      icon: <ListChecks className="h-5 w-5" />,
    },
    {
      id: "duplicates",
      title: "Möjliga dubbletter",
      description: "Verk med samma titel och projekt men olika upphovspersoner.",
      count: duplicateCount,
      to: "/review#duplicates",
      icon: <Copy className="h-5 w-5" />,
    },
    {
      id: "soundtracks",
      title: "Saknade soundtrackverk",
      description: "Soundtracktitlar i projekt som saknar egen verksregistrering.",
      count: soundtrackCount ?? null,
      to: "/review#soundtracks",
      icon: <Film className="h-5 w-5" />,
    },
    {
      id: "stim",
      title: "STIM-avstämning",
      description: "STIM-verk som är osäkert kopplade eller saknas i katalogen.",
      count: stimCounts ? stimCounts.uncertain + stimCounts.unmatched : null,
      extra: stimCounts ? `${stimCounts.uncertain} osäkra · ${stimCounts.unmatched} saknas` : undefined,
      to: "/review#stim",
      icon: <FileCheck className="h-5 w-5" />,
    },
  ];

  const open = tasks.filter((t) => t.count === null || t.count > 0);
  const done = tasks.filter((t) => t.count === 0);
  const totalOpen = tasks.reduce((sum, t) => sum + (t.count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Att göra</h1>
          <p className="text-sm text-muted-foreground">
            {tasks.some((t) => t.count === null)
              ? "Laddar uppgifter…"
              : totalOpen > 0
                ? `${totalOpen.toLocaleString("sv-SE")} öppna punkter – mest brådskande först`
                : "Allt är avklarat – snyggt! 🎉"}
          </p>
        </div>
        <Link to="/review" className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80 whitespace-nowrap">
          Öppna Granska verk
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {open.map((t) => (
          <Link key={t.id} to={t.to} className="group">
            <Card className={`h-full overflow-hidden transition-shadow duration-200 hover:shadow-md ${t.urgent && (t.count ?? 0) > 0 ? "ring-1 ring-destructive/30" : ""}`}>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.urgent && (t.count ?? 0) > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                    {t.icon}
                  </div>
                  <Badge variant={t.urgent && (t.count ?? 0) > 0 ? "destructive" : "secondary"} className="text-sm tabular-nums">
                    {t.count === null ? "…" : t.count.toLocaleString("sv-SE")}
                  </Badge>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{t.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                  {t.extra && <p className="mt-1 text-xs font-medium text-muted-foreground">{t.extra}</p>}
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Åtgärda <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Klart just nu</p>
          <div className="flex flex-wrap gap-2">
            {done.map((t) => (
              <Link key={t.id} to={t.to}>
                <Badge variant="outline" className="gap-1.5 py-1.5 text-muted-foreground hover:bg-accent">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {t.title}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
