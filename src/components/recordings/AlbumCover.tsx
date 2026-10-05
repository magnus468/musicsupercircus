import { useQuery } from "@tanstack/react-query";
import { Disc3 } from "lucide-react";
import { resolveAudioUrl } from "@/lib/audioLink";
import { cn } from "@/lib/utils";

const AlbumCover = ({ url, className }: { url?: string | null; className?: string }) => {
  const { data } = useQuery({
    queryKey: ["cover", url],
    enabled: !!url,
    staleTime: 50 * 60 * 1000,
    queryFn: () => resolveAudioUrl(url),
  });
  if (!data)
    return (
      <div className={cn("flex aspect-square items-center justify-center bg-muted", className)}>
        <Disc3 className="h-1/3 w-1/3 text-muted-foreground/60" />
      </div>
    );
  return <img src={data} alt="" loading="lazy" className={cn("aspect-square object-cover", className)} />;
};

export default AlbumCover;
