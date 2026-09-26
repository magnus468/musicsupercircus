import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Pause, Loader2, Disc3 } from "lucide-react";
import { isLikelyAudioFile, resolveAudioUrl } from "@/lib/audioLink";

interface Props {
  coverUrl?: string | null;
  audioUrl?: string | null;
  /** Called when there is no own audio file but a fallback (e.g. Spotify) exists. */
  onFallback?: () => void;
  fallbackActive?: boolean;
}

/** Cover image that doubles as play/pause button. */
const CoverPlayButton = ({ coverUrl, audioUrl, onFallback, fallbackActive }: Props) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: img } = useQuery({
    queryKey: ["cover", coverUrl],
    enabled: !!coverUrl,
    staleTime: 50 * 60 * 1000,
    queryFn: () => resolveAudioUrl(coverUrl),
  });

  useEffect(() => () => { audioRef.current?.pause(); audioRef.current = null; }, []);

  const hasAudio = !!audioUrl && isLikelyAudioFile(audioUrl);
  const playable = hasAudio || !!onFallback;
  const active = playing || !!fallbackActive;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasAudio) { onFallback?.(); return; }
    if (!audioRef.current) {
      setLoading(true);
      const src = await resolveAudioUrl(audioUrl);
      setLoading(false);
      if (!src) return;
      const el = new Audio(src);
      el.addEventListener("ended", () => setPlaying(false));
      el.addEventListener("pause", () => setPlaying(false));
      el.addEventListener("play", () => setPlaying(true));
      audioRef.current = el;
    }
    if (audioRef.current.paused) void audioRef.current.play().catch(() => setPlaying(false));
    else audioRef.current.pause();
  };

  const base = "relative h-10 w-10 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center group";
  const inner = img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <Disc3 className="h-4 w-4 text-muted-foreground" />;

  if (!playable) return <div className={base}>{inner}</div>;

  return (
    <button type="button" onClick={toggle} aria-label={active ? "Stoppa låten" : "Spela låten"} className={base}>
      {inner}
      <span className={`absolute inset-0 flex items-center justify-center bg-foreground/40 text-background transition-opacity ${active || loading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </span>
    </button>
  );
};

export default CoverPlayButton;
