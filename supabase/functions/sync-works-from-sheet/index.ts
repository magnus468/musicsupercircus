import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

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

// Delar upp "A (..) / B (..)" på toppnivå (ignorerar / inuti parenteser)
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if ((ch === "/" || ch === "&") && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((p) => p.trim()).filter(Boolean);
}

const numSv = (v: string) => parseFloat(v.replace(",", "."));

// Tolkar "Ed Hargrave (CA_Norden_66,67%_ROW_50%)" -> "Ed Hargrave (CA, 66.67%, row:50%, repr)"
function parseSplitEntry(part: string, defaultRole: "CA" | "E"): string | null {
  const m = part.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!m) return null;
  const name = m[1].trim();
  const inner = m[2];
  const split = inner.match(
    /(?:^|[_\s])(CA|C|A|E|AR|SA)?[_\s]*(?:Norden[_\s]*)?(\d+(?:[.,]\d+)?)\s*%[_\s]*ROW[_\s:]*(\d+(?:[.,]\d+)?)\s*%/i,
  );
  if (!name || !split) return null;
  const role = (split[1] || defaultRole).toUpperCase();
  return `${name} (${role}, ${numSv(split[2])}%, row:${numSv(split[3])}%, repr)`;
}

// Bygger creators-strängen när arket innehåller split-notation, annars null
function buildCreators(rawCreators: string, rawPublishers: string | null): {
  creators: string;
  publishers: string[];
} | null {
  const hasSplit = /ROW[_\s:]*\d/i.test(`${rawCreators} ${rawPublishers ?? ""}`);
  if (!hasSplit) return null;

  const entries: string[] = [];
  for (const p of splitTop(rawCreators)) {
    entries.push(parseSplitEntry(p, "CA") ?? p.trim());
  }
  const publishers: string[] = [];
  for (const p of splitTop(rawPublishers ?? "")) {
    const nameOnly = p.replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (!nameOnly) continue;
    publishers.push(nameOnly);
    entries.push(parseSplitEntry(p, "E") ?? `${nameOnly} (E, repr)`);
  }
  return { creators: entries.join(", "), publishers };
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

    const existing: Record<string, any>[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error: exErr } = await supabase
        .from("works")
        .select("id, title, project, creators, stim_status, stim_comment, publishing_type, co_publishers")
        .order("created_at", { ascending: true })
        .range(from, from + 999);
      if (exErr) throw exErr;
      existing.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    const byTitle = new Map(existing.map((w) => [key(w.title), w]));

    const toInsert: Record<string, unknown>[] = [];
    const changed: {
      id: string;
      title: string;
      fields: string[];
      diffs: { field: string; from: string; to: string }[];
      patch: Record<string, unknown>;
    }[] = [];
    let skipped = 0;

    for (const row of rows) {
      const title = norm(row[2]);
      if (!title || key(title) === "korrigering") { skipped++; continue; }
      const project = norm(row[1]);
      const rawCreators = norm(row[3]) ?? "";
      const rawPublishers = norm(row[5]);
      const comment = norm(row[4]);
      const status = stimStatus(comment);

      const parsed = buildCreators(rawCreators, rawPublishers);
      const creators = parsed?.creators ?? rawCreators;
      const internal = parsed?.publishers.find((p) => /^MSC[EP]$/i.test(p));
      const publishingType = internal ? internal.toUpperCase() : null;
      const coPublishers = parsed
        ? parsed.publishers.filter((p) => !/^MSC[EP]$/i.test(p))
        : null;

      const current = byTitle.get(key(title));
      if (current) {
        const patch: Record<string, unknown> = {};
        const fields: string[] = [];
        const diffs: { field: string; from: string; to: string }[] = [];
        const track = (
          field: string,
          column: string,
          before: unknown,
          after: unknown,
        ) => {
          patch[column] = after;
          fields.push(field);
          diffs.push({
            field,
            from: before == null || before === "" ? "(tomt)" : String(before),
            to: after == null || after === "" ? "(tomt)" : String(after),
          });
        };
        if (project && project !== current.project) track("Projekt", "project", current.project, project);
        if (creators && creators !== current.creators) track("Upphovspersoner", "creators", current.creators, creators);
        if (status !== current.stim_status) track("STIM-status", "stim_status", current.stim_status, status);
        if (comment && comment !== current.stim_comment) track("STIM-kommentar", "stim_comment", current.stim_comment, comment);
        if (publishingType && publishingType !== current.publishing_type) {
          track("Förlag", "publishing_type", current.publishing_type, publishingType);
        }
        if (coPublishers && coPublishers.join(", ") !== (current.co_publishers ?? []).join(", ")) {
          patch.co_publishers = coPublishers;
          fields.push("Medförlag");
          diffs.push({
            field: "Medförlag",
            from: (current.co_publishers ?? []).join(", ") || "(tomt)",
            to: coPublishers.join(", ") || "(tomt)",
          });
        }
        if (fields.length > 0) {
          changed.push({ id: current.id, title: current.title, fields, diffs, patch });
        } else {
          skipped++;
        }
        continue;
      }

      byTitle.set(key(title), {
        id: "new",
        title,
        project,
        creators,
        stim_status: status,
        stim_comment: comment,
        publishing_type: publishingType ?? "original",
        co_publishers: coPublishers ?? [],
      } as never);
      toInsert.push({
        title,
        project,
        creators,
        stim_status: status,
        stim_comment: comment,
        publishing_type: publishingType ?? "original",
        ...(coPublishers && coPublishers.length > 0 ? { co_publishers: coPublishers } : {}),
      });
    }

    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 500) {
      const batch = toInsert.slice(i, i + 500);
      const { error } = await supabase.from("works").insert(batch);
      if (error) throw new Error(`insert batch ${i}: ${error.message}`);
      inserted += batch.length;
    }

    let updated = 0;
    for (const c of changed) {
      const { error } = await supabase.from("works").update(c.patch).eq("id", c.id);
      if (error) {
        console.error(`update ${c.title} misslyckades: ${error.message}`);
        continue;
      }
      updated++;
    }

    const summary = { ok: true, inserted, updated, skipped, totalRows: rows.length, at: new Date().toISOString() };
    console.log("sync-works-from-sheet:", summary);

    if (inserted > 0 || updated > 0) {
      try {
        await sendTemplateEmail("works-sync-report", "magnus@musicsupercircus.com", {
          templateData: {
            inserted,
            updated,
            skipped,
            totalRows: rows.length,
            syncedAt: new Date().toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" }),
            works: toInsert.slice(0, 200).map((w) => ({
              title: w.title as string,
              project: (w.project as string | null) ?? null,
              creators: (w.creators as string | null) ?? null,
            })),
            updatedWorks: changed.slice(0, 200).map((c) => ({
              title: c.title,
              fields: c.fields.join(", "),
            })),
          },
          idempotencyKey: `works-sync-report-${crypto.randomUUID()}`,
        });
      } catch (mailErr) {
        console.error("rapportmail misslyckades:", mailErr);
      }
    }
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
