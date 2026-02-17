import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import type { JikanAnime } from "@/lib/jikan";

interface AnimeCardProps {
  anime: JikanAnime;
}

export function AnimeCard({ anime }: AnimeCardProps) {
  const title = anime.title_english || anime.title;

  return (
    <Link href={`/anime/${anime.mal_id}`} className="group block">
      <div className="relative overflow-hidden rounded-lg border border-border/50 bg-card transition-all duration-300 hover:neon-glow hover:scale-[1.02]">
        <div className="relative aspect-3/4 w-full overflow-hidden">
          <Image
            src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
          {anime.score && (
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 backdrop-blur-sm">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              <span className="text-xs font-medium">{anime.score}</span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight">
            {title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {anime.genres.slice(0, 2).map((genre) => (
              <Badge key={genre.mal_id} variant="secondary" className="text-xs px-1.5 py-0">
                {genre.name}
              </Badge>
            ))}
            {anime.type && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {anime.type}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
