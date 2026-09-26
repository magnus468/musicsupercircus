import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SPOTIFY_ID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const SPOTIFY_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

async function getToken(): Promise<string> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${SPOTIFY_ID}:${SPOTIFY_SECRET}`),
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Spotify-inloggning misslyckades (${res.status})`);
  const json = await res.json();
  return json.access_token as string;
}

type Track = {
  id: string;
  name: string;
  popularity?: number;
  external_urls?: { spotify?: string };
  album?: { name?: string; release_date?: string; images?: { url: string; width: number }[] };
};

async function searchIsrc(token: string, isrc: string): Promise<Track | null> {
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(`isrc:${isrc}`)}&type=track&limit=1`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 429) {
    const wait = Number(res.headers.get("retry-after") ?? "2");
    if (wait > 10) throw new Error("RATE_LIMIT");
    await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
    return searchIsrc(token, isrc);
  }
  if (!res.ok) return null;
  const json = await res.json();
  return json?.tracks?.items?.[0] ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    if (!SPOTIFY_ID || !SPOTIFY_SECRET) return json({ error: "Spotify-nycklar saknas" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Inte inloggad" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "Inte inloggad" }, 401);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = Math.min(Number(body.limit ?? 200) || 200, 500);
    const onlyMissing = body.onlyMissing !== false;
    const recordingId: string | undefined = body.recordingId;

    let q = supabase
      .from("recordings")
      .select("id,isrc,spotify_track_id")
      .not("isrc", "is", null)
      .neq("isrc", "")
      .limit(limit);
    if (recordingId) q = supabase.from("recordings").select("id,isrc,spotify_track_id").eq("id", recordingId);
    else if (onlyMissing) q = q.is("spotify_track_id", null);

    const { data: rows, error } = await q;
    if (error) return json({ error: error.message }, 500);
    if (!rows?.length) return json({ scanned: 0, updated: 0, notFound: 0, remaining: 0 });

    const token = await getToken();
    let updated = 0;
    let notFound = 0;
    let rateLimited = false;
    const started = Date.now();

    for (const r of rows) {
      if (Date.now() - started > 90_000) break;
      const isrc = (r.isrc ?? "").replace(/[\s-]/g, "").toUpperCase();
      if (!isrc) continue;
      let track: Track | null;
      try {
        track = await searchIsrc(token, isrc);
      } catch (e) {
        if (e instanceof Error && e.message === "RATE_LIMIT") { rateLimited = true; break; }
        throw e;
      }
      if (!track) {
        notFound++;
        await supabase.from("recordings").update({ spotify_synced_at: new Date().toISOString() }).eq("id", r.id);
        continue;
      }
      const cover = track.album?.images?.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
      const { error: upErr } = await supabase
        .from("recordings")
        .update({
          spotify_track_id: track.id,
          spotify_url: track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id}`,
          spotify_album: track.album?.name ?? null,
          spotify_release_date: track.album?.release_date ?? null,
          spotify_cover_url: cover,
          spotify_popularity: track.popularity ?? null,
          spotify_synced_at: new Date().toISOString(),
        })
        .eq("id", r.id);
      if (!upErr) updated++;
    }

    const { count: remaining } = await supabase
      .from("recordings")
      .select("id", { count: "exact", head: true })
      .not("isrc", "is", null)
      .neq("isrc", "")
      .is("spotify_track_id", null);

    return json({ scanned: rows.length, updated, notFound, remaining: remaining ?? 0, rateLimited });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Okänt fel" }, 500);
  }
});
