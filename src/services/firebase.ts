import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Addon, PlaylistItem, Profile, ProgressItem, StreamSource } from '../types';

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDtcSTfWJYoiXJjANghnzOFThZl-vauh7o",
  authDomain: "login-3ebd2.firebaseapp.com",
  projectId: "login-3ebd2",
  storageBucket: "login-3ebd2.appspot.com",
  appId: "1:225339095501:web:345f38dfaad8ef9972ac84"
};

const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
export const auth = getAuth(app);
export const firestore = getFirestore(app);

export type CloudSyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface MergedSnapshotResult {
  profiles: Profile[];
  activeProfileId: string;
  progressByProfile: Record<string, ProgressItem[]>;
  playlistByProfile: Record<string, PlaylistItem[]>;
  addons: Addon[];
  manualSources: Record<string, StreamSource[]>;
}

export const firebaseCloudService = {
  async signIn(email: string, pass: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return cred.user;
  },

  async register(email: string, pass: string): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    return cred.user;
  },

  async signOut(): Promise<void> {
    await fbSignOut(auth);
  },

  onAuthChanged(cb: (user: User | null) => void) {
    return onAuthStateChanged(auth, cb);
  },

  async syncWithCloud(localData: MergedSnapshotResult): Promise<MergedSnapshotResult> {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não está conectado");

    const userDocRef = doc(firestore, "users", user.uid);
    const snap = await getDoc(userDocRef);
    const remote = (snap.data()?.data as any) || {};

    // 1. Merge Profiles
    const remoteProfiles: Profile[] = Array.isArray(remote.profiles) ? remote.profiles : [];
    const mergedProfiles: Profile[] = [...localData.profiles];
    const seenIds = new Set(mergedProfiles.map(p => p.id));

    remoteProfiles.forEach(rp => {
      if (!seenIds.has(rp.id)) {
        seenIds.add(rp.id);
        mergedProfiles.push(rp);
      }
    });

    // 2. Merge Progress by Profile
    const remoteProgress: Record<string, ProgressItem[]> = remote.progressByProfile || {};
    const allProfileIds = new Set([...Object.keys(localData.progressByProfile), ...Object.keys(remoteProgress)]);
    const mergedProgress: Record<string, ProgressItem[]> = {};

    allProfileIds.forEach(pid => {
      const combined = [...(localData.progressByProfile[pid] || []), ...(remoteProgress[pid] || [])];
      const map = new Map<string, ProgressItem>();
      combined.forEach(item => {
        const existing = map.get(item.key);
        if (!existing || (item.updatedAt || 0) >= (existing.updatedAt || 0)) {
          map.set(item.key, item);
        }
      });
      mergedProgress[pid] = Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 40);
    });

    // 3. Merge Playlist by Profile
    const remotePlaylist: Record<string, PlaylistItem[]> = remote.playlistByProfile || {};
    const allPlaylistProfileIds = new Set([...Object.keys(localData.playlistByProfile), ...Object.keys(remotePlaylist)]);
    const mergedPlaylist: Record<string, PlaylistItem[]> = {};

    allPlaylistProfileIds.forEach(pid => {
      const combined = [...(localData.playlistByProfile[pid] || []), ...(remotePlaylist[pid] || [])];
      const map = new Map<string, PlaylistItem>();
      combined.forEach(item => {
        const existing = map.get(item.key);
        if (!existing || (item.addedAt || 0) >= (existing.addedAt || 0)) {
          map.set(item.key, item);
        }
      });
      mergedPlaylist[pid] = Array.from(map.values()).sort((a, b) => b.addedAt - a.addedAt);
    });

    // 4. Merge Addons
    const remoteAddons: Addon[] = Array.isArray(remote.addons) ? remote.addons : [];
    const addonMap = new Map<string, Addon>();
    localData.addons.forEach(a => addonMap.set(a.url, a));
    remoteAddons.forEach(a => {
      if (!addonMap.has(a.url)) addonMap.set(a.url, a);
    });
    const mergedAddons = Array.from(addonMap.values());

    // 5. Merge Manual Sources
    const remoteManual: Record<string, StreamSource[]> = remote.manualSources || {};
    const allManualKeys = new Set([...Object.keys(localData.manualSources), ...Object.keys(remoteManual)]);
    const mergedManual: Record<string, StreamSource[]> = {};

    allManualKeys.forEach(k => {
      const combined = [...(localData.manualSources[k] || []), ...(remoteManual[k] || [])];
      const seenUrl = new Set<string>();
      mergedManual[k] = combined.filter(s => {
        if (!s.url || seenUrl.has(s.url)) return false;
        seenUrl.add(s.url);
        return true;
      });
    });

    // 6. Active Profile
    const activeProfileId = mergedProfiles.some(p => p.id === localData.activeProfileId)
      ? localData.activeProfileId
      : (mergedProfiles[0]?.id || "p_principal");

    const snapshotToSave: MergedSnapshotResult = {
      profiles: mergedProfiles,
      activeProfileId,
      progressByProfile: mergedProgress,
      playlistByProfile: mergedPlaylist,
      addons: mergedAddons,
      manualSources: mergedManual
    };

    // Save back to Firestore
    await setDoc(
      userDocRef,
      {
        email: user.email || '',
        data: snapshotToSave,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    return snapshotToSave;
  }
};
