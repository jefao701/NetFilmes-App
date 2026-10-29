import React, { useState, useEffect } from 'react';
import { StoreProvider, useNetfilmes } from './context/StoreContext';
import { NavigationTab, MediaItem } from './types';
import { tmdbService } from './services/tmdb';
import { NavigationRail } from './components/NavigationRail';
import { HeroBanner } from './components/HeroBanner';
import { MediaRow } from './components/MediaRow';
import { Top10Row } from './components/Top10Row';
import { DetailModal } from './components/DetailModal';
import { VideoPlayer } from './components/VideoPlayer';
import { AccountModal } from './components/AccountModal';
import { ProfilesView } from './components/ProfilesView';
import { SearchView } from './components/SearchView';
import { PlaylistView } from './components/PlaylistView';
import { CatalogView } from './components/CatalogView';

const MainLayout: React.FC = () => {
  const { activeProfile, getContinueWatching } = useNetfilmes();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [selectedDetailItem, setSelectedDetailItem] = useState<MediaItem | null>(null);
  const [playingMedia, setPlayingMedia] = useState<{
    item: MediaItem;
    season?: number;
    episode?: number;
    episodeTitle?: string;
  } | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Home Screen categories state
  const [bannerItems, setBannerItems] = useState<MediaItem[]>([]);
  const [top10Movies, setTop10Movies] = useState<MediaItem[]>([]);
  const [top10Series, setTop10Series] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [popularSeries, setPopularSeries] = useState<MediaItem[]>([]);
  const [comedyMovies, setComedyMovies] = useState<MediaItem[]>([]);
  const [actionMovies, setActionMovies] = useState<MediaItem[]>([]);
  const [sciFiMovies, setSciFiMovies] = useState<MediaItem[]>([]);
  const [horrorMovies, setHorrorMovies] = useState<MediaItem[]>([]);
  const [dramaSeries, setDramaSeries] = useState<MediaItem[]>([]);
  const [isLoadingHome, setIsLoadingHome] = useState(true);

  // Fetch Home screen data (exact rows from Android HomeScreen.kt)
  useEffect(() => {
    let isMounted = true;
    async function loadHomeData() {
      try {
        const [
          banner,
          topMovies,
          topSeries,
          popMovies,
          popSeries,
          comedies,
          actions,
          scifi,
          horrors,
          dramas
        ] = await Promise.all([
          tmdbService.getBannerTrending(),
          tmdbService.getTop10Movies(),
          tmdbService.getTop10Series(),
          tmdbService.getPopularMovies(),
          tmdbService.getPopularSeries(),
          tmdbService.getMoviesByGenre(35), // Comedy
          tmdbService.getMoviesByGenre(28), // Action
          tmdbService.getMoviesByGenre(878), // Sci-Fi
          tmdbService.getMoviesByGenre(27), // Horror
          tmdbService.getSeriesByGenre(18) // Drama
        ]);

        if (!isMounted) return;
        setBannerItems(banner);
        setTop10Movies(topMovies);
        setTop10Series(topSeries);
        setPopularMovies(popMovies);
        setPopularSeries(popSeries);
        setComedyMovies(comedies);
        setActionMovies(actions);
        setSciFiMovies(scifi);
        setHorrorMovies(horrors);
        setDramaSeries(dramas);
      } catch (err) {
        console.warn("Home data error:", err);
      } finally {
        if (isMounted) setIsLoadingHome(false);
      }
    }

    loadHomeData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Continue watching list from active profile
  const continueWatching = getContinueWatching();
  const continueWatchingItems: MediaItem[] = continueWatching.map(p => ({
    id: p.media?.id || 0,
    title: p.media?.title || 'Continuar assistindo',
    poster_path: p.media?.poster || null,
    backdrop_path: p.media?.backdrop || null,
    media_type: p.media?.type || 'movie',
    release_date: p.media?.year || null
  }));

  const progressFractionMap: Record<string, number> = {};
  continueWatching.forEach(p => {
    if (p.duration > 0) {
      progressFractionMap[p.key] = Math.min(1, Math.max(0, p.position / p.duration));
    }
  });

  const handlePlayFromContinueWatching = (item: MediaItem) => {
    const matched = continueWatching.find(p => p.media?.id === item.id);
    if (matched?.media) {
      setPlayingMedia({
        item,
        season: matched.media.season ?? undefined,
        episode: matched.media.episode ?? undefined,
        episodeTitle: matched.media.episodeTitle ?? undefined
      });
    } else {
      setPlayingMedia({ item });
    }
  };

  const handlePlayMedia = (item: MediaItem, season?: number, episode?: number, epTitle?: string) => {
    setSelectedDetailItem(null);
    setPlayingMedia({
      item,
      season,
      episode,
      episodeTitle: epTitle
    });
  };

  // If in Profiles tab, show standalone Profiles View
  if (currentTab === 'profiles') {
    return (
      <ProfilesView
        onProfileSelected={() => {
          setCurrentTab('home');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white flex select-none">
      {/* Left Navigation Rail */}
      <NavigationRail
        currentTab={currentTab}
        onSelectTab={tab => setCurrentTab(tab)}
        onOpenAccount={() => setShowAccountModal(true)}
      />

      {/* Main Content Area */}
      <main className="ml-20 flex-1 min-w-0 relative">
        {/* Home Tab */}
        {currentTab === 'home' && (
          <div className="pb-24">
            {/* Hero Rotating Banner */}
            <HeroBanner
              items={bannerItems}
              onPlayClick={item => handlePlayMedia(item)}
              onDetailClick={item => setSelectedDetailItem(item)}
            />

            <div className="-mt-14 relative z-20 space-y-2">
              {/* Comédias sem risadas de fundo (Exact category from Netflix screenshot & HomeScreen.kt) */}
              <MediaRow
                title="Comédias sem risadas de fundo"
                items={comedyMovies}
                onItemClick={item => setSelectedDetailItem(item)}
              />

              {/* Populares na Netfilmes */}
              <MediaRow
                title="Populares na Netfilmes"
                items={popularMovies}
                onItemClick={item => setSelectedDetailItem(item)}
              />

              {/* Continuar Assistindo (with resume minute and visual red progress bar) */}
              {continueWatchingItems.length > 0 && (
                <MediaRow
                  title="Continuar assistindo"
                  items={continueWatchingItems}
                  onItemClick={handlePlayFromContinueWatching}
                  progressMap={progressFractionMap}
                />
              )}

              {/* Top 10 Filmes de Hoje */}
              <Top10Row
                title="Top 10 Filmes de Hoje"
                items={top10Movies}
                onItemClick={item => setSelectedDetailItem(item)}
              />

              {/* Top 10 Séries de Hoje */}
              <Top10Row
                title="Top 10 Séries de Hoje"
                items={top10Series}
                onItemClick={item => setSelectedDetailItem(item)}
              />

              {/* Séries em Alta */}
              <MediaRow
                title="Séries em Alta"
                items={popularSeries}
                onItemClick={item => setSelectedDetailItem(item)}
              />

              {/* Ação e Aventura Explosiva */}
              <MediaRow
                title="Ação e Aventura Explosiva"
                items={actionMovies}
                onItemClick={item => setSelectedDetailItem(item)}
              />

              {/* Ficção Científica e Fantasia */}
              <MediaRow
                title="Ficção Científica e Fantasia"
                items={sciFiMovies}
                onItemClick={item => setSelectedDetailItem(item)}
              />

              {/* Lançamentos Imperdíveis */}
              <MediaRow
                title="Lançamentos Imperdíveis"
                items={[...popularMovies].reverse()}
                onItemClick={item => setSelectedDetailItem(item)}
              />

              {/* Terror e Suspense */}
              <MediaRow
                title="Terror e Suspense"
                items={horrorMovies}
                onItemClick={item => setSelectedDetailItem(item)}
              />

              {/* Séries de Drama Viciantes */}
              <MediaRow
                title="Séries de Drama Viciantes"
                items={dramaSeries}
                onItemClick={item => setSelectedDetailItem(item)}
              />
            </div>
          </div>
        )}

        {/* Movies Tab */}
        {currentTab === 'movies' && (
          <CatalogView
            isMoviesOnly={true}
            onPlayClick={item => handlePlayMedia(item)}
            onDetailClick={item => setSelectedDetailItem(item)}
          />
        )}

        {/* Series Tab */}
        {currentTab === 'series' && (
          <CatalogView
            isMoviesOnly={false}
            onPlayClick={item => handlePlayMedia(item)}
            onDetailClick={item => setSelectedDetailItem(item)}
          />
        )}

        {/* Playlist / Minha Lista Tab */}
        {currentTab === 'playlist' && (
          <PlaylistView
            onItemClick={item => setSelectedDetailItem(item)}
            onExplore={() => setCurrentTab('home')}
          />
        )}

        {/* Search Tab */}
        {currentTab === 'search' && (
          <SearchView
            onItemClick={item => setSelectedDetailItem(item)}
          />
        )}
      </main>

      {/* Detail Modal */}
      {selectedDetailItem && (
        <DetailModal
          item={selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
          onPlay={(item, season, episode, epTitle) => handlePlayMedia(item, season, episode, epTitle)}
          onSelectSimilar={simItem => setSelectedDetailItem(simItem)}
        />
      )}

      {/* Fullscreen Video Player */}
      {playingMedia && (
        <VideoPlayer
          media={playingMedia.item}
          season={playingMedia.season}
          episode={playingMedia.episode}
          episodeTitle={playingMedia.episodeTitle}
          onClose={() => setPlayingMedia(null)}
        />
      )}

      {/* Account & Settings Modal */}
      {showAccountModal && (
        <AccountModal
          onClose={() => setShowAccountModal(false)}
          onSwitchProfile={() => setCurrentTab('profiles')}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <StoreProvider>
      <MainLayout />
    </StoreProvider>
  );
}

export default App;
