"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Eye, Play } from "lucide-react";
import { toggleFavorite, setAnimeStatus } from "@/lib/actions/anime";
import { useTransition } from "react";
import { toast } from "sonner";

interface UserAnimeCardProps {
  malId: number;
  title: string;
  imageUrl: string | null;
  status: "watching" | "watched" | null;
  isFavorite: boolean;
}

export function UserAnimeCard({
  malId,
  title,
  imageUrl,
  status,
  isFavorite,
}: UserAnimeCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleFavorite() {
    startTransition(async () => {
      await toggleFavorite(malId, title, imageUrl ?? "");
      toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
    });
  }

  function handleStatus(newStatus: "watching" | "watched" | null) {
    startTransition(async () => {
      await setAnimeStatus(malId, title, imageUrl ?? "", newStatus);
      toast.success(newStatus ? `Marked as ${newStatus}` : "Removed status");
    });
  }

  return (
    <div className="flex gap-4 rounded-lg border border-border/50 bg-card p-3 transition-all hover:border-primary/30">
      <Link href={`/anime/${malId}`} className="shrink-0">
        <div className="relative h-28 w-20 overflow-hidden rounded-md">
          {imageUrl ? (
            <Image src={imageUrl} alt={title} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
              No Image
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <Link href={`/anime/${malId}`} className="font-medium hover:text-primary">
            {title}
          </Link>
          <div className="mt-1 flex gap-1.5">
            {isFavorite && (
              <Badge variant="default" className="text-xs">
                <Heart className="mr-1 h-3 w-3 fill-current" />
                Favorite
              </Badge>
            )}
            {status && (
              <Badge variant="secondary" className="text-xs">
                {status === "watching" ? (
                  <Play className="mr-1 h-3 w-3" />
                ) : (
                  <Eye className="mr-1 h-3 w-3" />
                )}
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFavorite}
            disabled={isPending}
            className="h-7 px-2 text-xs"
          >
            <Heart className={`mr-1 h-3 w-3 ${isFavorite ? "fill-current text-primary" : ""}`} />
            {isFavorite ? "Unfav" : "Fav"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatus(status === "watching" ? null : "watching")}
            disabled={isPending}
            className="h-7 px-2 text-xs"
          >
            <Play className={`mr-1 h-3 w-3 ${status === "watching" ? "text-primary" : ""}`} />
            Watching
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatus(status === "watched" ? null : "watched")}
            disabled={isPending}
            className="h-7 px-2 text-xs"
          >
            <Eye className={`mr-1 h-3 w-3 ${status === "watched" ? "text-primary" : ""}`} />
            Watched
          </Button>
        </div>
      </div>
    </div>
  );
}
