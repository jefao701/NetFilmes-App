import React, { useState, useEffect } from 'react';
import { MediaItem } from '../types';
import { tmdbService } from '../services/tmdb';
import { HeroBanner } from './HeroBanner';
import { MediaRow } from './MediaRow';
import { Top10Row } from './Top10Row';

interface CatalogViewProps {
  isMoviesOnly: boolean;
  onPlayClick: (item: MediaItem) => void;
  onDetailClick: (item: MediaItem) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  isMoviesOnly,
  onPlayClick,
  onDetailClick
}) => {
  const [bannerItems, setBannerItems] = useState<MediaItem[]>([]);
  const [top10Items, setTop10Items] = useState<MediaItem[]>([]);
  const [popularItems, setPopularItems] = useState<MediaItem[]>([]);
  const [topRatedItems, setTopRatedItems] = useState<MediaItem[]>([]);
  const [genre1Items, setGenre1Items] = useState<MediaItem[]>([]);
  const [genre2Items, setGenre2Items] = useState<MediaItem[]>([]);
  const [genre3Items, setGenre3Items] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadCatalog() {
      try {
        if (isMoviesOnly) {
          const [pop, top10, topRated, action, comedy, scifi] = await Promise.all([
            tmdbService.getPopularMovies(),
            tmdbService.getTop10Movies(),
            tmdbService.getTopRatedMovies(),
            tmdbService.getMoviesByGenre(28),
            tmdbService.getMoviesByGenre(35),
            tmdbService.getMoviesByGenre(878)
          ]);
          if (!isMounted) return;
          setPopularItems(pop);
          setBannerItems(pop.slice(0, 6));
          setTop10Items(top10);
          setTopRatedItems(topRated);
          setGenre1Items(action);
          setGenre2Items(comedy);
          setGenre3Items(scifi);
        } else {
          const [pop, top10, topRated, drama, comedy, scifi] = await Promise.all([
            tmdbService.getPopularSeries(),
            tmdbService.getTop10Series(),
            tmdbService.getTopRatedSeries(),
            tmdbService.getSeriesByGenre(18),
            tmdbService.getSeriesByGenre(35),
            tmdbService.getSeriesByGenre(10765)
          ]);
          if (!isMounted) return;
          setPopularItems(pop);
          setBannerItems(pop.slice(0, 6));
          setTop10Items(top10);
          setTopRatedItems(topRated);
          setGenre1Items(drama);
          setGenre2Items(comedy);
          setGenre3Items(scifi);
        }
      } catch (err) {
        console.warn("Catalog fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [isMoviesOnly]);

  return (
    <div className="pb-24">
      {/* Hero Banner */}
      <HeroBanner
        items={bannerItems}
        onPlayClick={onPlayClick}
        onDetailClick={onDetailClick}
      />

      <div className="-mt-14 relative z-20 space-y-2">
        {/* Top 10 */}
        <Top10Row
          title={isMoviesOnly ? "Top 10 Filmes de Hoje" : "Top 10 Séries de Hoje"}
          items={top10Items}
          onItemClick={onDetailClick}
        />

        {/* Populares */}
        <MediaRow
          title={isMoviesOnly ? "Filmes Populares" : "Séries Populares"}
          items={popularItems}
          onItemClick={onDetailClick}
        />

        {/* Bem Avaliados */}
        <MediaRow
          title="Aclamados pela Crítica"
          items={topRatedItems}
          onItemClick={onDetailClick}
        />

        {/* Gênero 1 */}
        <MediaRow
          title={isMoviesOnly ? "Ação e Aventura Explosiva" : "Dramas Envolventes"}
          items={genre1Items}
          onItemClick={onDetailClick}
        />

        {/* Gênero 2 */}
        <MediaRow
          title="Comédias para Rir Alto"
          items={genre2Items}
          onItemClick={onDetailClick}
        />

        {/* Gênero 3 */}
        <MediaRow
          title={isMoviesOnly ? "Ficção Científica e Fantasia" : "Ficção Científica & Sobrenatural"}
          items={genre3Items}
          onItemClick={onDetailClick}
        />
      </div>
    </div>
  );
};
