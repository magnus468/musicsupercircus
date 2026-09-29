import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const SPREADSHEET_ID = "1o4s2tNFLARwqZC-GUipgOJGMo9xNwl84CrGkpfrWfBU";
const RANGE = "Blad1!A2:N5000";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

const txt = (v: string | undefined) => {
  const t = (v ?? "").trim().replace(/^"+|"+$/g, "").trim();
  return t.length === 0 ? null : t;
};
// "50,00%" -> 0.5 (svensk decimal: komma = decimal)
const pct = (v: string | undefined) => {
  const t = (v ?? "").replace(/\s/g, "").replace("%", "").replace(",", ".");
  if (!t) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : Math.round(n * 100) / 10000;
};
const yes = (v: string | undefined) => /^(ja|yes|x|true)$/i.test((v ?? "").trim());

const FIELDS: [string, string][] = [
  ["catalog_number", "Katalognummer"], ["project", "Projekt"], ["album", "Album"], ["artist", "Artist"],
  ["track", "Låt"], ["composer", "Kompositör"], ["split_artist", "Split artist"], ["split_label", "Split bolag"],
  ["split_msc", "Split MSC"], ["label", "Bolag"], ["expenses", "Expenses"],
  ["sr_uploaded", "Uppladdat i SR"], ["ifpi_registered", "Reggat i IFPI"],
];
const show = (v: unknown) =>
  v == null || v === "" ? "(tomt)" : typeof v === "boolean" ? (v ? "JA" : "NEJ") : typeof v === "number" ? `${Math.round(v * 10000) / 100}%` : String(v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const sheetsKey = Deno.env.get("GOOGLE_SHEETS_API_KEY");
    if (!lovableKey || !sheetsKey) throw new Error("Google Sheets-kopplingen saknas");

    const res = await fetch(`${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}`, {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": sheetsKey },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Sheets request failed [${res.status}]: ${body}`);
      return new Response(JSON.stringify({ ok: false, error: "Kunde inte läsa Google-arket", status: res.status, details: body }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const rows: string[][] = (await res.json()).values ?? [];

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const existing: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("recordings").select("*").range(from, from + 999);
      if (error) throw error;
      existing.push(...data);
      if (data.length < 1000) break;
    }
    const byIsrc = new Map(existing.filter((r) => r.isrc).map((r) => [String(r.isrc).toUpperCase(), r]));

    const seen = new Set<string>();
    const toInsert: Record<string, unknown>[] = [];
    const changed: { id: string; title: string; patch: Record<string, unknown>; diffs: { field: string; from: string; to: string }[] }[] = [];
    let skipped = 0;

    for (const r of rows) {
      const track = txt(r[4]);
      const isrc = txt(r[6])?.replace(/[\s-]/g, "").toUpperCase() ?? null;
      if (!track || !isrc || seen.has(isrc)) { skipped++; continue; }
      seen.add(isrc);
      const rec: Record<string, unknown> = {
        catalog_number: txt(r[0]), project: txt(r[1]), album: txt(r[2]), artist: txt(r[3]), track,
        composer: txt(r[5]), split_artist: pct(r[7]), split_label: pct(r[8]), split_msc: pct(r[9]),
        label: txt(r[10]), expenses: txt(r[11]), sr_uploaded: yes(r[12]), ifpi_registered: yes(r[13]),
      };
      const cur = byIsrc.get(isrc);
      if (!cur) { toInsert.push({ ...rec, isrc }); continue; }
      const patch: Record<string, unknown> = {};
      const diffs: { field: string; from: string; to: string }[] = [];
      for (const [k, label] of FIELDS) {
        const a = cur[k] ?? null, b = rec[k] ?? null;
        const same = typeof b === "number" && a != null ? Math.abs(Number(a) - b) < 1e-6 : a === b;
        if (!same) { patch[k] = b; diffs.push({ field: label, from: show(a), to: show(b) }); }
      }
      if (diffs.length) changed.push({ id: String(cur.id), title: track, patch, diffs });
    }

    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 500) {
      const { error } = await supabase.from("recordings").insert(toInsert.slice(i, i + 500));
      if (error) console.error("insert misslyckades:", error.message); else inserted += Math.min(500, toInsert.length - i);
    }
    let updated = 0;
    for (const c of changed) {
      const { error } = await supabase.from("recordings").update(c.patch).eq("id", c.id);
      if (error) console.error(`update ${c.title}: ${error.message}`); else updated++;
    }

    const summary = { ok: true, inserted, updated, skipped, totalRows: rows.length, at: new Date().toISOString() };
    console.log("sync-recordings-from-sheet:", summary);

    try {
      await sendTemplateEmail("recordings-sync-report", "magnus@musicsupercircus.com", {
        templateData: {
          inserted, updated, totalRows: rows.length,
          syncedAt: new Date().toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" }),
          added: toInsert.slice(0, 200).map((w) => ({ title: w.track, isrc: w.isrc, project: w.project })),
          changed: changed.slice(0, 200).map((c) => ({ title: c.title, diffs: c.diffs })),
        },
        idempotencyKey: `recordings-sync-report-${crypto.randomUUID()}`,
      });
    } catch (mailErr) {
      console.error("rapportmail misslyckades:", mailErr);
    }

    return new Response(JSON.stringify(summary), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sync error:", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
