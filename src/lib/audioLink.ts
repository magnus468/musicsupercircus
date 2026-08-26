/** Normalize sharing links (Dropbox, Google Drive) into directly playable URLs */
export const toPlayableUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    // Dropbox: force raw file streaming
    if (u.hostname.includes("dropbox.com")) {
      u.searchParams.delete("dl");
      u.searchParams.set("raw", "1");
      return u.toString();
    }
    // Google Drive: /file/d/<id>/view → direct download
    if (u.hostname.includes("drive.google.com")) {
      const m = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
    }
    return u.toString();
  } catch {
    return null;
  }
};

/** True when the link points at a single file we can attempt to play inline */
export const isLikelyAudioFile = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const lower = url.split("?")[0].toLowerCase();
  return /\.(mp3|wav|m4a|aac|ogg|flac)$/.test(lower) || lower.includes("/scl/fi/");
};
