import { useEffect, useRef, useState } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isLikelyAudioFile, resolveAudioUrl } from "@/lib/audioLink";

interface Props {
  url?: string | null;
  className?: string;
}

/** Small play/pause button meant to sit next to a work title. */
const InlineAudioButton = ({ url, className }: Props) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  if (!url || !isLikelyAudioFile(url)) return null;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!audioRef.current) {
      setLoading(true);
      const src = await resolveAudioUrl(url);
      setLoading(false);
      if (!src) return;
      const el = new Audio(src);
      el.addEventListener("ended", () => setPlaying(false));
      el.addEventListener("pause", () => setPlaying(false));
      el.addEventListener("play", () => setPlaying(true));
      audioRef.current = el;
    }

    if (audioRef.current.paused) {
      void audioRef.current.play().catch(() => setPlaying(false));
    } else {
      audioRef.current.pause();
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={playing ? "Pausa låten" : "Spela låten"}
      className={`h-7 w-7 shrink-0 text-primary hover:text-primary ${className ?? ""}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : playing ? (
        <Pause className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4" />
      )}
    </Button>
  );
};

export default InlineAudioButton;
