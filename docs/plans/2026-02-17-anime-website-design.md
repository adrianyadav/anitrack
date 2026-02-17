# Anime Website Design

## Overview

A MyAnimeList-inspired website where users create accounts, browse popular anime via the Jikan API, add anime to favorites, and track watching/watched status. Built with Next.js 16 App Router, Neon Postgres, Drizzle ORM, and NextAuth.js.

## Architecture: Server-First with RSC

Lean into Next.js App Router. Anime data fetched in Server Components. Mutations via Server Actions writing to Neon via Drizzle. NextAuth handles sessions server-side. Minimal client JS — use `useOptimistic` for instant feedback on mutations.

## Database Schema (Neon + Drizzle)

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default random |
| name | varchar(255) | |
| email | varchar(255) | unique |
| emailVerified | timestamp | nullable |
| image | text | nullable |
| password | text | hashed, nullable (future OAuth) |
| createdAt | timestamp | default now |

### favorite_genres
| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK |
| userId | uuid | FK → users |
| genre | varchar(100) | e.g. "Action", "Romance" |

### user_anime
| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK |
| userId | uuid | FK → users |
| malId | integer | MyAnimeList anime ID |
| title | varchar(500) | denormalized from Jikan |
| imageUrl | text | denormalized from Jikan |
| status | enum | "watching" or "watched" |
| isFavorite | boolean | default false |
| createdAt | timestamp | default now |
| updatedAt | timestamp | default now |

Unique constraint on (userId, malId).

## Pages & Routes

- **`/`** — Landing. Trending anime. Personalized recs if logged in (based on genre prefs).
- **`/login`** — Email + password login form.
- **`/register`** — Sign up form (name, email, password).
- **`/browse`** — Search + genre filter. Paginated Jikan results.
- **`/anime/[id]`** — Detail page. Synopsis, score, episodes. Favorite/status buttons (auth required).
- **`/my-list`** — User's anime. Filter by: All, Favorites, Watching, Watched.
- **`/preferences`** — Pick favorite genres from a chip grid.

## Layout

Persistent top navbar: logo, nav links (Browse, My List), auth state (Login or avatar dropdown with Preferences/Logout).

## UI & Visual Design

- Dark-first theme with neon/cyberpunk accents (cyan/purple glow)
- shadcn/ui components: Card, Badge, Input, Button, Tabs, Avatar, DropdownMenu, Toast, Skeleton
- Responsive grid: 2 cols mobile → 5 cols desktop
- Anime detail: hero banner + info sidebar
- Hover animations on cards (scale + glow)

## Data Flow

### Jikan API (server-side)
- `GET /v4/top/anime` — trending
- `GET /v4/anime?q=search` — search
- `GET /v4/anime/{id}` — detail
- `GET /v4/genres/anime` — genre list

### Server Actions
- `toggleFavorite(malId, title, imageUrl)` — upsert user_anime, toggle isFavorite
- `setAnimeStatus(malId, title, imageUrl, status)` — upsert user_anime, set status
- `updateGenrePreferences(genres[])` — replace favorite_genres rows
- Auth via NextAuth credentials provider

### Session
- NextAuth `auth()` server-side
- Protected routes: /my-list, /preferences redirect to /login
- Anime detail shows action buttons only when authenticated

### Optimistic UI
- `useOptimistic` on favorite heart and status buttons

## Tech Stack Summary

- Next.js 16 (App Router, RSC, Server Actions)
- React 19
- Neon Postgres (serverless)
- Drizzle ORM
- NextAuth.js v5
- Jikan API v4 (free, no key)
- Tailwind CSS v4 + shadcn/ui
- bcrypt for password hashing
