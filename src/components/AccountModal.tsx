import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  Mail,
  LogOut,
  Server,
  Film,
  Sparkles,
  Layers,
  Download
} from 'lucide-react';
import { useNetfilmes } from '../context/StoreContext';
import { checkProxyHealth } from '../services/sources';

interface AccountModalProps {
  onClose: () => void;
  onSwitchProfile: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  onClose,
  onSwitchProfile
}) => {
  const {
    activeProfile,
    currentUser,
    syncStatus,
    syncMessage,
    syncNow,
    signIn,
    register,
    signOut,
    addons,
    addAddon,
    toggleAddon,
    removeAddon,
    manualSources
  } = useNetfilmes();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Proxy health state
  const [proxyOnline, setProxyOnline] = useState<boolean | null>(null);
  const [isTestingProxy, setIsTestingProxy] = useState(false);

  // Add Addon Form
  const [showAddAddon, setShowAddAddon] = useState(false);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonUrl, setNewAddonUrl] = useState('');

  const testHealth = async () => {
    setIsTestingProxy(true);
    const ok = await checkProxyHealth();
    setProxyOnline(ok);
    setIsTestingProxy(false);
  };

  useEffect(() => {
    testHealth();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setAuthError("Preencha e-mail e senha.");
      return;
    }
    setAuthError(null);
    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        await register(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setAuthError(err?.message || "Erro na autenticação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAddon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddonUrl.trim()) return;
    const name = newAddonName.trim() || "Addon Personalizado";
    addAddon({
      url: newAddonUrl.trim(),
      name,
      enabled: true,
      kind: 'auto'
    });
    setNewAddonName('');
    setNewAddonUrl('');
    setShowAddAddon(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex justify-center p-4 md:p-8 animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#181818] rounded-2xl overflow-hidden shadow-2xl z-10 my-auto text-white border border-white/10 p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E50914] flex items-center justify-center font-black text-xl text-white">
              N
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white">Conta & Configurações</h2>
              <p className="text-xs text-gray-400">Netfilmes Versão PC & TV • Nuvem Oficial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#242424] hover:bg-[#333] flex items-center justify-center text-gray-300 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-6 space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Cloud Server Live Health Badge */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#222] border border-white/10">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${proxyOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <div>
                <p className="text-sm font-bold text-white">Servidor Netfilmes Nuvem</p>
                <p className="text-xs text-gray-400">https://netfilmes-proxy.shardweb.app (login-3ebd2)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold ${proxyOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isTestingProxy ? 'TESTANDO...' : proxyOnline ? 'ONLINE' : 'CONECTANDO'}
              </span>
              <button
                onClick={testHealth}
                className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                title="Testar Conexão"
              >
                <RefreshCw className={`w-4 h-4 ${isTestingProxy ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Active Profile Card */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#222] border border-white/10">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold shadow-md"
                style={{ backgroundColor: activeProfile.color || '#E50914' }}
              >
                {activeProfile.avatar || '🍿'}
              </div>
              <div>
                <p className="text-base font-bold text-white">{activeProfile.name}</p>
                <p className="text-xs text-gray-400">Perfil ativo em reprodução</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onSwitchProfile();
              }}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Trocar Perfil
            </button>
          </div>

          {/* Firebase Cloud Sync Section */}
          <div className="p-5 rounded-xl bg-[#222] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-[#E50914]" />
                <h3 className="text-base font-bold text-white">Sincronização na Nuvem (Firebase)</h3>
              </div>
              {currentUser && (
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              )}
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Sincronize seu histórico de reprodução, o minuto exato onde parou, Minha Lista e perfis entre a sua Smart TV, Celular Android e este PC.
            </p>

            {currentUser ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-[#181818] rounded-lg border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Conectado como</span>
                    <span className="text-sm font-bold text-white">{currentUser.email}</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                    <CheckCircle className="w-4 h-4" /> Sincronizado
                  </span>
                </div>

                {syncMessage && (
                  <p className={`text-xs font-medium ${syncStatus === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {syncMessage}
                  </p>
                )}

                <button
                  onClick={syncNow}
                  disabled={syncStatus === 'syncing'}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#E50914] hover:bg-[#B81D24] text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  {syncStatus === 'syncing' ? 'Sincronizando...' : 'Sincronizar Agora'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-3 pt-2">
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Seu e-mail cadastrado no App"
                    className="w-full bg-[#181818] border border-white/15 focus:border-[#E50914] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                  />
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full bg-[#181818] border border-white/15 focus:border-[#E50914] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                  />
                </div>

                {authError && (
                  <p className="text-xs text-red-400 font-semibold">{authError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-[#E50914] hover:bg-[#B81D24] text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Processando...' : isRegisterMode ? 'Cadastrar Nova Conta' : 'Entrar e Sincronizar'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(!isRegisterMode);
                      setAuthError(null);
                    }}
                    className="text-xs text-gray-400 hover:text-white underline cursor-pointer"
                  >
                    {isRegisterMode ? 'Já tem conta? Fazer Login' : 'Não tem conta? Cadastrar-se'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Addons & Custom Video Sources Section */}
          <div className="p-5 rounded-xl bg-[#222] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#E50914]" />
                <h3 className="text-base font-bold text-white">Fontes de Vídeo & Addons ({addons.length})</h3>
              </div>
              <button
                onClick={() => setShowAddAddon(!showAddAddon)}
                className="flex items-center gap-1 text-xs font-bold text-[#E50914] hover:underline cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Adicionar Fonte
              </button>
            </div>

            {showAddAddon && (
              <form onSubmit={handleAddAddon} className="p-3 bg-[#181818] rounded-lg border border-white/10 space-y-2.5">
                <input
                  type="text"
                  value={newAddonName}
                  onChange={e => setNewAddonName(e.target.value)}
                  placeholder="Nome da fonte (ex: Meu Addon / Stremio)"
                  className="w-full bg-[#242424] border border-white/10 rounded-md px-3 py-2 text-xs text-white outline-none"
                />
                <input
                  type="url"
                  value={newAddonUrl}
                  onChange={e => setNewAddonUrl(e.target.value)}
                  placeholder="URL do manifest.json"
                  required
                  className="w-full bg-[#242424] border border-white/10 rounded-md px-3 py-2 text-xs text-white outline-none"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddAddon(false)}
                    className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded bg-[#E50914] text-xs font-bold text-white hover:bg-[#B81D24] cursor-pointer"
                  >
                    Salvar Addon
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {addons.map(addon => (
                <div
                  key={addon.url}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#181818] border border-white/5"
                >
                  <div className="truncate max-w-[280px] md:max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{addon.name}</span>
                      {addon.builtin && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          OFICIAL
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 truncate block">{addon.url}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={addon.enabled}
                      onChange={e => toggleAddon(addon.url, e.target.checked)}
                      className="w-4 h-4 accent-[#E50914] cursor-pointer"
                    />
                    {!addon.builtin && (
                      <button
                        onClick={() => removeAddon(addon.url)}
                        className="text-gray-500 hover:text-red-400 cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(manualSources).length > 0 && (
              <div className="p-3 bg-[#181818] rounded-lg border border-white/5 text-xs text-gray-300">
                ⭐ <strong className="text-white">{Object.keys(manualSources).length}</strong> fontes manuais configuradas.
              </div>
            )}

            {/* Android APK Direct Download */}
            <div className="p-4 bg-gradient-to-r from-red-950/40 to-neutral-900 rounded-lg border border-red-600/30 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Netfilmes Android (APK)</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white">v1.6</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Instale diretamente na sua TV Box, Android TV ou celular.
                </p>
              </div>
              <a
                href="/netfilmes.apk"
                download="netfilmes-v1.6.apk"
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E50914] hover:bg-[#B81D24] text-white text-xs font-bold transition-all shadow-md shadow-red-950/50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Baixar APK
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
