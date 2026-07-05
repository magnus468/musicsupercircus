import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SHEET_ID = "1R_osRhl0opeVw920KLTJweE4oYB2qnwSggeaNTuvLmk";
const GID = "939924499";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

// Simple RFC-4180 CSV parser (handles quoted fields and embedded newlines/commas)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const norm = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return t.length === 0 ? null : t;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`Failed to fetch sheet: HTTP ${res.status}`);
    const csv = await res.text();
    const rows = parseCSV(csv);
    if (rows.length < 2) throw new Error("Sheet appears empty");

    const header = rows[0].map((h) => h.trim());
    const idx = (name: string) => header.indexOf(name);
    const cols = {
      project_number: idx("Projektnr"),
      name: idx("Projekt"),
      supervisor: idx("Supervisor"),
      client: idx("Kund"),
      description: idx("Beskrivning"),
      composer: idx("Kompositör"),
      publishing: idx("Publishing"),
      status: idx("Status"),
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existing, error: exErr } = await supabase
      .from("projects")
      .select("id, project_number, name");
    if (exErr) throw exErr;

    const byNumber = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const p of existing ?? []) {
      if (p.project_number) byNumber.set(p.project_number.trim(), p.id);
      if (p.name) byName.set(p.name.trim().toLowerCase(), p.id);
    }

    let inserted = 0, updated = 0, skipped = 0;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const name = norm(row[cols.name]);
      const projectNumber = norm(row[cols.project_number]);
      if (!name && !projectNumber) { skipped++; continue; }

      const record = {
        project_number: projectNumber,
        name: name ?? projectNumber ?? "(namnlös)",
        supervisor: norm(row[cols.supervisor]),
        client: norm(row[cols.client]),
        description: norm(row[cols.description]),
        composer: norm(row[cols.composer]),
        publishing: norm(row[cols.publishing]),
        status: norm(row[cols.status]),
      };

      let id: string | undefined;
      if (projectNumber && byNumber.has(projectNumber)) id = byNumber.get(projectNumber);
      else if (name && byName.has(name.toLowerCase())) id = byName.get(name.toLowerCase());

      if (id) {
        const { error } = await supabase.from("projects").update(record).eq("id", id);
        if (error) throw new Error(`update row ${r} (${record.name}): ${error.message}`);
        updated++;
      } else {
        const { error } = await supabase.from("projects").insert(record);
        if (error) throw new Error(`insert row ${r} (${record.name}): ${error.message}`);
        inserted++;
      }
    }

    const summary = { ok: true, inserted, updated, skipped, total: rows.length - 1, at: new Date().toISOString() };
    console.log("sync-projects-from-sheet:", summary);
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
