export interface Genre {
  id: number;
  name: string;
}

export interface SeasonSummary {
  id: number;
  season_number: number;
  name: string | null;
  episode_count: number;
  poster_path: string | null;
}

export interface EpisodeItem {
  id: number;
  episode_number: number;
  season_number: number;
  name: string | null;
  overview: string | null;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
}

export interface VideoItem {
  id: string;
  key: string;
  name: string | null;
  site: string | null;
  type: string | null;
  official: boolean;
}

export interface MediaItem {
  id: number;
  title?: string | null;
  name?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  release_date?: string | null;
  first_air_date?: string | null;
  media_type?: string | null;
  genre_ids?: number[] | null;
  genres?: Genre[] | null;
  runtime?: number | null;
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
  seasons?: SeasonSummary[] | null;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  color: string;
  photo?: string | null;
  cover?: string | null;
  createdAt: number;
}

export interface MediaProgressSummary {
  type: 'movie' | 'tv';
  id: number;
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  year?: string | null;
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
}

export interface ProgressItem {
  key: string; // "movie:550" or "tv:1396:1:1"
  position: number; // in seconds
  duration: number; // in seconds
  updatedAt: number;
  media?: MediaProgressSummary | null;
}

export interface MediaPlaylistSummary {
  type: 'movie' | 'tv';
  id: number;
  title: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  rating?: number | null;
  year?: string | null;
  date?: string | null;
}

export interface PlaylistItem {
  key: string; // "movie:550" or "tv:1396"
  addedAt: number;
  media?: MediaPlaylistSummary | null;
}

export interface Subtitle {
  label: string;
  lang: string;
  url: string;
}

export interface StreamSource {
  label: string;
  url: string;
  kind?: string; // "hls", "mp4", "embed", "youtube"
  quality?: string;
  subtitles?: Subtitle[];
  provider?: string | null;
}

export interface Addon {
  url: string;
  name: string;
  enabled: boolean;
  kind?: string; // "native", "stremio", "auto"
  baseUrl?: string | null;
  builtin?: boolean;
}

export type NavigationTab = 'home' | 'movies' | 'series' | 'playlist' | 'search' | 'account' | 'profiles';
