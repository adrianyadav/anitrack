"use client";

import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Eye, Play, Trash2 } from "lucide-react";
import { toggleFavorite, setAnimeStatus, removeFromList } from "@/lib/actions/anime";
import { toast } from "sonner";

interface AnimeActionsProps {
  malId: number;
  title: string;
  imageUrl: string;
  isFavorite: boolean;
  status: "watching" | "watched" | null;
  isAuthenticated: boolean;
}

export function AnimeActions({
  malId,
  title,
  imageUrl,
  isFavorite,
  status,
  isAuthenticated,
}: AnimeActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(isFavorite);
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [optimisticInList, addOptimisticInList] = useOptimistic(
    isFavorite || !!status,
    (_current, value: boolean) => value
  );

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-muted-foreground">
        Sign in to add this anime to your list.
      </p>
    );
  }

  function handleFavorite() {
    startTransition(async () => {
      setOptimisticFavorite(!optimisticFavorite);
      await toggleFavorite(malId, title, imageUrl);
      toast.success(optimisticFavorite ? "Removed from favorites" : "Added to favorites");
    });
  }

  function handleStatus(newStatus: "watching" | "watched") {
    const finalStatus = optimisticStatus === newStatus ? null : newStatus;
    startTransition(async () => {
      setOptimisticStatus(finalStatus);
      await setAnimeStatus(malId, title, imageUrl, finalStatus);
      toast.success(
        finalStatus
          ? `Marked as ${finalStatus}`
          : "Removed from your list"
      );
    });
  }

  function handleRemove() {
    startTransition(async () => {
      addOptimisticInList(false);
      await removeFromList(malId);
      toast.success("Removed from your list");
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant={optimisticFavorite ? "default" : "outline"}
        onClick={handleFavorite}
        disabled={isPending}
        className={optimisticFavorite ? "neon-glow" : ""}
      >
        <Heart
          className={`mr-2 h-4 w-4 ${optimisticFavorite ? "fill-current" : ""}`}
        />
        {optimisticFavorite ? "Favorited" : "Add to Favorites"}
      </Button>
      <Button
        variant={optimisticStatus === "watching" ? "default" : "outline"}
        onClick={() => handleStatus("watching")}
        disabled={isPending}
      >
        <Play className="mr-2 h-4 w-4" />
        {optimisticStatus === "watching" ? "Watching" : "Set Watching"}
      </Button>
      <Button
        variant={optimisticStatus === "watched" ? "default" : "outline"}
        onClick={() => handleStatus("watched")}
        disabled={isPending}
      >
        <Eye className="mr-2 h-4 w-4" />
        {optimisticStatus === "watched" ? "Watched" : "Set Watched"}
      </Button>
      {optimisticInList && (
        <Button
          variant="outline"
          onClick={handleRemove}
          disabled={isPending}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove from list
        </Button>
      )}
    </div>
  );
}
