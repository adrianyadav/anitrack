# Anime Website Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a MyAnimeList-inspired anime website where users can create accounts, browse popular anime via Jikan API, add favorites, and track watching/watched status.

**Architecture:** Server-first Next.js 16 App Router with RSC. All Jikan API calls made server-side. Mutations via Server Actions writing to Neon Postgres through Drizzle ORM. NextAuth v5 for authentication. Dark neon-themed UI with shadcn/ui.

**Tech Stack:** Next.js 16, React 19, Neon Postgres, Drizzle ORM, NextAuth v5, Jikan API v4, Tailwind CSS v4, shadcn/ui

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Drizzle + Neon packages**

Run:
```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

**Step 2: Install NextAuth + bcrypt**

Run:
```bash
npm install next-auth@beta @auth/drizzle-adapter bcryptjs
npm install -D @types/bcryptjs
```

**Step 3: Create .env.local with placeholders**

Create: `.env.local`
```
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
AUTH_SECRET=generate-with-npx-auth-secret
AUTH_URL=http://localhost:3000
```

User must fill in their actual Neon connection string and run `npx auth secret` to generate AUTH_SECRET.

**Step 4: Add .env.local to .gitignore verification**

Verify `.env.local` is already in `.gitignore` (it is by default in Next.js).

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add drizzle, neon, nextauth, bcrypt dependencies"
```

---

