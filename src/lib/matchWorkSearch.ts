/** Each word may occur in a different field; quotes keep punctuation literal. */
export function buildMatchWorkSearch(search: string): string {
  const terms = search.trim().split(/\s+/).filter(Boolean);
  const groups = terms.map((term) => {
    const escaped = term.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const pattern = `"%${escaped}%"`;
    return `or(title.ilike.${pattern},creators.ilike.${pattern},project.ilike.${pattern})`;
  });
  return groups.length ? `and(${groups.join(",")})` : "";
}