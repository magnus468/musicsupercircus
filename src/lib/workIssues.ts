import type { Work } from "@/hooks/useWorks";

export type IssueType = "no_publisher" | "bad_split" | "no_repr" | "no_project" | "no_agreement";

export const ISSUE_LABELS: Record<IssueType, string> = {
  no_publisher: "Saknar förlag",
  bad_split: "Felaktig split",
  no_repr: "Saknar repr",
  no_project: "Saknar projekt",
  no_agreement: "Inget avtal",
};

export const ISSUE_COLORS: Record<IssueType, string> = {
  no_publisher: "bg-destructive/15 text-destructive",
  bad_split: "bg-warning/15 text-warning-foreground",
  no_repr: "bg-orange-500/15 text-orange-600",
  no_project: "bg-muted text-muted-foreground",
  no_agreement: "bg-violet-500/15 text-violet-600",
};

export const detectIssues = (
  work: Work,
  agreementClientNames: Set<string>
): IssueType[] => {
  const issues: IssueType[] = [];
  const parts = work.creators.split(/\),\s*/).map((p, i, arr) => (i < arr.length - 1 ? p + ")" : p));

  const parsed = parts.map((part) => {
    const match = part.trim().match(/^(.+?)\s*\((\w+)(?:,.*?)?\)$/);
    return match ? { name: match[1].trim(), role: match[2], parens: (part.match(/\(([^)]*)\)/) || [])[1] || "" } : null;
  }).filter(Boolean) as { name: string; role: string; parens: string }[];

  if (!parsed.some((p) => p.role === "E")) {
    issues.push("no_publisher");
  }

  const nonE = parsed.filter((p) => p.role !== "E");
  const hasAnyShare = parsed.some((p) => p.parens.match(/\d+(\.\d+)?%/));
  if (!hasAnyShare && parsed.length > 0) {
    issues.push("bad_split");
  }

  if (nonE.some((p) => !p.parens.includes("repr"))) {
    issues.push("no_repr");
  }

  if (!work.project?.trim()) {
    issues.push("no_project");
  }

  if (work.co_publishers && work.co_publishers.length > 0) {
    const externalPubs = work.co_publishers.filter(
      (cp) => !cp.toLowerCase().includes("music super circus")
    );
    // Normalize: lowercase, strip common company suffixes & punctuation for fuzzy match
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/\b(ab|aktiebolag|ltd|inc|llc|gmbh|oy|as|a\/s|bv|sa|srl|kb|hb)\b\.?/g, "")
        .replace(/[.,&]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const normalizedAgreementNames = Array.from(agreementClientNames).map(normalize);

    const hasMatch = externalPubs.some((cp) => {
      const n = normalize(cp);
      if (!n) return false;
      return normalizedAgreementNames.some(
        (an) => an === n || an.includes(n) || n.includes(an)
      );
    });

    if (externalPubs.length > 0 && !hasMatch) {
      issues.push("no_agreement");
    }
  }

  return issues;
};
