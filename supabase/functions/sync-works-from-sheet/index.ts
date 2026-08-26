import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SPREADSHEET_ID = "1EZhIQmpQ9-cGEsULqH9zRREwomTYwYkTf2XoBUz3PiI";
const RANGE = "'Verk _ Avräkning'!A4:F2000";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

const norm = (v: string | undefined) => {
  const t = (v ?? "").trim().replace(/^"+|"+$/g, "").trim();
  return t.length === 0 ? null : t;
};

const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function stimStatus(comment: string | null): "anmäld" | "claimad" | "ej_anmäld" {
  const c = (comment ?? "").toLowerCase();
  if (c.includes("claim")) return "claimad";
  if (c.includes("anmäld") && !c.includes("ej anmäld") && !c.includes("ej_anmäld")) return "anmäld";
  return "ej_anmäld";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const sheetsKey = Deno.env.get("GOOGLE_SHEETS_API_KEY");
    if (!lovableKey || !sheetsKey) throw new Error("Google Sheets-kopplingen saknas");

    const res = await fetch(
      `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": sheetsKey,
        },
      },
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(`Sheets request failed [${res.status}]: ${body}`);
      return new Response(
        JSON.stringify({ ok: false, error: "Kunde inte läsa Google-arket", status: res.status, details: body }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { values } = (await res.json()) as { values?: string[][] };
    const rows = values ?? [];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing, error: exErr } = await supabase.from("works").select("title");
    if (exErr) throw exErr;
    const seen = new Set((existing ?? []).map((w) => key(w.title)));

    const toInsert: Record<string, unknown>[] = [];
    let skipped = 0;

    for (const row of rows) {
      const title = norm(row[2]);
      if (!title || key(title) === "korrigering") { skipped++; continue; }
      if (seen.has(key(title))) { skipped++; continue; }
      seen.add(key(title));
      toInsert.push({
        title,
        project: norm(row[1]),
        creators: norm(row[3]) ?? "",
        stim_status: stimStatus(norm(row[4])),
        stim_comment: norm(row[4]),
        publishing_type: "original",
      });
    }

    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 500) {
      const batch = toInsert.slice(i, i + 500);
      const { error } = await supabase.from("works").insert(batch);
      if (error) throw new Error(`insert batch ${i}: ${error.message}`);
      inserted += batch.length;
    }

    const summary = { ok: true, inserted, skipped, totalRows: rows.length, at: new Date().toISOString() };
    console.log("sync-works-from-sheet:", summary);
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync error:", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
