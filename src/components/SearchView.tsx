import React, { useState, useEffect } from 'react';
import { Search, X, Film, Tv, Sparkles } from 'lucide-react';
import { MediaItem } from '../types';
import { tmdbService } from '../services/tmdb';
import { MediaCard } from './MediaCard';

interface SearchViewProps {
  onItemClick: (item: MediaItem) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ onItemClick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [recommended, setRecommended] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load popular recommendations on mount
  useEffect(() => {
    tmdbService.getPopularMovies().then(movies => {
      setRecommended(movies.slice(0, 18));
    });
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await tmdbService.searchMulti(trimmed);
        setResults(res);
      } catch (e) {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const displayItems = query.trim() ? results : recommended;
  const sectionTitle = query.trim()
    ? `Resultados para "${query}" (${results.length})`
    : 'Recomendados na Netfilmes';

  return (
    <div className="min-h-screen px-8 md:px-16 pt-10 pb-24 text-white">
      {/* Search Input Bar */}
      <div className="relative max-w-2xl mb-8">
        <Search className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar filmes, séries, atores, gêneros..."
          autoFocus
          className="w-full bg-[#202020] border-2 border-white/20 focus:border-[#E50914] rounded-xl py-3.5 pl-14 pr-12 text-base md:text-lg text-white placeholder-gray-400 outline-none shadow-2xl transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          {!query.trim() && <Sparkles className="w-5 h-5 text-amber-400" />}
          {sectionTitle}
        </h2>
        {isSearching && (
          <span className="text-xs text-gray-400 animate-pulse font-semibold">Pesquisando...</span>
        )}
      </div>

      {/* Grid of Results */}
      {displayItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {displayItems.map(item => (
            <MediaCard
              key={`${item.id}-${item.media_type || 'm'}`}
              item={item}
              onClick={onItemClick}
              usePosterAspect={true}
            />
          ))}
        </div>
      ) : query.trim() && !isSearching ? (
        <div className="py-20 text-center text-gray-400">
          <p className="text-lg font-bold text-white mb-2">Nenhum título encontrado para "{query}"</p>
          <p className="text-sm">Tente outras palavras-chave ou confira a ortografia.</p>
        </div>
      ) : null}
    </div>
  );
};
