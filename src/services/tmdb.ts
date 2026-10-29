import { EpisodeItem, MediaItem, VideoItem } from '../types';

const API_KEY = "bbd9576aac007fa885ed185429fb4770";
const BASE_URL = "https://api.themoviedb.org/3";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

const memoryCache = new Map<string, CacheEntry<any>>();

async function fetchWithCache<T>(cacheKey: string, endpoint: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
  const cached = memoryCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('language', 'pt-BR');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`TMDB error: ${res.statusText}`);
    }
    const data = (await res.json()) as T;
    memoryCache.set(cacheKey, { timestamp: now, data });
    return data;
  } catch (err) {
    if (cached) return cached.data as T;
    throw err;
  }
}

export function getFullPosterUrl(posterPath?: string | null): string {
  if (!posterPath || posterPath.trim() === '') {
    return 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico';
  }
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) return posterPath;
  if (posterPath.startsWith('/')) return `https://image.tmdb.org/t/p/w500${posterPath}`;
  return `https://image.tmdb.org/t/p/w500/${posterPath}`;
}

export function getFullBackdropUrl(backdropPath?: string | null, posterPath?: string | null): string {
  const path = backdropPath || posterPath;
  if (!path || path.trim() === '') {
    return 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico';
  }
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `https://image.tmdb.org/t/p/w1280${path}`;
  return `https://image.tmdb.org/t/p/w1280/${path}`;
}

export function getDisplayTitle(item: MediaItem): string {
  return item.title || item.name || 'Sem título';
}

export function getDisplayYear(item: MediaItem): string {
  const date = item.release_date || item.first_air_date || '';
  return date.length >= 4 ? date.substring(0, 4) : '';
}

export function isItemMovie(item: MediaItem): boolean {
  return item.media_type === 'movie' || (Boolean(item.title) && item.media_type !== 'tv');
}

export const tmdbService = {
  async getBannerTrending(): Promise<MediaItem[]> {
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>('trending_banner', '/trending/all/week');
      const filtered = res.results.filter(it => it.backdrop_path && (it.vote_count ?? 0) > 20);
      return (filtered.length > 0 ? filtered : res.results.filter(it => it.backdrop_path)).slice(0, 8);
    } catch {
      return [];
    }
  },

  async getTop10Movies(): Promise<MediaItem[]> {
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>('top10_movies', '/movie/popular');
      return res.results.slice(0, 10).map(m => ({ ...m, media_type: 'movie' }));
    } catch {
      return [];
    }
  },

  async getTop10Series(): Promise<MediaItem[]> {
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>('top10_series', '/tv/popular');
      return res.results.slice(0, 10).map(s => ({ ...s, media_type: 'tv' }));
    } catch {
      return [];
    }
  },

  async getPopularMovies(): Promise<MediaItem[]> {
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>('popular_movies', '/movie/popular');
      return res.results.map(m => ({ ...m, media_type: 'movie' }));
    } catch {
      return [];
    }
  },

  async getTopRatedMovies(): Promise<MediaItem[]> {
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>('top_rated_movies', '/movie/top_rated');
      return res.results.map(m => ({ ...m, media_type: 'movie' }));
    } catch {
      return [];
    }
  },

  async getNowPlayingMovies(): Promise<MediaItem[]> {
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>('now_playing_movies', '/movie/now_playing');
      return res.results.map(m => ({ ...m, media_type: 'movie' }));
    } catch {
      return [];
    }
  },

  async getUpcomingMovies(): Promise<MediaItem[]> {
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>('upcoming_movies', '/movie/upcoming');
      return res.results.map(m => ({ ...m, media_type: 'movie' }));
    } catch {
      return [];
    }
  },

  async getPopularSeries(): Promise<MediaItem[]> {
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>('popular_series', '/tv/popular');
      return res.results.map(s => ({ ...s, media_type: 'tv' }));
    } catch {
      return [];
    }
  },

  async getTopRatedSeries(): Promise<MediaItem[]> {
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>('top_rated_series', '/tv/top_rated');
      return res.results.map(s => ({ ...s, media_type: 'tv' }));
    } catch {
      return [];
    }
  },

  async getOnTheAirSeries(): Promise<MediaItem[]> {
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>('on_the_air_series', '/tv/on_the_air');
      return res.results.map(s => ({ ...s, media_type: 'tv' }));
    } catch {
      return [];
    }
  },

  async getMoviesByGenre(genreId: number): Promise<MediaItem[]> {
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>(
        `movies_genre_${genreId}`,
        '/discover/movie',
        { with_genres: genreId, sort_by: 'popularity.desc' }
      );
      return res.results.map(m => ({ ...m, media_type: 'movie' }));
    } catch {
      return [];
    }
  },

  async getSeriesByGenre(genreId: number): Promise<MediaItem[]> {
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>(
        `series_genre_${genreId}`,
        '/discover/tv',
        { with_genres: genreId, sort_by: 'popularity.desc' }
      );
      return res.results.map(s => ({ ...s, media_type: 'tv' }));
    } catch {
      return [];
    }
  },

  async searchMulti(query: string): Promise<MediaItem[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>(
        `search_${trimmed.toLowerCase()}`,
        '/search/multi',
        { query: trimmed, include_adult: false }
      );
      return res.results.filter(
        it => (it.media_type === 'movie' || it.media_type === 'tv') && (it.poster_path || it.backdrop_path)
      );
    } catch {
      return [];
    }
  },

  async getMediaDetails(type: 'movie' | 'tv', id: number): Promise<MediaItem | null> {
    try {
      const endpoint = type === 'movie' ? `/movie/${id}` : `/tv/${id}`;
      const data = await fetchWithCache<MediaItem>(`details_${type}_${id}`, endpoint);
      return { ...data, media_type: type };
    } catch {
      return null;
    }
  },

  async getSeasonEpisodes(tvId: number, seasonNumber: number): Promise<EpisodeItem[]> {
    try {
      const res = await fetchWithCache<{ episodes: EpisodeItem[] }>(
        `episodes_${tvId}_${seasonNumber}`,
        `/tv/${tvId}/season/${seasonNumber}`
      );
      return res.episodes || [];
    } catch {
      return [];
    }
  },

  async getTrailerYoutubeKey(type: 'movie' | 'tv', id: number): Promise<string | null> {
    try {
      const res = await fetchWithCache<{ results: VideoItem[] }>(
        `trailer_${type}_${id}`,
        `/${type}/${id}/videos`
      );
      const candidates = (res.results || []).filter(v => v.site?.toLowerCase() === 'youtube');
      const best = candidates.find(v => v.type === 'Trailer' && v.official)
        || candidates.find(v => v.type === 'Trailer')
        || candidates.find(v => v.type === 'Teaser')
        || candidates[0];
      return best?.key || null;
    } catch {
      return null;
    }
  },

  async getSimilar(type: 'movie' | 'tv', id: number): Promise<MediaItem[]> {
    try {
      const res = await fetchWithCache<{ results: MediaItem[] }>(
        `similar_${type}_${id}`,
        `/${type}/${id}/similar`
      );
      return (res.results || []).map(it => ({ ...it, media_type: type }));
    } catch {
      return [];
    }
  },

  async getImdbId(type: 'movie' | 'tv', id: number): Promise<string | null> {
    try {
      const res = await fetchWithCache<{ imdb_id?: string }>(
        `imdb_${type}_${id}`,
        `/${type}/${id}/external_ids`
      );
      return res.imdb_id || null;
    } catch {
      return null;
    }
  }
};
