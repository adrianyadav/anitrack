import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserGenres } from "@/lib/actions/preferences";
import { GenrePicker } from "@/components/genre-picker";

export default async function PreferencesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const genres = await getUserGenres(session.user.id);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Preferences</h1>
        <p className="mt-1 text-muted-foreground">
          Pick your favorite genres to get personalized recommendations
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Favorite Genres</h2>
        <GenrePicker initialGenres={genres} />
      </section>
    </div>
  );
}
