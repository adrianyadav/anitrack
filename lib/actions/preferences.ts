"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { favoriteGenres } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateGenrePreferences(genres: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  await db
    .delete(favoriteGenres)
    .where(eq(favoriteGenres.userId, session.user.id));

  if (genres.length > 0) {
    await db.insert(favoriteGenres).values(
      genres.map((genre) => ({
        userId: session.user!.id!,
        genre,
      }))
    );
  }

  revalidatePath("/");
  revalidatePath("/preferences");
}

export async function getUserGenres(userId: string) {
  const rows = await db
    .select()
    .from(favoriteGenres)
    .where(eq(favoriteGenres.userId, userId));
  return rows.map((r) => r.genre);
}
