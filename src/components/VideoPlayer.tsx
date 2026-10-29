import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Settings,
  FastForward,
  SkipForward,
  Server,
  RefreshCw,
  X
} from 'lucide-react';
import { EpisodeItem, MediaItem, StreamSource } from '../types';
import { resolveStreams } from '../services/sources';
import { tmdbService } from '../services/tmdb';
import { useNetfilmes } from '../context/StoreContext';

interface VideoPlayerProps {
  media: MediaItem;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  onClose: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  media,
  season,
  episode,
  episodeTitle,
  onClose
}) => {
  const { saveProgress, getContinueWatching, addons, manualSources } = useNetfilmes();

  const isMovie = media.media_type === 'movie' || (Boolean(media.title) && media.media_type !== 'tv');
  const mediaType: 'movie' | 'tv' = isMovie ? 'movie' : 'tv';

  const [currentSeason, setCurrentSeason] = useState<number | undefined>(season);
  const [currentEpisode, setCurrentEpisode] = useState<number | undefined>(episode);
  const [currentEpTitle, setCurrentEpTitle] = useState<string | undefined>(episodeTitle);
  const [seasonEpisodes, setSeasonEpisodes] = useState<EpisodeItem[]>([]);

  const [sources, setSources] = useState<StreamSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<StreamSource | null>(null);
  const [isResolvingSources, setIsResolvingSources] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seekNotice, setSeekNotice] = useState<string | null>(null);
  const [hasSkippedIntro, setHasSkippedIntro] = useState(false);
  const [showSourcesModal, setShowSourcesModal] = useState(false);

  // Next episode countdown
  const [nextEpisode, setNextEpisode] = useState<EpisodeItem | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isNextDismissed, setIsNextDismissed] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const hasRestoredPositionRef = useRef(false);

  // Compute stream key for progress persistence
  const streamKey = isMovie
    ? `movie:${media.id}`
    : `tv:${media.id}:${currentSeason || 1}:${currentEpisode || 1}`;

  // Fetch season episodes for Next Episode handling
  useEffect(() => {
    if (isMovie || !currentSeason) return;
    let isMounted = true;
    tmdbService.getSeasonEpisodes(media.id, currentSeason).then(eps => {
      if (isMounted) setSeasonEpisodes(eps);
    });
    return () => {
      isMounted = false;
    };
  }, [media.id, currentSeason, isMovie]);

  // Compute next episode item
  useEffect(() => {
    if (isMovie || !currentEpisode || !seasonEpisodes.length) {
      setNextEpisode(null);
      return;
    }
    const next = seasonEpisodes.find(ep => ep.episode_number === currentEpisode + 1);
    setNextEpisode(next || null);
  }, [isMovie, currentEpisode, seasonEpisodes]);

  // Resolve stream sources
  useEffect(() => {
    let isMounted = true;
    setIsResolvingSources(true);
    setErrorMsg(null);
    hasRestoredPositionRef.current = false;

    async function fetchSources() {
      try {
        const imdbId = await tmdbService.getImdbId(mediaType, media.id);
        const resolved = await resolveStreams(
          mediaType,
          media.id,
          currentSeason ?? null,
          currentEpisode ?? null,
          imdbId,
          addons,
          manualSources
        );

        if (!isMounted) return;
        if (resolved.length > 0) {
          setSources(resolved);
          setSelectedSource(resolved[0]);
        } else {
          setErrorMsg("Nenhum servidor de vídeo disponível no momento.");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMsg(`Erro ao consultar servidores: ${err?.message || 'Falha na rede'}`);
      } finally {
        if (isMounted) setIsResolvingSources(false);
      }
    }

    fetchSources();
    return () => {
      isMounted = false;
    };
  }, [media.id, mediaType, currentSeason, currentEpisode, addons, manualSources]);

  // Setup HLS / Video playback whenever selectedSource changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedSource) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = selectedSource.url;
    const isHls = streamUrl.includes('.m3u8') || selectedSource.kind === 'hls';

    // Find saved position in active profile to resume
    const cwList = getContinueWatching();
    const saved = cwList.find(i => i.key === streamKey || i.media?.id === media.id);
    const targetResumeSec = saved && saved.position > 4 ? saved.position : 0;

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (targetResumeSec > 0 && !hasRestoredPositionRef.current) {
          video.currentTime = targetResumeSec;
          hasRestoredPositionRef.current = true;
          const m = Math.floor(targetResumeSec / 60);
          const s = Math.floor(targetResumeSec % 60);
          setSeekNotice(`Continuando de ${m}:${s.toString().padStart(2, '0')}`);
        }
        video.play().catch(() => setIsPlaying(false));
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setErrorMsg("Erro de reprodução de stream. Tente outro servidor no menu de opções.");
              break;
          }
        }
      });
    } else {
      // Native MP4 or Safari native HLS
      video.src = streamUrl;
      video.onloadedmetadata = () => {
        if (targetResumeSec > 0 && !hasRestoredPositionRef.current) {
          video.currentTime = targetResumeSec;
          hasRestoredPositionRef.current = true;
          const m = Math.floor(targetResumeSec / 60);
          const s = Math.floor(targetResumeSec % 60);
          setSeekNotice(`Continuando de ${m}:${s.toString().padStart(2, '0')}`);
        }
        video.play().catch(() => setIsPlaying(false));
      };
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedSource, streamKey]);

  // Handle time update, periodic persistence, and next episode countdown
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const curr = video.currentTime;
    const dur = video.duration || 0;
    setCurrentTime(curr);
    setDuration(dur);

    // Persist progress to store
    if (dur > 10 && curr > 5 && hasRestoredPositionRef.current) {
      saveProgress(streamKey, curr, dur, {
        type: mediaType,
        id: media.id,
        title: isMovie
          ? (media.title || 'Filme')
          : `${media.name || 'Série'} - T${currentSeason || 1}:E${currentEpisode || 1} ${currentEpTitle || ''}`,
        poster: media.poster_path,
        backdrop: media.backdrop_path,
        year: (media.release_date || media.first_air_date || '').substring(0, 4),
        season: currentSeason,
        episode: currentEpisode,
        episodeTitle: currentEpTitle
      });
    }

    // Trigger next episode countdown when remaining <= 35s or video ended
    const remaining = dur - curr;
    if (nextEpisode && !isNextDismissed && dur > 60 && remaining > 0 && remaining <= 35) {
      if (countdown === null) {
        setCountdown(5);
      }
    }
  };

  // 5-second automatic countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0 && nextEpisode) {
      handlePlayNext(nextEpisode);
    }
  }, [countdown, nextEpisode]);

  const handlePlayNext = (targetEp: EpisodeItem) => {
    setCountdown(null);
    setIsNextDismissed(true);
    setHasSkippedIntro(false);
    setCurrentSeason(targetEp.season_number);
    setCurrentEpisode(targetEp.episode_number);
    setCurrentEpTitle(targetEp.name || undefined);
    setSeekNotice(`Episódio ${targetEp.episode_number} ⏭`);
  };

  const handleSkipIntro = () => {
    const video = videoRef.current;
    if (!video) return;
    setHasSkippedIntro(true);
    const target = Math.min(85, Math.max(0, duration - 15));
    video.currentTime = target;
    setSeekNotice("Abertura Pulada ⏩");
  };

  const handleSeek = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + deltaSeconds));
    setSeekNotice(deltaSeconds > 0 ? `+${deltaSeconds}s ⏩` : `${deltaSeconds}s ⏪`);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(-10);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeek(10);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (!document.fullscreenElement) {
          onClose();
        }
      }
      resetControlsTimeout();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration]);

  // Controls auto-hide
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying && !showSourcesModal) {
        setShowControls(false);
      }
    }, 4500);
  }, [isPlaying, showSourcesModal]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimeout]);

  // Clear seek notice after 1.5s
  useEffect(() => {
    if (!seekNotice) return;
    const t = setTimeout(() => setSeekNotice(null), 1500);
    return () => clearTimeout(t);
  }, [seekNotice]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const showSkipIntro = !hasSkippedIntro && currentTime >= 5 && currentTime <= 85 && duration > 120;
  const displayTitle = isMovie
    ? (media.title || 'Filme')
    : `${media.name || 'Série'} - T${currentSeason || 1}:E${currentEpisode || 1} ${currentEpTitle || ''}`;

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden cursor-default"
    >
      {/* Video Surface */}
      <video
        ref={videoRef}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          if (nextEpisode && !isNextDismissed) {
            handlePlayNext(nextEpisode);
          }
        }}
        className="w-full h-full object-contain"
        playsInline
      />

      {/* Quick Seek / Notice Overlay */}
      {seekNotice && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-pulse">
          <div className="bg-black/80 border border-white/20 text-white font-black text-2xl px-8 py-4 rounded-xl shadow-2xl backdrop-blur-md">
            {seekNotice}
          </div>
        </div>
      )}

      {/* Resolving / Buffering State */}
      {isResolvingSources && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-20">
          <div className="w-14 h-14 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white text-base font-bold">Conectando aos servidores de streaming...</p>
        </div>
      )}

      {/* Error Overlay */}
      {errorMsg && !isResolvingSources && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-40 p-8 text-center">
          <h3 className="text-[#E50914] text-2xl font-black mb-3">Erro no Carregamento</h3>
          <p className="text-gray-300 max-w-md mb-6 text-sm">{errorMsg}</p>
          <div className="flex gap-4">
            <button
              onClick={() => setShowSourcesModal(true)}
              className="px-5 py-2.5 rounded-md bg-[#E50914] text-white font-bold hover:bg-[#B81D24] cursor-pointer"
            >
              Trocar Servidor
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-md bg-white/20 text-white font-bold hover:bg-white/30 cursor-pointer"
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* Netflix Skip Intro Button (Pular Abertura) */}
      {showSkipIntro && (
        <button
          onClick={handleSkipIntro}
          className="absolute right-8 md:right-16 bottom-28 z-40 flex items-center gap-2 px-5 py-2.5 rounded-md bg-black/75 hover:bg-black text-white font-bold text-sm border-2 border-white/70 hover:border-white shadow-2xl cursor-pointer transition-transform hover:scale-105"
        >
          <FastForward className="w-4 h-4 fill-white" />
          Pular Abertura
        </button>
      )}

      {/* Next Episode Countdown Overlay Card */}
      {countdown !== null && nextEpisode && (
        <div className="absolute right-6 md:right-12 bottom-28 z-40 bg-[#1F1F1F]/95 border border-white/20 p-4 rounded-xl shadow-2xl backdrop-blur-md max-w-xs flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Próximo Episódio em {countdown}s</span>
            <button
              onClick={() => {
                setCountdown(null);
                setIsNextDismissed(true);
              }}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm font-bold text-white line-clamp-1">
            {nextEpisode.episode_number}. {nextEpisode.name || 'Episódio'}
          </p>
          <button
            onClick={() => handlePlayNext(nextEpisode)}
            className="flex items-center justify-center gap-2 w-full py-2 bg-white text-black font-bold text-sm rounded-md hover:bg-white/90 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-black" />
            Assistir Agora
          </button>
        </div>
      )}

      {/* Sources & Server Selection Modal */}
      {showSourcesModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-md bg-[#181818] border border-white/20 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-[#E50914]" />
                Servidores e Fontes
              </h4>
              <button onClick={() => setShowSourcesModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {sources.map((s, idx) => {
                const isSelected = selectedSource?.url === s.url;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedSource(s);
                      setShowSourcesModal(false);
                      setErrorMsg(null);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left text-sm font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#E50914] text-white shadow-lg'
                        : 'bg-[#242424] text-gray-200 hover:bg-[#333]'
                    }`}
                  >
                    <div>
                      <p className="font-bold">{s.provider || 'Servidor'} • {s.label}</p>
                      <p className="text-xs opacity-75">{s.quality || 'HD'} {s.kind?.toUpperCase()}</p>
                    </div>
                    {isSelected && <span className="text-xs font-bold uppercase tracking-wider">Ativo</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Custom Player Controls Overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-6 md:p-8 bg-gradient-to-t from-black/90 via-transparent to-black/80 transition-opacity duration-300 pointer-events-auto ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-black/60 hover:bg-[#E50914] text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20"
              title="Voltar (Esc)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base md:text-xl font-bold text-white drop-shadow truncate max-w-lg">
                {displayTitle}
              </h2>
              <span className="text-xs font-semibold text-emerald-400 drop-shadow">
                {selectedSource?.provider || 'Servidor'} • {selectedSource?.label || 'HD'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Server / Stream selector */}
            <button
              onClick={() => setShowSourcesModal(true)}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20"
              title="Opções de Servidor"
            >
              <Settings className="w-5 h-5" />
            </button>
            {/* Fullscreen button */}
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20"
              title="Tela Cheia (F)"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Center Controls: Rewind 10s, Play/Pause, Forward 10s */}
        <div className="flex items-center justify-center gap-8 md:gap-14">
          <button
            onClick={() => handleSeek(-10)}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-black/60 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-white/10"
            title="Retroceder 10s (←)"
          >
            <RotateCcw className="w-7 h-7" />
          </button>

          <button
            onClick={togglePlay}
            className="w-18 h-18 md:w-20 md:h-20 rounded-full bg-[#E50914] hover:bg-[#B81D24] text-white flex items-center justify-center shadow-2xl transition-all cursor-pointer active:scale-95 ring-4 ring-white/20"
            title={isPlaying ? "Pausar (Espaço)" : "Reproduzir (Espaço)"}
          >
            {isPlaying ? <Pause className="w-10 h-10 fill-white" /> : <Play className="w-10 h-10 fill-white ml-1" />}
          </button>

          <button
            onClick={() => handleSeek(10)}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-black/60 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-white/10"
            title="Avançar 10s (→)"
          >
            <RotateCw className="w-7 h-7" />
          </button>
        </div>

        {/* Bottom Bar: Timeline Slider & Times */}
        <div className="space-y-2">
          {/* Progress Slider */}
          <div className="relative group/scrub py-2 cursor-pointer flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={e => {
                const target = Number(e.target.value);
                setCurrentTime(target);
                if (videoRef.current) videoRef.current.currentTime = target;
              }}
              className="w-full h-1.5 group-hover/scrub:h-2.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-[#E50914] transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-xs md:text-sm font-semibold text-gray-300">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
