"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateGenrePreferences } from "@/lib/actions/preferences";
import { toast } from "sonner";
import { Save } from "lucide-react";

const ALL_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life",
  "Sports", "Supernatural", "Thriller",
];

interface GenrePickerProps {
  initialGenres: string[];
}

export function GenrePicker({ initialGenres }: GenrePickerProps) {
  const [selected, setSelected] = useState<string[]>(initialGenres);
  const [isPending, startTransition] = useTransition();
  const hasChanges =
    JSON.stringify(selected.sort()) !== JSON.stringify(initialGenres.sort());

  function toggleGenre(genre: string) {
    setSelected((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  function handleSave() {
    startTransition(async () => {
      await updateGenrePreferences(selected);
      toast.success("Preferences saved!");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {ALL_GENRES.map((genre) => (
          <Badge
            key={genre}
            variant={selected.includes(genre) ? "default" : "outline"}
            className={`cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105 ${
              selected.includes(genre) ? "neon-glow" : ""
            }`}
            onClick={() => toggleGenre(genre)}
          >
            {genre}
          </Badge>
        ))}
      </div>
      {hasChanges && (
        <Button onClick={handleSave} disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Saving..." : "Save Preferences"}
        </Button>
      )}
    </div>
  );
}
