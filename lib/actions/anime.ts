"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userAnime } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(
  malId: number,
  title: string,
  imageUrl: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const existing = await db
    .select()
    .from(userAnime)
    .where(
      and(eq(userAnime.userId, session.user.id), eq(userAnime.malId, malId))
    )
    .then((rows) => rows[0]);

  if (existing) {
    if (!existing.isFavorite && !existing.status) {
      await db
        .update(userAnime)
        .set({ isFavorite: true, updatedAt: new Date() })
        .where(eq(userAnime.id, existing.id));
    } else {
      await db
        .update(userAnime)
        .set({ isFavorite: !existing.isFavorite, updatedAt: new Date() })
        .where(eq(userAnime.id, existing.id));
    }
  } else {
    await db.insert(userAnime).values({
      userId: session.user.id,
      malId,
      title,
      imageUrl,
      isFavorite: true,
    });
  }

  revalidatePath("/my-list");
  revalidatePath(`/anime/${malId}`);
}

export async function setAnimeStatus(
  malId: number,
  title: string,
  imageUrl: string,
  status: "watching" | "watched" | null
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const existing = await db
    .select()
    .from(userAnime)
    .where(
      and(eq(userAnime.userId, session.user.id), eq(userAnime.malId, malId))
    )
    .then((rows) => rows[0]);

  if (existing) {
    await db
      .update(userAnime)
      .set({ status, updatedAt: new Date() })
      .where(eq(userAnime.id, existing.id));
  } else {
    await db.insert(userAnime).values({
      userId: session.user.id,
      malId,
      title,
      imageUrl,
      status,
    });
  }

  revalidatePath("/my-list");
  revalidatePath(`/anime/${malId}`);
}

export async function getUserAnimeList(userId: string) {
  return db.select().from(userAnime).where(eq(userAnime.userId, userId));
}

export async function getUserAnimeEntry(userId: string, malId: number) {
  return db
    .select()
    .from(userAnime)
    .where(
      and(eq(userAnime.userId, userId), eq(userAnime.malId, malId))
    )
    .then((rows) => rows[0] ?? null);
}
