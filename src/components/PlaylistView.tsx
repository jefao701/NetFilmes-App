import React from 'react';
import { Bookmark, Trash2, Film, Tv, Play } from 'lucide-react';
import { MediaItem } from '../types';
import { useNetfilmes } from '../context/StoreContext';
import { getFullPosterUrl } from '../services/tmdb';

interface PlaylistViewProps {
  onItemClick: (item: MediaItem) => void;
  onExplore: () => void;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({ onItemClick, onExplore }) => {
  const { playlist, togglePlaylist, activeProfile } = useNetfilmes();

  return (
    <div className="min-h-screen px-8 md:px-16 pt-10 pb-24 text-white">
      {/* Title */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <Bookmark className="w-7 h-7 text-[#E50914]" />
            Minha Lista
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Perfil: <strong className="text-white">{activeProfile.name}</strong> • {playlist.length} {playlist.length === 1 ? 'título salvo' : 'títulos salvos'}
          </p>
        </div>
      </div>

      {playlist.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Bookmark className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Sua lista está vazia</h3>
          <p className="text-sm text-gray-400 max-w-sm mb-6">
            Adicione filmes e séries favoritos clicando no botão "Minha Lista" nos detalhes de qualquer título.
          </p>
          <button
            onClick={onExplore}
            className="px-6 py-3 rounded-lg bg-[#E50914] hover:bg-[#B81D24] text-white font-bold text-sm shadow-xl transition-all cursor-pointer"
          >
            Explorar Catálogo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {playlist.map(item => {
            const m = item.media;
            if (!m) return null;

            const mediaItem: MediaItem = {
              id: m.id,
              title: m.title,
              overview: m.overview || null,
              poster_path: m.posterPath || null,
              backdrop_path: m.backdropPath || null,
              vote_average: m.rating || 0,
              release_date: m.date || m.year || null,
              media_type: m.type
            };

            const poster = getFullPosterUrl(m.posterPath || m.backdropPath);

            return (
              <div
                key={item.key}
                className="group relative rounded-md overflow-hidden bg-[#1F1F1F] cursor-pointer shadow-lg transition-all duration-300 transform hover:scale-108 hover:z-30 hover:ring-2 hover:ring-white flex flex-col"
              >
                <div onClick={() => onItemClick(mediaItem)} className="relative w-full aspect-[2/3] overflow-hidden">
                  <img src={poster} alt={m.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2">
                    <span className="text-[#E50914] font-black text-sm drop-shadow">N</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/70 text-white">
                      {m.type === 'movie' ? 'FILME' : 'SÉRIE'}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-[#181818] flex items-center justify-between">
                  <p className="text-xs font-bold text-white truncate max-w-[120px]">{m.title}</p>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      togglePlaylist(mediaItem);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 cursor-pointer"
                    title="Remover da lista"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