### Task 2: Database Schema + Drizzle Config

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/index.ts`
- Create: `drizzle.config.ts`

**Step 1: Create Drizzle schema**

Create `lib/db/schema.ts`:
```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  serial,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const animeStatusEnum = pgEnum("anime_status", ["watching", "watched"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: varchar("token_type", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  id_token: text("id_token"),
  session_state: varchar("session_state", { length: 255 }),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const favoriteGenres = pgTable("favorite_genres", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  genre: varchar("genre", { length: 100 }).notNull(),
});

export const userAnime = pgTable(
  "user_anime",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    malId: integer("mal_id").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    imageUrl: text("image_url"),
    status: animeStatusEnum("status"),
    isFavorite: boolean("is_favorite").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_anime_unique").on(table.userId, table.malId),
  ]
);
```

**Step 2: Create DB connection**

Create `lib/db/index.ts`:
```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

**Step 3: Create Drizzle config**

Create `drizzle.config.ts`:
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Step 4: Add drizzle scripts to package.json**

Add to `scripts` in `package.json`:
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

**Step 5: Run db:push to create tables**

Run:
```bash
npm run db:push
```

Note: User must have DATABASE_URL set in .env.local first.

**Step 6: Commit**

```bash
git add lib/db/schema.ts lib/db/index.ts drizzle.config.ts package.json
git commit -m "feat: add drizzle schema with users, user_anime, favorite_genres tables"
```

---

### Task 3: NextAuth Configuration

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

**Step 1: Create auth config**

Create `lib/auth.ts`:
```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .then((rows) => rows[0]);

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
```

**Step 2: Create API route**

Create `app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

**Step 3: Commit**

```bash
git add lib/auth.ts app/api/auth/
git commit -m "feat: configure NextAuth with credentials provider and Drizzle adapter"
```

---

### Task 4: Auth Server Actions (Register)

**Files:**
- Create: `lib/actions/auth.ts`

**Step 1: Create register action**

Create `lib/actions/auth.ts`:
```typescript
"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signIn } from "@/lib/auth";

export async function register(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "All fields are required" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .then((rows) => rows[0]);

  if (existing) {
    return { error: "Email already in use" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/",
  });
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "All fields are required" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    // NextAuth throws NEXT_REDIRECT on success, rethrow it
    if ((error as Error).message?.includes("NEXT_REDIRECT")) {
      throw error;
    }
    return { error: "Invalid email or password" };
  }
}
```

**Step 2: Commit**

```bash
git add lib/actions/auth.ts
git commit -m "feat: add register and login server actions"
```

---

### Task 5: Install shadcn/ui Components

**Step 1: Add required shadcn components**

Run:
```bash
npx shadcn@latest add button card input label badge tabs avatar dropdown-menu toast skeleton separator
```

**Step 2: Commit**

```bash
git add components/ui/
git commit -m "feat: add shadcn/ui components (button, card, input, badge, tabs, etc.)"
```

---

### Task 6: Dark Neon Theme + Global Styles

**Files:**
- Modify: `app/globals.css`

**Step 1: Update CSS variables for neon dark theme**

Replace the `:root` and `.dark` blocks in `app/globals.css` with neon-themed colors. The dark theme should be the primary look — deep navy background with cyan and purple neon accents.

Update `:root` (light mode - keep minimal):
```css
:root {
  --radius: 0.625rem;
  --background: oklch(0.985 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.65 0.25 265);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.95 0.01 265);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.75 0.15 195);
  --accent-foreground: oklch(0.145 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.65 0.25 265);
  --chart-1: oklch(0.65 0.25 265);
  --chart-2: oklch(0.75 0.15 195);
  --chart-3: oklch(0.7 0.2 330);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.65 0.25 265);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.95 0.01 265);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.65 0.25 265);
}
```

Update `.dark`:
```css
.dark {
  --background: oklch(0.13 0.02 265);
  --foreground: oklch(0.93 0.01 265);
  --card: oklch(0.17 0.025 265);
  --card-foreground: oklch(0.93 0.01 265);
  --popover: oklch(0.17 0.025 265);
  --popover-foreground: oklch(0.93 0.01 265);
  --primary: oklch(0.72 0.25 265);
  --primary-foreground: oklch(0.13 0.02 265);
  --secondary: oklch(0.22 0.03 265);
  --secondary-foreground: oklch(0.93 0.01 265);
  --muted: oklch(0.22 0.03 265);
  --muted-foreground: oklch(0.65 0.02 265);
  --accent: oklch(0.78 0.18 195);
  --accent-foreground: oklch(0.13 0.02 265);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.72 0.25 265);
  --chart-1: oklch(0.72 0.25 265);
  --chart-2: oklch(0.78 0.18 195);
  --chart-3: oklch(0.7 0.2 330);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.17 0.025 265);
  --sidebar-foreground: oklch(0.93 0.01 265);
  --sidebar-primary: oklch(0.72 0.25 265);
  --sidebar-primary-foreground: oklch(0.93 0.01 265);
  --sidebar-accent: oklch(0.22 0.03 265);
  --sidebar-accent-foreground: oklch(0.93 0.01 265);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.72 0.25 265);
}
```

**Step 2: Add neon glow utility classes at end of globals.css**

```css
@layer utilities {
  .neon-glow {
    box-shadow: 0 0 15px oklch(0.72 0.25 265 / 30%), 0 0 45px oklch(0.72 0.25 265 / 10%);
  }
  .neon-glow-cyan {
    box-shadow: 0 0 15px oklch(0.78 0.18 195 / 30%), 0 0 45px oklch(0.78 0.18 195 / 10%);
  }
  .neon-text {
    text-shadow: 0 0 10px oklch(0.72 0.25 265 / 50%), 0 0 30px oklch(0.72 0.25 265 / 20%);
  }
}
```

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add dark neon theme with cyan/purple accents and glow utilities"
```

---

### Task 7: Layout + Navbar

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/navbar.tsx`

**Step 1: Create Navbar component**

Create `components/navbar.tsx`:
```tsx
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Heart, User, LogOut, Settings, Tv } from "lucide-react";

