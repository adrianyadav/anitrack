import { getAnimeById } from "@/lib/jikan";
import { auth } from "@/lib/auth";
import { getUserAnimeEntry } from "@/lib/actions/anime";
import { AnimeActions } from "@/components/anime-actions";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { Star, Users, Tv, Calendar } from "lucide-react";
import { notFound } from "next/navigation";

interface AnimeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnimeDetailPage({ params }: AnimeDetailPageProps) {
  const { id } = await params;
  const malId = Number(id);
  if (isNaN(malId)) notFound();

  const [animeRes, session] = await Promise.all([
    getAnimeById(malId),
    auth(),
  ]);

  const anime = animeRes.data;
  if (!anime) notFound();

  let userEntry = null;
  if (session?.user?.id) {
    userEntry = await getUserAnimeEntry(session.user.id, malId);
  }

  const title = anime.title_english || anime.title;

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-background to-accent/10 p-6 md:p-8">
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Poster */}
          <div className="shrink-0">
            <div className="relative aspect-[3/4] w-56 overflow-hidden rounded-lg neon-glow">
              <Image
                src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
                alt={title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
              {anime.title !== title && (
                <p className="mt-1 text-lg text-muted-foreground">{anime.title}</p>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-4">
              {anime.score && (
                <div className="flex items-center gap-1.5">
                  <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                  <span className="text-lg font-semibold">{anime.score}</span>
                  {anime.scored_by && (
                    <span className="text-sm text-muted-foreground">
                      ({(anime.scored_by / 1000).toFixed(0)}k votes)
                    </span>
                  )}
                </div>
              )}
              {anime.members && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{(anime.members / 1000).toFixed(0)}k members</span>
                </div>
              )}
              {anime.episodes && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Tv className="h-4 w-4" />
                  <span className="text-sm">{anime.episodes} episodes</span>
                </div>
              )}
              {anime.year && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{anime.year}</span>
                </div>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2">
              {anime.genres.map((genre) => (
                <Badge key={genre.mal_id} variant="secondary">
                  {genre.name}
                </Badge>
              ))}
              <Badge variant="outline">{anime.type}</Badge>
              <Badge variant="outline">{anime.status}</Badge>
              {anime.rating && <Badge variant="outline">{anime.rating}</Badge>}
            </div>

            <Separator />

            {/* Actions */}
            <AnimeActions
              malId={malId}
              title={title}
              imageUrl={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
              isFavorite={userEntry?.isFavorite ?? false}
              status={userEntry?.status ?? null}
              isAuthenticated={!!session}
            />
          </div>
        </div>
      </div>

      {/* Synopsis */}
      {anime.synopsis && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Synopsis</h2>
          <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
            {anime.synopsis}
          </p>
        </section>
      )}
    </div>
  );
}
