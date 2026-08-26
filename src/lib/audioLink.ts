import { supabase } from "@/integrations/supabase/client";

const STORAGE_PREFIX = "storage:";

/** True for internal references like `storage:audio/the-finals-11/song.mp3` */
export const isStorageRef = (url: string | null | undefined): boolean =>
  !!url && url.trim().startsWith(STORAGE_PREFIX);

/** Normalize sharing links (Dropbox, Google Drive) into directly playable URLs */
export const toPlayableUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(STORAGE_PREFIX)) return null; // needs async signing
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

/** Resolve any stored audio reference into a URL the browser can play. */
export const resolveAudioUrl = async (url: string | null | undefined): Promise<string | null> => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(STORAGE_PREFIX)) {
    const rest = trimmed.slice(STORAGE_PREFIX.length);
    const slash = rest.indexOf("/");
    if (slash < 1) return null;
    const bucket = rest.slice(0, slash);
    const path = rest.slice(slash + 1);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
    if (error) return null;
    return data?.signedUrl ?? null;
  }
  return toPlayableUrl(trimmed);
};

/** True when the link points at a single file we can attempt to play inline */
export const isLikelyAudioFile = (url: string | null | undefined): boolean => {
  if (!url) return false;
  if (isStorageRef(url)) return true;
  const lower = url.split("?")[0].toLowerCase();
  return /\.(mp3|wav|m4a|aac|ogg|flac)$/.test(lower) || lower.includes("/scl/fi/");
};