export async function Navbar() {
  const session = await auth();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Tv className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold neon-text">AniTrack</span>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <Link
              href="/browse"
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Search className="h-4 w-4" />
              Browse
            </Link>
            {session && (
              <Link
                href="/my-list"
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <Heart className="h-4 w-4" />
                My List
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {session.user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{session.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/my-list" className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    My List
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/preferences" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Preferences
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button type="submit" className="flex w-full items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" className="neon-glow" asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
```

**Step 2: Update root layout**

Modify `app/layout.tsx` to add dark class, Navbar, and Toaster:
```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AniTrack — Track Your Anime",
  description: "Browse, track, and organize your anime watchlist",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
```

Note: We need `sonner` for Toaster. Run `npx shadcn@latest add sonner` during Task 5.

**Step 3: Commit**

```bash
git add components/navbar.tsx app/layout.tsx
git commit -m "feat: add navbar with auth state and update root layout with dark theme"
```

---

### Task 8: Jikan API Client

**Files:**
- Create: `lib/jikan.ts`

**Step 1: Create Jikan API helper**

Create `lib/jikan.ts`:
```typescript
const JIKAN_BASE = "https://api.jikan.moe/v4";

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  images: {
    jpg: { image_url: string; large_image_url: string };
    webp: { image_url: string; large_image_url: string };
  };
  synopsis: string | null;
  score: number | null;
  scored_by: number | null;
  episodes: number | null;
  status: string;
  rating: string | null;
  genres: { mal_id: number; name: string }[];
  year: number | null;
  season: string | null;
  type: string;
  members: number;
  rank: number | null;
  popularity: number | null;
  trailer: { youtube_id: string | null } | null;
}

interface JikanPaginatedResponse {
  data: JikanAnime[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
  };
}

interface JikanSingleResponse {
  data: JikanAnime;
}

interface JikanGenre {
  mal_id: number;
  name: string;
  count: number;
}

async function jikanFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${JIKAN_BASE}${path}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Jikan API error: ${res.status}`);
  return res.json();
}

export async function getTopAnime(page = 1) {
  return jikanFetch<JikanPaginatedResponse>(`/top/anime?page=${page}&limit=20`);
}

export async function searchAnime(query: string, page = 1, genres?: string) {
  let url = `/anime?q=${encodeURIComponent(query)}&page=${page}&limit=20&sfw=true`;
  if (genres) url += `&genres=${genres}`;
  return jikanFetch<JikanPaginatedResponse>(url);
}

export async function getAnimeById(id: number) {
  return jikanFetch<JikanSingleResponse>(`/anime/${id}/full`);
}

export async function getAnimeByGenre(genreIds: string, page = 1) {
  return jikanFetch<JikanPaginatedResponse>(
    `/anime?genres=${genreIds}&order_by=score&sort=desc&page=${page}&limit=20&sfw=true`
  );
}

export async function getGenres() {
  const res = await jikanFetch<{ data: JikanGenre[] }>("/genres/anime");
  return res.data;
}

export async function getSeasonalAnime(page = 1) {
  return jikanFetch<JikanPaginatedResponse>(`/seasons/now?page=${page}&limit=20`);
}
```

**Step 2: Commit**

```bash
git add lib/jikan.ts
git commit -m "feat: add Jikan API client with typed responses"
```

---

### Task 9: Anime Server Actions (Favorites + Status)

**Files:**
- Create: `lib/actions/anime.ts`

**Step 1: Create anime server actions**

Create `lib/actions/anime.ts`:
```typescript
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
      // Was only un-favorited with no status — toggle favorite on
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
```

**Step 2: Commit**

```bash
git add lib/actions/anime.ts
git commit -m "feat: add anime server actions for favorites and status tracking"
```

---

### Task 10: Genre Preferences Server Action

**Files:**
- Create: `lib/actions/preferences.ts`

**Step 1: Create preferences actions**

Create `lib/actions/preferences.ts`:
```typescript
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { favoriteGenres } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateGenrePreferences(genres: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // Delete existing and insert new
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
```

**Step 2: Commit**

```bash
git add lib/actions/preferences.ts
git commit -m "feat: add genre preferences server actions"
```

---

### Task 11: Login Page

**Files:**
- Create: `app/login/page.tsx`

**Step 1: Create login page**

Create `app/login/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "@/lib/actions/auth";
import { Tv } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md neon-glow">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Tv className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your AniTrack account</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/login/
git commit -m "feat: add login page"
```

---

### Task 12: Register Page

**Files:**
- Create: `app/register/page.tsx`

**Step 1: Create register page**

Create `app/register/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { register } from "@/lib/actions/auth";
import { Tv } from "lucide-react";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await register(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md neon-glow">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Tv className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Start tracking your anime journey</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Your name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/register/
git commit -m "feat: add register page"
```

---

### Task 13: Anime Card Component

**Files:**
- Create: `components/anime-card.tsx`

**Step 1: Create reusable anime card**

Create `components/anime-card.tsx`:
```tsx
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
        <div className="relative aspect-[3/4] w-full overflow-hidden">
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
```

**Step 2: Commit**

```bash
git add components/anime-card.tsx
git commit -m "feat: add anime card component with hover glow effect"
```

---

### Task 14: Home Page

**Files:**
- Modify: `app/page.tsx`

**Step 1: Replace default page with trending anime**

Replace `app/page.tsx`:
```tsx
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
      // Map genre names to Jikan genre IDs (common ones)
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
```

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add home page with trending, seasonal, and recommended anime"
```

---

### Task 15: Browse Page

**Files:**
- Create: `app/browse/page.tsx`
- Create: `components/search-bar.tsx`

**Step 1: Create search bar client component**

Create `components/search-bar.tsx`:
```tsx
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
```

**Step 2: Create browse page**

Create `app/browse/page.tsx`:
```tsx
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
          <Skeleton className="aspect-[3/4] w-full rounded-lg" />
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
```

**Step 3: Commit**

```bash
git add components/search-bar.tsx app/browse/
git commit -m "feat: add browse page with search, genre filters, and pagination"
```

---

### Task 16: Anime Detail Page

**Files:**
- Create: `app/anime/[id]/page.tsx`
- Create: `components/anime-actions.tsx`

**Step 1: Create anime actions client component**

Create `components/anime-actions.tsx`:
```tsx
"use client";

import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Eye, Play } from "lucide-react";
import { toggleFavorite, setAnimeStatus } from "@/lib/actions/anime";
import { toast } from "sonner";

interface AnimeActionsProps {
  malId: number;
  title: string;
  imageUrl: string;
  isFavorite: boolean;
  status: "watching" | "watched" | null;
  isAuthenticated: boolean;
}

export function AnimeActions({
  malId,
  title,
  imageUrl,
  isFavorite,
  status,
  isAuthenticated,
}: AnimeActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(isFavorite);
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-muted-foreground">
        Sign in to add this anime to your list.
      </p>
    );
  }

  function handleFavorite() {
    startTransition(async () => {
      setOptimisticFavorite(!optimisticFavorite);
      await toggleFavorite(malId, title, imageUrl);
      toast.success(optimisticFavorite ? "Removed from favorites" : "Added to favorites");
    });
  }

  function handleStatus(newStatus: "watching" | "watched") {
    const finalStatus = optimisticStatus === newStatus ? null : newStatus;
    startTransition(async () => {
      setOptimisticStatus(finalStatus);
      await setAnimeStatus(malId, title, imageUrl, finalStatus);
      toast.success(
        finalStatus
          ? `Marked as ${finalStatus}`
          : "Removed from your list"
      );
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant={optimisticFavorite ? "default" : "outline"}
        onClick={handleFavorite}
        disabled={isPending}
        className={optimisticFavorite ? "neon-glow" : ""}
      >
        <Heart
          className={`mr-2 h-4 w-4 ${optimisticFavorite ? "fill-current" : ""}`}
        />
        {optimisticFavorite ? "Favorited" : "Add to Favorites"}
      </Button>
      <Button
        variant={optimisticStatus === "watching" ? "default" : "outline"}
        onClick={() => handleStatus("watching")}
        disabled={isPending}
      >
        <Play className="mr-2 h-4 w-4" />
        {optimisticStatus === "watching" ? "Watching" : "Set Watching"}
      </Button>
      <Button
        variant={optimisticStatus === "watched" ? "default" : "outline"}
        onClick={() => handleStatus("watched")}
        disabled={isPending}
      >
        <Eye className="mr-2 h-4 w-4" />
        {optimisticStatus === "watched" ? "Watched" : "Set Watched"}
      </Button>
    </div>
  );
}
```

**Step 2: Create anime detail page**

Create `app/anime/[id]/page.tsx`:
```tsx
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
```

**Step 3: Commit**

```bash
git add components/anime-actions.tsx app/anime/
git commit -m "feat: add anime detail page with favorite/status actions and optimistic UI"
```

---

### Task 17: My List Page

**Files:**
- Create: `app/my-list/page.tsx`
- Create: `components/user-anime-card.tsx`

**Step 1: Create user anime card component**

Create `components/user-anime-card.tsx`:
```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Eye, Play, X } from "lucide-react";
import { toggleFavorite, setAnimeStatus } from "@/lib/actions/anime";
import { useTransition } from "react";
import { toast } from "sonner";

interface UserAnimeCardProps {
  malId: number;
  title: string;
  imageUrl: string | null;
  status: "watching" | "watched" | null;
  isFavorite: boolean;
}

export function UserAnimeCard({
  malId,
  title,
  imageUrl,
  status,
  isFavorite,
}: UserAnimeCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleFavorite() {
    startTransition(async () => {
      await toggleFavorite(malId, title, imageUrl ?? "");
      toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
    });
  }

  function handleStatus(newStatus: "watching" | "watched" | null) {
    startTransition(async () => {
      await setAnimeStatus(malId, title, imageUrl ?? "", newStatus);
      toast.success(newStatus ? `Marked as ${newStatus}` : "Removed status");
    });
  }

  return (
    <div className="flex gap-4 rounded-lg border border-border/50 bg-card p-3 transition-all hover:border-primary/30">
      <Link href={`/anime/${malId}`} className="shrink-0">
        <div className="relative h-28 w-20 overflow-hidden rounded-md">
          {imageUrl ? (
            <Image src={imageUrl} alt={title} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
              No Image
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <Link href={`/anime/${malId}`} className="font-medium hover:text-primary">
            {title}
          </Link>
          <div className="mt-1 flex gap-1.5">
            {isFavorite && (
              <Badge variant="default" className="text-xs">
                <Heart className="mr-1 h-3 w-3 fill-current" />
                Favorite
              </Badge>
            )}
            {status && (
              <Badge variant="secondary" className="text-xs">
                {status === "watching" ? (
                  <Play className="mr-1 h-3 w-3" />
                ) : (
                  <Eye className="mr-1 h-3 w-3" />
                )}
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFavorite}
            disabled={isPending}
            className="h-7 px-2 text-xs"
          >
            <Heart className={`mr-1 h-3 w-3 ${isFavorite ? "fill-current text-primary" : ""}`} />
            {isFavorite ? "Unfav" : "Fav"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatus(status === "watching" ? null : "watching")}
            disabled={isPending}
            className="h-7 px-2 text-xs"
          >
            <Play className={`mr-1 h-3 w-3 ${status === "watching" ? "text-primary" : ""}`} />
            Watching
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatus(status === "watched" ? null : "watched")}
            disabled={isPending}
            className="h-7 px-2 text-xs"
          >
            <Eye className={`mr-1 h-3 w-3 ${status === "watched" ? "text-primary" : ""}`} />
            Watched
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create my list page**

Create `app/my-list/page.tsx`:
```tsx
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
```

**Step 3: Commit**

```bash
git add components/user-anime-card.tsx app/my-list/
git commit -m "feat: add my list page with tabs for all/favorites/watching/watched"
```

---

### Task 18: Preferences Page

**Files:**
- Create: `app/preferences/page.tsx`
- Create: `components/genre-picker.tsx`

**Step 1: Create genre picker client component**

Create `components/genre-picker.tsx`:
```tsx
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
```

**Step 2: Create preferences page**

Create `app/preferences/page.tsx`:
```tsx
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
```

**Step 3: Commit**

```bash
git add components/genre-picker.tsx app/preferences/
git commit -m "feat: add preferences page with genre picker"
```

---

### Task 19: Configure next.config for Jikan images

**Files:**
- Modify: `next.config.ts`

**Step 1: Add Jikan image domain to Next.js config**

Update `next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.myanimelist.net",
      },
    ],
  },
};

export default nextConfig;
```

**Step 2: Commit**

```bash
git add next.config.ts
git commit -m "feat: add MAL CDN to allowed image domains"
```

---

### Task 20: Final Verification

**Step 1: Run lint**

```bash
npm run lint
```

Fix any linting errors.

**Step 2: Run build**

```bash
npm run build
```

Fix any build errors. Note: build will fail without DATABASE_URL set, so verify with `npm run dev` locally after user configures .env.local.

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve lint and build errors"
```
