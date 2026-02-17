"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";

const GENRES = [
  { id: 1, name: "Action" },
  { id: 2, name: "Adventure" },
  { id: 4, name: "Comedy" },
  { id: 8, name: "Drama" },
  { id: 10, name: "Fantasy" },
  { id: 14, name: "Horror" },
  { id: 7, name: "Mystery" },
  { id: 22, name: "Romance" },
  { id: 24, name: "Sci-Fi" },
  { id: 36, name: "Slice of Life" },
  { id: 30, name: "Sports" },
  { id: 37, name: "Supernatural" },
  { id: 41, name: "Thriller" },
];

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const activeGenres = searchParams.get("genres")?.split(",").filter(Boolean) ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (activeGenres.length > 0) params.set("genres", activeGenres.join(","));
    params.set("page", "1");
    router.push(`/browse?${params.toString()}`);
  }

  function toggleGenre(genreId: number) {
    const id = String(genreId);
    const newGenres = activeGenres.includes(id)
      ? activeGenres.filter((g) => g !== id)
      : [...activeGenres, id];

    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (newGenres.length > 0) params.set("genres", newGenres.join(","));
    params.set("page", "1");
    router.push(`/browse?${params.toString()}`);
  }

  function clearFilters() {
    setQuery("");
    router.push("/browse");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime..."
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
        {(query || activeGenres.length > 0) && (
          <Button type="button" variant="ghost" size="icon" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        {GENRES.map((genre) => (
          <Badge
            key={genre.id}
            variant={activeGenres.includes(String(genre.id)) ? "default" : "outline"}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => toggleGenre(genre.id)}
          >
            {genre.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
