import React, { useState, useEffect } from 'react';
import { X, Play, Plus, Check, Film, Tv, Video, Sparkles, ChevronDown } from 'lucide-react';
import { EpisodeItem, MediaItem } from '../types';
import { tmdbService, getDisplayTitle, getDisplayYear, getFullBackdropUrl, getFullPosterUrl, isItemMovie } from '../services/tmdb';
import { useNetfilmes } from '../context/StoreContext';
import { MediaCard } from './MediaCard';

interface DetailModalProps {
  item: MediaItem;
  onClose: () => void;
  onPlay: (item: MediaItem, season?: number, episode?: number, epTitle?: string) => void;
  onSelectSimilar: (item: MediaItem) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  item,
  onClose,
  onPlay,
  onSelectSimilar
}) => {
  const { togglePlaylist, isInPlaylist, getContinueWatching } = useNetfilmes();

  const isMovie = isItemMovie(item);
  const mediaType: 'movie' | 'tv' = isMovie ? 'movie' : 'tv';

  const [details, setDetails] = useState<MediaItem>(item);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [similar, setSimilar] = useState<MediaItem[]>([]);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [loading, setLoading] = useState(true);

  const inList = isInPlaylist(mediaType, item.id);

  // Check saved progress
  const continueWatching = getContinueWatching();
  const savedProgress = continueWatching.find(
    p => p.media?.id === item.id && (isMovie || p.media?.season === selectedSeason)
  );

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadData() {
      try {
        const [det, sim, trailer] = await Promise.all([
          tmdbService.getMediaDetails(mediaType, item.id),
          tmdbService.getSimilar(mediaType, item.id),
          tmdbService.getTrailerYoutubeKey(mediaType, item.id)
        ]);

        if (!isMounted) return;
        if (det) setDetails(det);
        setSimilar(sim);
        setTrailerKey(trailer);

        if (!isMovie) {
          const eps = await tmdbService.getSeasonEpisodes(item.id, selectedSeason);
          if (isMounted) setEpisodes(eps);
        }
      } catch (err) {
        console.warn("Detail fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [item.id, mediaType]);

  // Load episodes when season changes
  useEffect(() => {
    if (isMovie) return;
    let isMounted = true;
    tmdbService.getSeasonEpisodes(item.id, selectedSeason).then(eps => {
      if (isMounted) setEpisodes(eps);
    });
    return () => {
      isMounted = false;
    };
  }, [item.id, selectedSeason, isMovie]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const title = getDisplayTitle(details);
  const year = getDisplayYear(details);
  const backdropUrl = getFullBackdropUrl(details.backdrop_path, details.poster_path);
  const totalSeasons = details.number_of_seasons || 1;
  const matchPercent = details.vote_average ? Math.round(details.vote_average * 10) : 96;

  const handleStartPlay = () => {
    if (savedProgress?.media?.season && savedProgress?.media?.episode) {
      onPlay(details, savedProgress.media.season, savedProgress.media.episode, savedProgress.media.episodeTitle || undefined);
    } else {
      onPlay(details, isMovie ? undefined : selectedSeason, isMovie ? undefined : 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex justify-center p-0 md:p-6 animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-[#181818] rounded-none md:rounded-xl overflow-hidden shadow-2xl z-10 my-auto text-white border border-white/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-[#181818]/80 hover:bg-[#282828] text-white flex items-center justify-center cursor-pointer transition-all border border-white/10 focus:outline-none"
          title="Fechar (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Banner / Video Header */}
        <div className="relative w-full h-[320px] md:h-[420px] bg-cover bg-center" style={{ backgroundImage: `url(${backdropUrl})` }}>
          {showTrailer && trailerKey ? (
            <div className="absolute inset-0 bg-black z-20">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
                title="Trailer"
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
              <button
                onClick={() => setShowTrailer(false)}
                className="absolute top-4 left-4 z-30 px-3 py-1.5 rounded-md bg-black/70 hover:bg-black text-xs font-bold text-white border border-white/20 cursor-pointer"
              >
                Voltar à capa
              </button>
            </div>
          ) : (
            <>
              {/* Gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-black/40 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#181818]/90 via-[#181818]/40 to-transparent pointer-events-none" />

              {/* Title & Primary Action overlay */}
              <div className="absolute bottom-8 left-6 md:left-12 right-6 md:right-12 z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#E50914] font-black text-lg">N</span>
                  <span className="text-xs font-black tracking-widest text-gray-300 uppercase">
                    {isMovie ? 'FILME' : 'SÉRIE'}
                  </span>
                </div>

                <h1 className="text-2xl md:text-4xl font-black text-white mb-4 drop-shadow-md">
                  {title}
                </h1>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Play Button */}
                  <button
                    onClick={handleStartPlay}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-white text-black font-bold text-sm md:text-base hover:bg-white/80 active:scale-95 transition-all shadow-lg cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-black" />
                    {savedProgress ? 'Continuar assistindo' : 'Assistir'}
                  </button>

                  {/* Add to Playlist */}
                  <button
                    onClick={() => togglePlaylist(details)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-white/15 hover:bg-white/25 active:scale-95 text-white font-semibold text-sm backdrop-blur-md transition-all cursor-pointer border border-white/20"
                    title={inList ? 'Remover da Minha Lista' : 'Adicionar à Minha Lista'}
                  >
                    {inList ? <Check className="w-5 h-5 text-emerald-400" /> : <Plus className="w-5 h-5" />}
                    <span>{inList ? 'Na Minha Lista' : 'Minha Lista'}</span>
                  </button>

                  {/* Trailer Button */}
                  {trailerKey && (
                    <button
                      onClick={() => setShowTrailer(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-white/15 hover:bg-white/25 active:scale-95 text-white font-semibold text-sm backdrop-blur-md transition-all cursor-pointer border border-white/20"
                    >
                      <Video className="w-5 h-5" />
                      Trailer
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-10 space-y-8">
          {/* Metadata Row */}
          <div className="flex items-center gap-4 text-sm font-semibold flex-wrap">
            <span className="text-[#46D369] font-bold">{matchPercent}% relevante</span>
            {year && <span className="text-gray-300">{year}</span>}
            <span className="px-1.5 py-0.5 rounded bg-white/20 text-xs font-bold text-gray-200">14+</span>
            <span className="px-1.5 py-0.5 rounded border border-white/40 text-[10px] font-bold text-gray-300">4K ULTRA HD</span>
            {details.runtime ? (
              <span className="text-gray-300">{Math.floor(details.runtime / 60)}h {details.runtime % 60}m</span>
            ) : totalSeasons ? (
              <span className="text-gray-300">{totalSeasons} {totalSeasons > 1 ? 'Temporadas' : 'Temporada'}</span>
            ) : null}
          </div>

          {/* Synopsis */}
          {details.overview && (
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              {details.overview}
            </p>
          )}

          {/* Genres */}
          {details.genres && details.genres.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 font-bold">Gêneros:</span>
              <span className="text-gray-200">{details.genres.map(g => g.name).join(', ')}</span>
            </div>
          )}

          {/* TV Series Season & Episode Section */}
          {!isMovie && (
            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Tv className="w-5 h-5 text-[#E50914]" />
                  Episódios
                </h3>

                {/* Season Dropdown */}
                {totalSeasons > 1 && (
                  <div className="relative">
                    <select
                      value={selectedSeason}
                      onChange={e => setSelectedSeason(Number(e.target.value))}
                      className="bg-[#242424] text-white border border-white/20 rounded-md px-4 py-2 pr-8 text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:border-[#E50914]"
                    >
                      {Array.from({ length: totalSeasons }, (_, i) => i + 1).map(s => (
                        <option key={s} value={s}>
                          Temporada {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Episodes List */}
              <div className="space-y-3">
                {episodes.map(ep => {
                  const epStill = ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : backdropUrl;
                  return (
                    <div
                      key={ep.id}
                      onClick={() => onPlay(details, ep.season_number, ep.episode_number, ep.name || undefined)}
                      className="group flex flex-col md:flex-row gap-4 p-3 rounded-lg bg-[#202020] hover:bg-[#282828] cursor-pointer transition-all border border-transparent hover:border-white/20"
                    >
                      {/* Thumbnail with Play Icon */}
                      <div className="relative shrink-0 w-full md:w-44 h-24 rounded-md overflow-hidden bg-black/40">
                        <img
                          src={epStill}
                          alt={ep.name || `Episódio ${ep.episode_number}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-10 h-10 rounded-full bg-[#E50914] flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Episode Info */}
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-baseline justify-between mb-1">
                          <h4 className="text-sm md:text-base font-bold text-white group-hover:text-[#E50914] transition-colors">
                            {ep.episode_number}. {ep.name || 'Episódio'}
                          </h4>
                          {ep.runtime && (
                            <span className="text-xs text-gray-400 font-semibold">{ep.runtime} min</span>
                          )}
                        </div>
                        {ep.overview && (
                          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                            {ep.overview}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Similar Titles */}
          {similar.length > 0 && (
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Títulos semelhantes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {similar.slice(0, 8).map(simItem => (
                  <MediaCard
                    key={simItem.id}
                    item={simItem}
                    onClick={onSelectSimilar}
                    usePosterAspect={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
