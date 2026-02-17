import { getTopAnime, getAnimeByGenre, getSeasonalAnime } from "@/lib/jikan";
import { auth } from "@/lib/auth";
import { getUserGenres } from "@/lib/actions/preferences";
import { AnimeCard } from "@/components/anime-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, TrendingUp, Sparkles, Calendar } from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  const [topAnimeRes, seasonalRes] = await Promise.all([
    getTopAnime(1),
    getSeasonalAnime(1),
  ]);

  // Genre-based recommendations if logged in
  let recommendedAnime = null;
  if (session?.user?.id) {
    const genres = await getUserGenres(session.user.id);
    if (genres.length > 0) {
      const genreMap: Record<string, number> = {
        Action: 1, Adventure: 2, Comedy: 4, Drama: 8, Fantasy: 10,
        Horror: 14, Mystery: 7, Romance: 22, "Sci-Fi": 24, "Slice of Life": 36,
        Sports: 30, Supernatural: 37, Thriller: 41,
      };
      const genreIds = genres
        .map((g) => genreMap[g])
        .filter(Boolean)
        .slice(0, 3)
        .join(",");
      if (genreIds) {
        recommendedAnime = await getAnimeByGenre(genreIds, 1);
      }
    }
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-background to-accent/20 p-8 md:p-12">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Track Your <span className="text-primary neon-text">Anime</span> Journey
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Discover trending anime, build your watchlist, and never lose track of what you&apos;re watching.
          </p>
          <div className="mt-6 flex gap-3">
            <Button size="lg" className="neon-glow" asChild>
              <Link href="/browse">
                Browse Anime
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {!session && (
              <Button size="lg" variant="outline" asChild>
                <Link href="/register">Create Account</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Personalized Recommendations */}
      {recommendedAnime && recommendedAnime.data.length > 0 && (
        <section>
          <div className="mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Recommended for You</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {recommendedAnime.data.slice(0, 10).map((anime) => (
              <AnimeCard key={anime.mal_id} anime={anime} />
            ))}
          </div>
        </section>
      )}

      {/* Trending */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Top Anime</h2>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/browse">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {topAnimeRes.data.slice(0, 10).map((anime) => (
            <AnimeCard key={anime.mal_id} anime={anime} />
          ))}
        </div>
      </section>

      {/* This Season */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">This Season</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {seasonalRes.data.slice(0, 10).map((anime) => (
            <AnimeCard key={anime.mal_id} anime={anime} />
          ))}
        </div>
      </section>
    </div>
  );
}
