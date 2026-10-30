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

export const normalizeCreatorName = (name: string) => {
  const normalized = tokens(name).join(" ");
  return ["adam norden", "adam isaac erik norden"].includes(normalized) ? "adam norden" : normalized;
};

/** Recheck Adam's stale name-based comparisons, without hiding other parties' issues. */
export const resolveAdamNameWarning = (registration: WorkRegistration, creators: string) => {
  if (!registration.share_mismatch || !registration.mismatch_note) return registration;
  const matches = [...creators.matchAll(/(?:^|\),\s*)([^()]+)\((?:CA|C|A),\s*(\d+(?:[.,]\d+)?)%/gi)]
    .filter((match) => normalizeCreatorName(match[1]) === "adam norden");
  if (matches.length !== 1) return registration;
  const actual = Number(matches[0][2].replace(",", "."));
  const remaining = registration.mismatch_note.split("; ").filter((note) => {
    const warning = note.match(/^(Adam (?:Isaac Erik )?Nord[eé]n)(?:: STIM (\d+(?:[.,]\d+)?)% \/ (?:katalog .*|andel saknas i katalogen)| (\d+(?:[.,]\d+)?)% finns inte på verket i katalogen)$/i);
    return !warning || Math.abs(actual - Number((warning[2] ?? warning[3]).replace(",", "."))) > 0.00001;
  });
  return { ...registration, share_mismatch: remaining.length > 0, mismatch_note: remaining.join("; ") || null };
};

/** Exact publisher aliases, never a substring match against unrelated publishers. */
export const normalizePublisherName = (name: string) => {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
  return /^(brf|brf music publishing)( ab)?$/.test(normalized)
    ? "brf music publishing"
    : normalized;
};

/** Resolve only the stale BRF-name warning after confirming the catalog's E share. */
export const resolveBrfNameWarning = (registration: WorkRegistration, creators: string) => {
  const warning = registration.mismatch_note?.match(/^brf(?: music publishing)? (\d+(?:[.,]\d+)?)% finns inte på verket i katalogen$/i);
  if (!registration.share_mismatch || !warning) return registration;
  const expected = Number(warning[1].replace(",", "."));
  const matches = [...creators.matchAll(/(?:^|\),\s*)([^()]+)\(E,\s*(\d+(?:[.,]\d+)?)%/gi)]
    .filter((match) => normalizePublisherName(match[1]) === "brf music publishing");
  if (matches.length !== 1 || Math.abs(Number(matches[0][2].replace(",", ".")) - expected) > 0.00001) return registration;
  return { ...registration, share_mismatch: false, mismatch_note: null };
};

/** True if every significant token of the catalog name appears in the STIM name. */
const nameMatches = (catalog: string, stim: string) => {
  if (normalizeCreatorName(catalog) === "adam norden" || normalizeCreatorName(stim) === "adam norden") {
    return normalizeCreatorName(catalog) === normalizeCreatorName(stim);
  }
  if (normalizePublisherName(catalog) === "brf music publishing" || normalizePublisherName(stim) === "brf music publishing") {
    return normalizePublisherName(catalog) === normalizePublisherName(stim);
  }
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
