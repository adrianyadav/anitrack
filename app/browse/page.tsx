import { searchAnime, getTopAnime } from "@/lib/jikan";
import { AnimeCard } from "@/components/anime-card";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface BrowsePageProps {
  searchParams: Promise<{ q?: string; genres?: string; page?: string }>;
}

function AnimeGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-3/4 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

async function AnimeResults({
  query,
  genres,
  page,
}: {
  query?: string;
  genres?: string;
  page: number;
}) {
  const result =
    query || genres
      ? await searchAnime(query ?? "", page, genres)
      : await getTopAnime(page);

  return (
    <>
      {result.data.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg text-muted-foreground">No anime found. Try a different search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {result.data.map((anime) => (
            <AnimeCard key={anime.mal_id} anime={anime} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-8 flex items-center justify-center gap-4">
        {page > 1 && (
          <Button variant="outline" asChild>
            <Link
              href={`/browse?${new URLSearchParams({
                ...(query ? { q: query } : {}),
                ...(genres ? { genres } : {}),
                page: String(page - 1),
              }).toString()}`}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Link>
          </Button>
        )}
        <span className="text-sm text-muted-foreground">Page {page}</span>
        {result.pagination.has_next_page && (
          <Button variant="outline" asChild>
            <Link
              href={`/browse?${new URLSearchParams({
                ...(query ? { q: query } : {}),
                ...(genres ? { genres } : {}),
                page: String(page + 1),
              }).toString()}`}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </>
  );
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const query = params.q;
  const genres = params.genres;
  const page = Number(params.page) || 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Browse Anime</h1>
        <p className="mt-1 text-muted-foreground">
          Search and discover anime from the MyAnimeList catalog
        </p>
      </div>

      <Suspense fallback={null}>
        <SearchBar />
      </Suspense>

      <Suspense fallback={<AnimeGridSkeleton />}>
        <AnimeResults query={query} genres={genres} page={page} />
      </Suspense>
    </div>
  );
}
