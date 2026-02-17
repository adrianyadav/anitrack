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
