import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Disc3, Link2, Pencil, RefreshCw, Play } from "lucide-react";
import InlineAudioButton from "@/components/works/InlineAudioButton";
import { resolveAudioUrl } from "@/lib/audioLink";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Recording = Tables<"recordings">;
type WorkLite = { id: string; title: string; project: string | null; audio_url: string | null };

const pct = (v: number | null) => (v == null ? "–" : `${Math.round(v * 1000) / 10}%`);

const Cover = ({ url }: { url?: string | null }) => {
  const { data } = useQuery({
    queryKey: ["cover", url],
    enabled: !!url,
    staleTime: 50 * 60 * 1000,
    queryFn: () => resolveAudioUrl(url),
  });
  if (!data) return <div className="h-10 w-10 shrink-0 rounded bg-muted flex items-center justify-center"><Disc3 className="h-4 w-4 text-muted-foreground" /></div>;
  return <img src={data} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />;
};

const RecordingsList = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Recording | null>(null);
  const [form, setForm] = useState({ isrc: "", audio_url: "", cover_url: "", work_id: "" });
  const [workSearch, setWorkSearch] = useState("");
  const [spotifyPlay, setSpotifyPlay] = useState<Recording | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ["recordings"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const all: Recording[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("recordings").select("*").order("catalog_number").range(from, from + 999);
        if (error) throw error;
        all.push(...data);
        if (data.length < 1000) break;
      }
      return all;
    },
  });
  const { data: works = [] } = useQuery({
    queryKey: ["works-lite"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Databasen returnerar max 1000 rader per begäran — hämta i sidor
      const all: WorkLite[] = [];
      for (let from = 0; from < 20000; from += 1000) {
        const { data, error } = await supabase.from("works").select("id,title,project,audio_url").order("id").range(from, from + 999);
        if (error) throw error;
        all.push(...(data as WorkLite[]));
        if (data.length < 1000) break;
      }
      return all;
    },
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-covers"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("name,cover_url").not("cover_url", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const workMap = useMemo(() => new Map(works.map((w) => [w.id, w])), [works]);
  const coverMap = useMemo(() => new Map(projects.map((p) => [p.name.trim().toLowerCase(), p.cover_url])), [projects]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return recordings;
    return recordings.filter((r) =>
      [r.track, r.isrc, r.project, r.album, r.artist, r.composer, r.catalog_number, r.label].some((v) => v?.toLowerCase().includes(t)),
    );
  }, [recordings, search]);

  const save = useMutation({
    mutationFn: async () => {
      if (!edit) return;
      const { error } = await supabase.from("recordings").update({
        isrc: form.isrc || null,
        audio_url: form.audio_url || null,
        cover_url: form.cover_url || null,
        work_id: form.work_id || null,
      }).eq("id", edit.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recordings"] }); setEdit(null); toast.success("Inspelningen sparad"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (r: Recording) => {
    setEdit(r);
    setForm({ isrc: r.isrc ?? "", audio_url: r.audio_url ?? "", cover_url: r.cover_url ?? "", work_id: r.work_id ?? "" });
    setWorkSearch("");
  };

  const workOptions = useMemo(() => {
    const t = workSearch.trim().toLowerCase();
    if (!t) return [];
    return works.filter((w) => w.title.toLowerCase().includes(t) || w.project?.toLowerCase().includes(t)).slice(0, 20);
  }, [works, workSearch]);

  const linked = recordings.filter((r) => r.work_id).length;
  const onSpotify = recordings.filter((r) => r.spotify_track_id).length;

  const runSpotifySync = async () => {
    setSyncing(true);
    let updated = 0;
    let notFound = 0;
    try {
      for (let i = 0; i < 20; i++) {
        const { data, error } = await supabase.functions.invoke("spotify-sync", { body: { limit: 200 } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        updated += data?.updated ?? 0;
        notFound += data?.notFound ?? 0;
        toast.info(`Hämtar från Spotify… ${updated} hittade, ${data?.remaining ?? 0} kvar`);
        if (!data?.scanned || !data?.remaining) break;
      }
      await qc.invalidateQueries({ queryKey: ["recordings"] });
      toast.success(`Klart: ${updated} inspelningar hittades på Spotify, ${notFound} saknades.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hämtningen misslyckades");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Sök låt, ISRC, projekt, artist…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <span className="text-sm text-muted-foreground">{filtered.length} inspelningar · {linked} kopplade till verk · {onSpotify} på Spotify</span>
        <Button variant="outline" size="sm" onClick={runSpotifySync} disabled={syncing} className="ml-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Hämtar från Spotify…" : "Hämta från Spotify"}
        </Button>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Låt</th><th className="p-3">ISRC</th><th className="p-3">Projekt / Album</th>
                <th className="p-3">Artist</th><th className="p-3">Split MSC</th><th className="p-3">Bolag</th>
                <th className="p-3">Verk</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Laddar…</td></tr>}
              {filtered.map((r) => {
                const w = r.work_id ? workMap.get(r.work_id) : undefined;
                const cover = r.cover_url || coverMap.get((r.project ?? "").trim().toLowerCase());
                const audio = r.audio_url || w?.audio_url;
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Cover url={cover} />
                        <div className="min-w-0">
                          {w ? (
                            <Link to={`/works/${w.id}`} className="block font-medium truncate text-primary hover:underline">{r.track}</Link>
                          ) : (
                            <div className="font-medium truncate">{r.track}</div>
                          )}
                          <div className="text-xs text-muted-foreground truncate">{r.catalog_number} · {r.composer}</div>
                        </div>
                        <InlineAudioButton url={audio} />
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs">{r.isrc || "–"}</td>
                    <td className="p-3"><div>{r.project}</div><div className="text-xs text-muted-foreground">{r.album}</div></td>
                    <td className="p-3">{r.artist || "–"}</td>
                    <td className="p-3">{pct(r.split_msc)}</td>
                    <td className="p-3">{r.label || "–"}</td>
                    <td className="p-3">
                      {w ? <Link to={`/works/${w.id}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Link2 className="h-3 w-3" />Verk</Link>
                        : <Badge variant="outline">Ej kopplad</Badge>}
                    </td>
                    <td className="p-3"><Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{edit?.track}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>ISRC</Label><Input value={form.isrc} onChange={(e) => setForm({ ...form, isrc: e.target.value })} /></div>
            <div><Label>Ljudfil (länk eller storage:audio/…)</Label><Input value={form.audio_url} onChange={(e) => setForm({ ...form, audio_url: e.target.value })} placeholder="Tomt = använd verkets ljudfil" /></div>
            <div><Label>Omslag (länk eller storage:covers/…)</Label><Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="Tomt = använd projektets omslag" /></div>
            <div>
              <Label>Kopplat verk</Label>
              <div className="text-sm mb-1">{form.work_id ? (workMap.get(form.work_id)?.title ?? "–") + " " : "Inget "}
                {form.work_id && <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setForm({ ...form, work_id: "" })}>Ta bort koppling</Button>}
              </div>
              <Input placeholder="Sök verk att koppla…" value={workSearch} onChange={(e) => setWorkSearch(e.target.value)} />
              {workOptions.length > 0 && (
                <div className="mt-1 max-h-48 overflow-y-auto rounded border">
                  {workOptions.map((w) => (
                    <button key={w.id} type="button" onClick={() => { setForm({ ...form, work_id: w.id }); setWorkSearch(""); }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted">
                      {w.title} <span className="text-muted-foreground">· {w.project}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">Spara</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecordingsList;
