import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toPlayableUrl } from "@/lib/audioLink";

interface Props {
  url?: string | null;
  className?: string;
}

/** Small play/pause button meant to sit next to a work title. */
const InlineAudioButton = ({ url, className }: Props) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const src = toPlayableUrl(url ?? "");

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  if (!url || !src) return null;

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!audioRef.current) {
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
      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
    </Button>
  );
};

export default InlineAudioButton;
