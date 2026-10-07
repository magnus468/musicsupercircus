import type { RegParty, WorkRegistration } from "@/hooks/useWorkRegistrations";

const STOP = new Set(["ab", "the", "and", "of", "music", "publishing", "förlag", "forlag", "ltd", "inc"]);

const tokens = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

const ALIASES: Record<string, string[]> = {
  msce: ["super", "circus", "extravaganza"],
  mscp: ["super", "circus", "publishing"],
};

/** True if every significant token of the catalog name appears in the STIM name. */
const nameMatches = (catalog: string, stim: string) => {
  const s = new Set(tokens(stim));
  let c = tokens(catalog);
  const alias = ALIASES[catalog.trim().toLowerCase()];
  if (alias) c = alias;
  const sig = c.filter((t) => !STOP.has(t) || alias);
  if (!sig.length) return false;
  return sig.every((t) => s.has(t));
};

/** Unique IPI / agreement number for a catalog name across all receipts (null if none or conflicting). */
export const lookupRegInfo = (name: string, regs: WorkRegistration[], publisher: boolean) => {
  const ipis = new Set<string>();
  const agreements = new Set<string>();
  regs.forEach((r) => {
    const parties: RegParty[] = publisher ? r.publishers : r.creators;
    parties.forEach((p) => {
      if (!nameMatches(name, p.name)) return;
      if (p.ipi) ipis.add(p.ipi);
      if (publisher && p.agreement) agreements.add(p.agreement);
    });
  });
  return {
    ipi: ipis.size === 1 ? [...ipis][0] : null,
    agreement: agreements.size === 1 ? [...agreements][0] : null,
  };
};
