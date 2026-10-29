import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '../types';
import { getFullPosterUrl, getDisplayTitle } from '../services/tmdb';

interface Top10RowProps {
  title: string;
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
}

export const Top10Row: React.FC<Top10RowProps> = ({
  title,
  items,
  onItemClick
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.75;
      rowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative mb-8 group/top10">
      {/* Row Header */}
      <div className="px-8 md:px-16 mb-2.5">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">
          {title}
        </h2>
      </div>

      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-30 w-12 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/top10:opacity-100 transition-all flex items-center justify-center cursor-pointer focus:outline-none"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* Top 10 Carousel */}
        <div
          ref={rowRef}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth py-3 px-8 md:px-16"
        >
          {items.slice(0, 10).map((item, index) => {
            const rank = index + 1;
            const posterUrl = getFullPosterUrl(item.poster_path || item.backdrop_path);
            const displayTitle = getDisplayTitle(item);

            return (
              <div
                key={item.id}
                onClick={() => onItemClick(item)}
                className="group/card relative flex items-center shrink-0 cursor-pointer select-none focus:outline-none"
                style={{ width: '210px', height: '180px' }}
              >
                {/* Giant Stylized Rank Number */}
                <div
                  className="font-black select-none pointer-events-none transition-transform duration-300 group-hover/card:scale-105"
                  style={{
                    fontSize: '140px',
                    lineHeight: '1',
                    color: '#141414',
                    WebkitTextStroke: '4px #595959',
                    letterSpacing: '-18px',
                    width: rank >= 10 ? '110px' : '75px',
                    textAlign: 'right',
                    marginRight: '-10px',
                    zIndex: 10,
                    textShadow: '0 4px 12px rgba(0,0,0,0.9)'
                  }}
                >
                  {rank}
                </div>

                {/* Poster Card */}
                <div className="relative w-[125px] h-[175px] rounded-md overflow-hidden bg-[#1F1F1F] shadow-xl transition-all duration-300 group-hover/card:scale-110 group-hover/card:z-20 group-hover/card:ring-2 group-hover/card:ring-white">
                  <img
                    src={posterUrl}
                    alt={displayTitle}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-2">
                    <span className="text-[#E50914] font-black text-sm drop-shadow">N</span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/90 to-transparent">
                    <p className="text-white text-[11px] font-bold truncate">{displayTitle}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-30 w-12 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/top10:opacity-100 transition-all flex items-center justify-center cursor-pointer focus:outline-none"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};
