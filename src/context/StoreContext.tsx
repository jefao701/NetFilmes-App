import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Addon, MediaItem, MediaPlaylistSummary, MediaProgressSummary, PlaylistItem, Profile, ProgressItem, StreamSource } from '../types';
import { defaultAddons } from '../services/sources';
import { auth, firebaseCloudService, MergedSnapshotResult } from '../services/firebase';

const DEFAULT_PROFILES: Profile[] = [
  {
    id: "p_principal",
    name: "Principal",
    avatar: "🎬",
    color: "#E50914",
    createdAt: Date.now()
  },
  {
    id: "p_kids",
    name: "Kids",
    avatar: "🍿",
    color: "#0071EB",
    createdAt: Date.now()
  },
  {
    id: "p_cinema",
    name: "Cinema",
    avatar: "🎭",
    color: "#2ECC71",
    createdAt: Date.now()
  }
];

const LOCAL_STORAGE_KEY = 'netfilmes_app_state_v1';

interface StoreState {
  profiles: Profile[];
  activeProfileId: string;
  progressByProfile: Record<string, ProgressItem[]>;
  playlistByProfile: Record<string, PlaylistItem[]>;
  addons: Addon[];
  manualSources: Record<string, StreamSource[]>;
}

interface StoreContextType {
  profiles: Profile[];
  activeProfile: Profile;
  activeProfileId: string;
  setActiveProfileId: (id: string) => void;
  addOrUpdateProfile: (profile: Profile) => void;
  deleteProfile: (id: string) => void;
  saveProgress: (key: string, position: number, duration: number, media: MediaProgressSummary) => void;
  getContinueWatching: () => ProgressItem[];
  playlist: PlaylistItem[];
  togglePlaylist: (item: MediaItem) => boolean;
  isInPlaylist: (type: string, id: number) => boolean;
  addons: Addon[];
  addAddon: (addon: Addon) => void;
  toggleAddon: (url: string, enabled: boolean) => void;
  removeAddon: (url: string) => void;
  manualSources: Record<string, StreamSource[]>;
  addManualSource: (key: string, source: StreamSource) => void;
  currentUser: User | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncMessage: string;
  syncNow: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

function loadInitialState(): StoreState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        profiles: parsed.profiles?.length ? parsed.profiles : DEFAULT_PROFILES,
        activeProfileId: parsed.activeProfileId || DEFAULT_PROFILES[0].id,
        progressByProfile: parsed.progressByProfile || {},
        playlistByProfile: parsed.playlistByProfile || {},
        addons: parsed.addons?.length ? parsed.addons : defaultAddons,
        manualSources: parsed.manualSources || {}
      };
    }
  } catch (e) {
    console.warn("Storage init warning:", e);
  }
  return {
    profiles: DEFAULT_PROFILES,
    activeProfileId: DEFAULT_PROFILES[0].id,
    progressByProfile: {},
    playlistByProfile: {},
    addons: defaultAddons,
    manualSources: {}
  };
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StoreState>(loadInitialState);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }, [state]);

  // Auth observer
  useEffect(() => {
    const unsub = firebaseCloudService.onAuthChanged(user => {
      setCurrentUser(user);
      if (user) {
        // Automatically sync on initial login
        setTimeout(() => {
          syncWithCloud();
        }, 500);
      }
    });
    return () => unsub();
  }, []);

  const activeProfile = state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0] || DEFAULT_PROFILES[0];

  const setActiveProfileId = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeProfileId: id }));
  }, []);

  const addOrUpdateProfile = useCallback((profile: Profile) => {
    setState(prev => {
      const existingIdx = prev.profiles.findIndex(p => p.id === profile.id);
      let updated: Profile[];
      if (existingIdx >= 0) {
        updated = [...prev.profiles];
        updated[existingIdx] = profile;
      } else {
        updated = [...prev.profiles, profile];
      }
      return { ...prev, profiles: updated };
    });
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setState(prev => {
      const updated = prev.profiles.filter(p => p.id !== id);
      const nextActive = prev.activeProfileId === id ? (updated[0]?.id || '') : prev.activeProfileId;
      return { ...prev, profiles: updated, activeProfileId: nextActive };
    });
  }, []);

  const saveProgress = useCallback((key: string, position: number, duration: number, media: MediaProgressSummary) => {
    if (duration <= 0) return;
    const fraction = position / duration;

    setState(prev => {
      const currentList = [...(prev.progressByProfile[prev.activeProfileId] || [])];
      // If watched > 95% (credits) or exited before 6 seconds, remove from Continue Watching
      if (fraction > 0.95 || position < 6) {
        const filtered = currentList.filter(item => item.key !== key);
        return {
          ...prev,
          progressByProfile: { ...prev.progressByProfile, [prev.activeProfileId]: filtered }
        };
      }

      const item: ProgressItem = {
        key,
        position,
        duration,
        updatedAt: Date.now(),
        media
      };

      const updated = [item, ...currentList.filter(i => i.key !== key)].slice(0, 40);
      return {
        ...prev,
        progressByProfile: { ...prev.progressByProfile, [prev.activeProfileId]: updated }
      };
    });
  }, []);

  const getContinueWatching = useCallback((): ProgressItem[] => {
    return state.progressByProfile[state.activeProfileId] || [];
  }, [state.progressByProfile, state.activeProfileId]);

  const playlist = state.playlistByProfile[state.activeProfileId] || [];

  const togglePlaylist = useCallback((item: MediaItem): boolean => {
    const isMovie = item.media_type === 'movie' || (Boolean(item.title) && item.media_type !== 'tv');
    const type = isMovie ? 'movie' : 'tv';
    const key = `${type}:${item.id}`;

    let added = false;
    setState(prev => {
      const currentList = [...(prev.playlistByProfile[prev.activeProfileId] || [])];
      const exists = currentList.some(p => p.key === key);

      let updated: PlaylistItem[];
      if (exists) {
        updated = currentList.filter(p => p.key !== key);
        added = false;
      } else {
        const summary: MediaPlaylistSummary = {
          type,
          id: item.id,
          title: item.title || item.name || 'Sem título',
          overview: item.overview || null,
          posterPath: item.poster_path || null,
          backdropPath: item.backdrop_path || null,
          rating: item.vote_average ?? 0,
          year: (item.release_date || item.first_air_date || '').substring(0, 4)
        };
        updated = [{ key, addedAt: Date.now(), media: summary }, ...currentList];
        added = true;
      }

      return {
        ...prev,
        playlistByProfile: { ...prev.playlistByProfile, [prev.activeProfileId]: updated }
      };
    });
    return added;
  }, []);

  const isInPlaylist = useCallback((type: string, id: number): boolean => {
    const key = `${type}:${id}`;
    const list = state.playlistByProfile[state.activeProfileId] || [];
    return list.some(p => p.key === key);
  }, [state.playlistByProfile, state.activeProfileId]);

  const addAddon = useCallback((addon: Addon) => {
    setState(prev => ({
      ...prev,
      addons: [...prev.addons.filter(a => a.url !== addon.url), addon]
    }));
  }, []);

  const toggleAddon = useCallback((url: string, enabled: boolean) => {
    setState(prev => ({
      ...prev,
      addons: prev.addons.map(a => a.url === url ? { ...a, enabled } : a)
    }));
  }, []);

  const removeAddon = useCallback((url: string) => {
    setState(prev => ({
      ...prev,
      addons: prev.addons.filter(a => a.url !== url)
    }));
  }, []);

  const addManualSource = useCallback((key: string, source: StreamSource) => {
    setState(prev => {
      const existing = prev.manualSources[key] || [];
      const updated = [...existing.filter(s => s.url !== source.url), source];
      return {
        ...prev,
        manualSources: { ...prev.manualSources, [key]: updated }
      };
    });
  }, []);

  const syncWithCloud = async () => {
    if (!auth.currentUser) return;
    setSyncStatus('syncing');
    setSyncMessage('Sincronizando com a nuvem...');
    try {
      const snapshot: MergedSnapshotResult = {
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        progressByProfile: state.progressByProfile,
        playlistByProfile: state.playlistByProfile,
        addons: state.addons,
        manualSources: state.manualSources
      };
      const merged = await firebaseCloudService.syncWithCloud(snapshot);
      setState({
        profiles: merged.profiles,
        activeProfileId: merged.activeProfileId,
        progressByProfile: mergedProgressFix(merged.progressByProfile),
        playlistByProfile: merged.playlistByProfile,
        addons: merged.addons,
        manualSources: merged.manualSources
      });
      setSyncStatus('success');
      setSyncMessage('Sincronização concluída com sucesso!');
    } catch (err: any) {
      setSyncStatus('error');
      setSyncMessage(err?.message || 'Falha ao sincronizar com a nuvem');
    }
  };

  const signIn = async (email: string, pass: string) => {
    setSyncStatus('syncing');
    setSyncMessage('Entrando...');
    try {
      await firebaseCloudService.signIn(email, pass);
      setSyncStatus('success');
      setSyncMessage('Login realizado com sucesso!');
    } catch (err: any) {
      setSyncStatus('error');
      setSyncMessage(err?.message || 'Falha no login');
      throw err;
    }
  };

  const register = async (email: string, pass: string) => {
    setSyncStatus('syncing');
    setSyncMessage('Criando conta...');
    try {
      await firebaseCloudService.register(email, pass);
      setSyncStatus('success');
      setSyncMessage('Conta criada com sucesso!');
    } catch (err: any) {
      setSyncStatus('error');
      setSyncMessage(err?.message || 'Falha no cadastro');
      throw err;
    }
  };

  const signOut = async () => {
    await firebaseCloudService.signOut();
    setSyncStatus('idle');
    setSyncMessage('');
  };

  return (
    <StoreContext.Provider
      value={{
        profiles: state.profiles,
        activeProfile,
        activeProfileId: state.activeProfileId,
        setActiveProfileId,
        addOrUpdateProfile,
        deleteProfile,
        saveProgress,
        getContinueWatching,
        playlist,
        togglePlaylist,
        isInPlaylist,
        addons: state.addons,
        addAddon,
        toggleAddon,
        removeAddon,
        manualSources: state.manualSources,
        addManualSource,
        currentUser,
        syncStatus,
        syncMessage,
        syncNow: syncWithCloud,
        signIn,
        register,
        signOut
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

function mergedProgressFix(map: Record<string, ProgressItem[]>): Record<string, ProgressItem[]> {
  const out: Record<string, ProgressItem[]> = {};
  for (const [k, list] of Object.entries(map || {})) {
    if (Array.isArray(list)) out[k] = list;
  }
  return out;
}

export function useNetfilmes(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useNetfilmes must be used within StoreProvider");
  return ctx;
}
