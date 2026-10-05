import type { Tables } from "@/integrations/supabase/types";

export type Recording = Tables<"recordings">;

export const albumName = (r: Recording) =>
  (r.album || r.spotify_album || r.project || "Okänt album").trim();

export const albumKey = (r: Recording) => albumName(r).toLowerCase();

export type Album = {
  key: string;
  name: string;
  project: string | null;
  artists: string[];
  label: string | null;
  cover: string | null;
  releaseDate: string | null;
  tracks: Recording[];
};

export const groupAlbums = (
  recordings: Recording[],
  projectCovers: Map<string, string | null>,
): Album[] => {
  const map = new Map<string, Album>();
  for (const r of recordings) {
    const key = albumKey(r);
    let a = map.get(key);
    if (!a) {
      a = { key, name: albumName(r), project: r.project, artists: [], label: r.label, cover: null, releaseDate: null, tracks: [] };
      map.set(key, a);
    }
    a.tracks.push(r);
    for (const art of (r.artist ?? "").split(/\s*[,&/]\s*/)) {
      const t = art.trim();
      if (t && !a.artists.includes(t)) a.artists.push(t);
    }
    a.cover ||= r.cover_url || r.spotify_cover_url || projectCovers.get((r.project ?? "").trim().toLowerCase()) || null;
    a.releaseDate ||= r.spotify_release_date;
    a.label ||= r.label;
  }
  for (const a of map.values()) {
    a.tracks.sort((x, y) => (x.catalog_number ?? "").localeCompare(y.catalog_number ?? "", "sv", { numeric: true }) || (x.isrc ?? "").localeCompare(y.isrc ?? ""));
  }
  return [...map.values()].sort(
    (a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") || a.name.localeCompare(b.name, "sv"),
  );
};
