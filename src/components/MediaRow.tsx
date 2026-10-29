import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
  progressMap?: Record<string, number>;
  usePosterAspect?: boolean;
}

export const MediaRow: React.FC<MediaRowProps> = ({
  title,
  items,
  onItemClick,
  progressMap,
  usePosterAspect = false
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
    <div className="relative mb-8 group/row">
      {/* Row Header */}
      <div className="px-8 md:px-16 mb-2.5 flex items-baseline justify-between">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">
          {title}
        </h2>
      </div>

      {/* Horizontal Carousel Container */}
      <div className="relative">
        {/* Left Scroll Arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-30 w-12 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-all flex items-center justify-center cursor-pointer focus:outline-none"
          title="Rolar para esquerda"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* Media Items Scrollable Row */}
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth py-3 px-8 md:px-16"
        >
          {items.map(item => {
            const isMovie = item.media_type === 'movie' || (Boolean(item.title) && item.media_type !== 'tv');
            const type = isMovie ? 'movie' : 'tv';
            const progress = progressMap ? (progressMap[`${type}:${item.id}`] ?? progressMap[`movie:${item.id}`] ?? progressMap[`tv:${item.id}:1:1`]) : undefined;

            return (
              <MediaCard
                key={`${item.id}-${item.media_type || 'm'}`}
                item={item}
                onClick={onItemClick}
                progressFraction={progress}
                usePosterAspect={usePosterAspect}
              />
            );
          })}
        </div>

        {/* Right Scroll Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-30 w-12 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-all flex items-center justify-center cursor-pointer focus:outline-none"
          title="Rolar para direita"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};
