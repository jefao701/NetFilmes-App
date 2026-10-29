import React, { useState, useEffect } from 'react';
import { Home, Film, Tv, Bookmark, Search, Users, Settings, Cloud, Download } from 'lucide-react';
import { NavigationTab } from '../types';
import { useNetfilmes } from '../context/StoreContext';

interface NavigationRailProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenAccount: () => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentTab,
  onSelectTab,
  onOpenAccount
}) => {
  const { activeProfile, currentUser, syncStatus } = useNetfilmes();
  const [isHovered, setIsHovered] = useState(false);

  // Keyboard shortcut listener for quick navigation (1: Home, 2: Filmes, 3: Séries, 4: Lista, 5: Busca, 6: Perfis, 7: Conta)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      if (e.key === '1') onSelectTab('home');
      else if (e.key === '2') onSelectTab('movies');
      else if (e.key === '3') onSelectTab('series');
      else if (e.key === '4') onSelectTab('playlist');
      else if (e.key === '5') onSelectTab('search');
      else if (e.key === '6') onSelectTab('profiles');
      else if (e.key === '7') onOpenAccount();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectTab, onOpenAccount]);

  const navItems: { tab: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'home', label: 'Início', icon: <Home className="w-5 h-5" /> },
    { tab: 'movies', label: 'Filmes', icon: <Film className="w-5 h-5" /> },
    { tab: 'series', label: 'Séries', icon: <Tv className="w-5 h-5" /> },
    { tab: 'playlist', label: 'Minha Lista', icon: <Bookmark className="w-5 h-5" /> },
    { tab: 'search', label: 'Pesquisa', icon: <Search className="w-5 h-5" /> },
    { tab: 'profiles', label: 'Perfis', icon: <Users className="w-5 h-5" /> }
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed left-0 top-0 bottom-0 z-40 bg-[#121212]/95 backdrop-blur-md border-r border-white/10 flex flex-col items-center py-6 transition-all duration-300 ease-in-out select-none ${
        isHovered ? 'w-56 shadow-2xl shadow-black' : 'w-20'
      }`}
    >
      {/* Brand Icon */}
      <button
        onClick={() => onSelectTab('home')}
        className="flex items-center gap-3 px-4 mb-8 w-full text-left cursor-pointer group focus:outline-none"
        title="Netfilmes"
      >
        <div className="w-10 h-10 rounded-lg bg-[#E50914] flex items-center justify-center font-black text-2xl text-white tracking-tighter shrink-0 shadow-lg shadow-red-950/50 group-hover:scale-105 transition-transform">
          N
        </div>
        <span
          className={`font-black text-xl tracking-wider text-white transition-opacity duration-200 whitespace-nowrap ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          NETFILMES
        </span>
      </button>

      {/* Navigation Menu */}
      <nav className="flex flex-col gap-2 w-full px-3">
        {navItems.map(item => {
          const isActive = currentTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => onSelectTab(item.tab)}
              className={`flex items-center gap-4 px-3.5 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer w-full focus:outline-none ${
                isActive
                  ? 'bg-white/15 text-white border-l-4 border-[#E50914]'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              title={item.label}
            >
              <div className="shrink-0">{item.icon}</div>
              <span
                className={`transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
                  isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer / Account / Profile Avatar */}
      <div className="mt-auto w-full px-3 flex flex-col gap-2">
        {/* Active Profile Quick Button */}
        <button
          onClick={() => onSelectTab('profiles')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors w-full focus:outline-none cursor-pointer"
          title={`Perfil: ${activeProfile.name}`}
        >
          <div
            className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center text-base font-bold shadow-md"
            style={{ backgroundColor: activeProfile.color || '#E50914' }}
          >
            {activeProfile.avatar || '🍿'}
          </div>
          <div
            className={`flex flex-col text-left transition-opacity duration-200 overflow-hidden whitespace-nowrap ${
              isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <span className="text-xs text-gray-400 font-medium">Perfil</span>
            <span className="text-sm font-bold text-white truncate">{activeProfile.name}</span>
          </div>
        </button>

        {/* Account / Cloud Sync Button */}
        <button
          onClick={onOpenAccount}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all w-full focus:outline-none cursor-pointer ${
            currentUser
              ? 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/15'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
          title="Conta & Sincronização Nuvem"
        >
          <div className="relative shrink-0">
            <Cloud className={`w-5 h-5 ${currentUser ? 'text-emerald-400' : 'text-gray-400'}`} />
            {syncStatus === 'syncing' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
            )}
            {currentUser && syncStatus !== 'syncing' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
            )}
          </div>
          <span
            className={`text-sm font-semibold transition-opacity duration-200 whitespace-nowrap truncate ${
              isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {currentUser ? 'Nuvem Sinc' : 'Conectar Conta'}
          </span>
        </button>

        {/* Baixar APK Android */}
        <a
          href="/netfilmes.apk"
          download="netfilmes-v1.6.apk"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-all w-full focus:outline-none cursor-pointer"
          title="Baixar APK Android (v1.6)"
        >
          <div className="shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <span
            className={`text-sm font-bold transition-opacity duration-200 whitespace-nowrap truncate ${
              isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            Baixar APK
          </span>
        </a>
      </div>
    </aside>
  );
};
