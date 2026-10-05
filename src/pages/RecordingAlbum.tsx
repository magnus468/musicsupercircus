import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AlbumCover from "@/components/recordings/AlbumCover";
import { groupAlbums, type Recording } from "@/lib/recordingAlbums";

const fmt = (v: number | null) => `${(Math.round((v ?? 0) * 10000) / 100).toFixed(2)}%`;

const RecordingAlbum = () => {
  const { key = "" } = useParams();
  const albumKey = decodeURIComponent(key);

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
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-covers"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("name,cover_url").not("cover_url", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const { data: income } = useQuery({
    queryKey: ["recording-income"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_recording_income");
      if (error) throw error;
      return data as { byRecording: Record<string, number>; byCatalog: Record<string, number> };
    },
  });

  const album = useMemo(() => {
    const covers = new Map(projects.map((p) => [p.name.trim().toLowerCase(), p.cover_url]));
    return groupAlbums(recordings, covers).find((a) => a.key === albumKey);
  }, [recordings, projects, albumKey]);

  if (isLoading) return <p className="text-muted-foreground">Laddar…</p>;
  if (!album)
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild><Link to="/recordings"><ArrowLeft className="mr-2 h-4 w-4" />Alla album</Link></Button>
        <p className="text-muted-foreground">Albumet hittades inte.</p>
      </div>
    );

  const usd = (v: number) => v.toLocaleString("sv-SE", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const trackIncome = (id: string) => Number(income?.byRecording?.[id] ?? 0);
  const catalogs = [...new Set(album.tracks.map((t) => t.catalog_number).filter(Boolean))] as string[];
  const albumSales = catalogs.reduce((a, c) => a + Number(income?.byCatalog?.[c] ?? 0), 0);
  const totalIncome = album.tracks.reduce((a, t) => a + trackIncome(t.id), 0) + albumSales;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild><Link to="/recordings"><ArrowLeft className="mr-2 h-4 w-4" />Alla album</Link></Button>
      <div className="flex items-start gap-5">
        <AlbumCover url={album.cover} className="h-28 w-28 shrink-0 rounded-md shadow-sm" />
        <div className="min-w-0 space-y-1.5">
          <Badge variant="outline">Album</Badge>
          <h1 className="text-xl font-semibold">{album.name}</h1>
          <p className="text-primary">{album.artists.join(", ") || "–"}</p>
          <p className="text-xs text-muted-foreground">
            {album.tracks.length} spår{album.label ? ` · ${album.label}` : ""}{album.releaseDate ? ` · Släppt ${album.releaseDate}` : ""}{album.project ? ` · Projekt: ${album.project}` : ""}
          </p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-muted-foreground">Intäkter (avräkningar)</div>
          <div className="text-xl font-semibold tabular-nums">{usd(totalIncome)}</div>
          {albumSales > 0 && <div className="text-xs text-muted-foreground">varav albumförsäljning {usd(albumSales)}</div>}
          <Link to="/recordings/statements" className="text-xs text-primary hover:underline">Visa avräkningar</Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-12 p-3">#</th><th className="p-3">Titel</th><th className="p-3">Artist</th>
                <th className="p-3">ISRC</th><th className="p-3">Fördelning</th><th className="p-3 text-right">Intäkt</th>
              </tr>
            </thead>
            <tbody>
              {album.tracks.map((t, i) => {
                const splits = [
                  { pct: t.split_artist, name: t.artist ? `${t.artist} (artist)` : "Artist" },
                  { pct: t.split_msc, name: "Music Super Circus" },
                  { pct: t.split_label, name: t.label || "Bolag" },
                ].filter((s) => s.pct != null && s.pct > 0);
                return (
                  <tr key={t.id} className="border-t align-top">
                    <td className="p-3 text-muted-foreground">{String(i + 1).padStart(2, "0")}</td>
                    <td className="p-3">
                      {t.work_id ? <Link to={`/works/${t.work_id}`} className="font-medium text-primary hover:underline">{t.track}</Link> : <span className="font-medium">{t.track}</span>}
                      {t.composer && <div className="text-xs text-muted-foreground">{t.composer}</div>}
                    </td>
                    <td className="p-3">{t.artist || "–"}</td>
                    <td className="p-3 font-mono text-xs">{t.isrc || "–"}</td>
                    <td className="p-3">
                      {splits.length ? (
                        <ul className="space-y-1">
                          {splits.map((s) => (
                            <li key={s.name} className="flex gap-3"><span className="w-16 tabular-nums text-muted-foreground">{fmt(s.pct)}</span><span>{s.name}</span></li>
                          ))}
                        </ul>
                      ) : <span className="text-muted-foreground">–</span>}
                    </td>
                    <td className="p-3 text-right tabular-nums">{trackIncome(t.id) ? usd(trackIncome(t.id)) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecordingAlbum;
