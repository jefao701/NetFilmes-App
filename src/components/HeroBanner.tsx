import React, { useState, useEffect } from 'react';
import { Play, Info, Volume2, VolumeX } from 'lucide-react';
import { MediaItem } from '../types';
import { getDisplayTitle, getDisplayYear, getFullBackdropUrl, isItemMovie } from '../services/tmdb';

interface HeroBannerProps {
  items: MediaItem[];
  onPlayClick: (item: MediaItem) => void;
  onDetailClick: (item: MediaItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  items,
  onPlayClick,
  onDetailClick
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!items.length || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [items, isPaused]);

  if (!items.length) {
    return (
      <div className="w-full h-[520px] bg-gradient-to-t from-[#141414] via-[#1F1F1F] to-[#121212] animate-pulse flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const backdropUrl = getFullBackdropUrl(currentItem.backdrop_path, currentItem.poster_path);
  const title = getDisplayTitle(currentItem);
  const year = getDisplayYear(currentItem);
  const isMovie = isItemMovie(currentItem);
  const matchPercent = currentItem.vote_average ? Math.round(currentItem.vote_average * 10) : 95;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full h-[520px] md:h-[580px] bg-cover bg-center transition-all duration-700 ease-in-out select-none flex items-end pb-16 px-8 md:px-16"
      style={{
        backgroundImage: `url(${backdropUrl})`,
        backgroundPosition: 'center 25%'
      }}
    >
      {/* Cinematic Multi-layer Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/95 via-[#141414]/65 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent pointer-events-none" />

      {/* Hero Content */}
      <div className="relative z-10 max-w-2xl">
        {/* Netflix Brand Tag */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[#E50914] font-black text-xl leading-none tracking-tighter">N</span>
          <span className="text-xs font-black tracking-[0.25em] text-gray-300 uppercase">
            {isMovie ? 'FILME ORIGINAL' : 'SÉRIE ORIGINAL'}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-3 drop-shadow-lg uppercase leading-tight line-clamp-2">
          {title}
        </h1>

        {/* Metadata info: Match %, Year, Age rating, 4K */}
        <div className="flex items-center gap-3 mb-4 text-sm font-semibold">
          <span className="text-[#46D369] font-bold">{matchPercent}% relevante</span>
          {year && <span className="text-gray-300">{year}</span>}
          <span className="px-1.5 py-0.5 rounded bg-white/20 text-xs font-bold text-gray-200">14+</span>
          <span className="px-1.5 py-0.5 rounded border border-white/40 text-[10px] font-bold text-gray-300">4K ULTRA HD</span>
        </div>

        {/* Synopsis */}
        {currentItem.overview && (
          <p className="text-gray-300 text-sm md:text-base leading-relaxed line-clamp-3 mb-6 max-w-xl drop-shadow-md">
            {currentItem.overview}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onPlayClick(currentItem)}
            className="flex items-center gap-2.5 px-7 py-3 rounded-md bg-white text-black font-bold text-base hover:bg-white/80 active:scale-95 transition-all shadow-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
          >
            <Play className="w-5 h-5 fill-black" />
            Assistir
          </button>

          <button
            onClick={() => onDetailClick(currentItem)}
            className="flex items-center gap-2.5 px-6 py-3 rounded-md bg-white/25 hover:bg-white/35 active:scale-95 text-white font-bold text-base backdrop-blur-md transition-all shadow-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
          >
            <Info className="w-5 h-5" />
            Mais Informações
          </button>
        </div>
      </div>

      {/* Slide Indicator Dots */}
      <div className="absolute right-8 md:right-16 bottom-16 z-10 flex items-center gap-2">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              idx === currentIndex ? 'w-8 bg-[#E50914]' : 'w-2 bg-white/40 hover:bg-white/70'
            }`}
            title={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
