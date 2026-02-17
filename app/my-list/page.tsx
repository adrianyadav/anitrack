import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserAnimeList } from "@/lib/actions/anime";
import { UserAnimeCard } from "@/components/user-anime-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Eye, Play, List } from "lucide-react";

export default async function MyListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const animeList = await getUserAnimeList(session.user.id);

  const favorites = animeList.filter((a) => a.isFavorite);
  const watching = animeList.filter((a) => a.status === "watching");
  const watched = animeList.filter((a) => a.status === "watched");

  function renderList(items: typeof animeList) {
    if (items.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No anime here yet. Start browsing to add some!</p>
        </div>
      );
    }
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((anime) => (
          <UserAnimeCard
            key={anime.id}
            malId={anime.malId}
            title={anime.title}
            imageUrl={anime.imageUrl}
            status={anime.status}
            isFavorite={anime.isFavorite}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My List</h1>
        <p className="mt-1 text-muted-foreground">
          {animeList.length} anime in your collection
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <List className="h-4 w-4" />
            All ({animeList.length})
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1.5">
            <Heart className="h-4 w-4" />
            Favorites ({favorites.length})
          </TabsTrigger>
          <TabsTrigger value="watching" className="gap-1.5">
            <Play className="h-4 w-4" />
            Watching ({watching.length})
          </TabsTrigger>
          <TabsTrigger value="watched" className="gap-1.5">
            <Eye className="h-4 w-4" />
            Watched ({watched.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          {renderList(animeList)}
        </TabsContent>
        <TabsContent value="favorites" className="mt-6">
          {renderList(favorites)}
        </TabsContent>
        <TabsContent value="watching" className="mt-6">
          {renderList(watching)}
        </TabsContent>
        <TabsContent value="watched" className="mt-6">
          {renderList(watched)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
