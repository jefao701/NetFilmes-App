import React from 'react';
import { Play } from 'lucide-react';
import { MediaItem } from '../types';
import { getDisplayTitle, getDisplayYear, getFullBackdropUrl, getFullPosterUrl, isItemMovie } from '../services/tmdb';

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  progressFraction?: number;
  usePosterAspect?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onClick,
  progressFraction,
  usePosterAspect = false
}) => {
  const title = getDisplayTitle(item);
  const year = getDisplayYear(item);
  const isMovie = isItemMovie(item);

  const imageUrl = usePosterAspect
    ? getFullPosterUrl(item.poster_path || item.backdrop_path)
    : getFullBackdropUrl(item.backdrop_path, item.poster_path);

  return (
    <div
      onClick={() => onClick(item)}
      className={`group relative shrink-0 rounded-md overflow-hidden bg-[#1F1F1F] cursor-pointer transition-all duration-300 ease-out transform hover:scale-108 hover:z-30 hover:shadow-2xl hover:shadow-black hover:ring-2 hover:ring-white focus:outline-none focus:scale-108 focus:ring-2 focus:ring-[#E50914] ${
        usePosterAspect ? 'w-[150px] md:w-[180px] h-[225px] md:h-[270px]' : 'w-[230px] md:w-[260px] h-[135px] md:h-[150px]'
      }`}
    >
      {/* Media Image */}
      <img
        src={imageUrl}
        alt={title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:brightness-105"
      />

      {/* Top Left Netflix N Brand mark */}
      <div className="absolute top-2 left-2.5 z-10">
        <span className="text-[#E50914] font-black text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">N</span>
      </div>

      {/* Type badge on top right */}
      <div className="absolute top-2 right-2 z-10">
        <span
          className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow ${
            isMovie ? 'bg-[#E50914]/90 text-white' : 'bg-[#0071EB]/90 text-white'
          }`}
        >
          {isMovie ? 'FILME' : 'SÉRIE'}
        </span>
      </div>

      {/* Card Info Gradient Overlay on bottom */}
      <div className="absolute inset-x-0 bottom-0 pt-8 pb-2 px-2.5 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col justify-end">
        <p className="text-white text-xs md:text-sm font-bold truncate drop-shadow">
          {title}
        </p>
        <div className="flex items-center justify-between text-[11px] text-gray-300 mt-0.5">
          {item.vote_average ? (
            <span className="text-[#46D369] font-semibold">{Math.round(item.vote_average * 10)}%</span>
          ) : (
            <span className="text-gray-400">Netfilmes</span>
          )}
          {year && <span>{year}</span>}
        </div>
      </div>

      {/* Hover Play Button Quick Overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
          <Play className="w-5 h-5 fill-black text-black ml-0.5" />
        </div>
      </div>

      {/* Continue Watching Progress Bar */}
      {typeof progressFraction === 'number' && progressFraction > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30 z-20 overflow-hidden">
          <div
            className="h-full bg-[#E50914]"
            style={{ width: `${Math.min(100, Math.max(0, progressFraction * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
};
