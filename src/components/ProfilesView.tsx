import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { Profile } from '../types';
import { useNetfilmes } from '../context/StoreContext';

interface ProfilesViewProps {
  onProfileSelected: (profile: Profile) => void;
}

const EMOJIS = ["🎬", "🍿", "🎭", "🚀", "👑", "🦁", "🎮", "👾", "🌟", "🔥"];
const COLORS = ["#E50914", "#0071EB", "#2ECC71", "#9B59B6", "#F1C40F", "#E67E22"];

export const ProfilesView: React.FC<ProfilesViewProps> = ({ onProfileSelected }) => {
  const { profiles, activeProfileId, setActiveProfileId, addOrUpdateProfile, deleteProfile } = useNetfilmes();

  const [isManageMode, setIsManageMode] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formAvatar, setFormAvatar] = useState('🎬');
  const [formColor, setFormColor] = useState('#E50914');
  const [formPhoto, setFormPhoto] = useState('');

  const openCreate = () => {
    setFormName('');
    setFormAvatar('🍿');
    setFormColor('#0071EB');
    setFormPhoto('');
    setIsCreating(true);
    setEditingProfile(null);
  };

  const openEdit = (p: Profile) => {
    setFormName(p.name);
    setFormAvatar(p.avatar);
    setFormColor(p.color);
    setFormPhoto(p.photo || '');
    setEditingProfile(p);
    setIsCreating(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = formName.trim() || (isCreating ? 'Novo Perfil' : editingProfile?.name || 'Perfil');

    if (isCreating) {
      const newP: Profile = {
        id: `p_${Date.now()}`,
        name: finalName,
        avatar: formAvatar,
        color: formColor,
        photo: formPhoto.trim() || null,
        createdAt: Date.now()
      };
      addOrUpdateProfile(newP);
      setActiveProfileId(newP.id);
    } else if (editingProfile) {
      addOrUpdateProfile({
        ...editingProfile,
        name: finalName,
        avatar: formAvatar,
        color: formColor,
        photo: formPhoto.trim() || null
      });
    }

    setEditingProfile(null);
    setIsCreating(false);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col items-center justify-center p-6 md:p-12 animate-fadeIn select-none">
      {/* Top Brand & Manage Toggle Header */}
      <div className="absolute top-8 left-8 md:left-16 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#E50914] flex items-center justify-center font-black text-2xl text-white">
          N
        </div>
        <span className="font-black text-xl tracking-wider text-[#E50914]">NETFILMES</span>
      </div>

      <div className="absolute top-8 right-8 md:right-16">
        <button
          onClick={() => setIsManageMode(!isManageMode)}
          className="px-5 py-2 rounded-md bg-transparent border border-white/40 hover:border-white text-gray-300 hover:text-white font-bold text-sm tracking-wider uppercase transition-all cursor-pointer"
        >
          {isManageMode ? 'Concluído' : 'Gerenciar Perfis'}
        </button>
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-12 text-center drop-shadow-lg">
        {isManageMode ? 'Selecione um perfil para editar' : 'Quem está assistindo?'}
      </h1>

      {/* Profiles Grid */}
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 max-w-4xl">
        {profiles.map(profile => {
          const isActive = profile.id === activeProfileId;

          return (
            <div
              key={profile.id}
              onClick={() => {
                if (isManageMode) {
                  openEdit(profile);
                } else {
                  setActiveProfileId(profile.id);
                  onProfileSelected(profile);
                }
              }}
              className="group flex flex-col items-center gap-3 cursor-pointer select-none focus:outline-none"
            >
              {/* Profile Avatar Card */}
              <div
                className={`relative w-28 h-28 md:w-36 md:h-36 rounded-2xl flex items-center justify-center transition-all duration-300 ease-out transform group-hover:scale-108 group-hover:ring-4 group-hover:ring-white group-hover:shadow-2xl overflow-hidden ${
                  isActive && !isManageMode ? 'ring-2 ring-white/60' : ''
                }`}
                style={{ backgroundColor: profile.color || '#E50914' }}
              >
                {profile.photo ? (
                  <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl md:text-6xl drop-shadow-md">{profile.avatar || '🍿'}</span>
                )}

                {/* Manage Pencil Overlay */}
                {isManageMode && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Edit2 className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                )}
              </div>

              {/* Profile Name */}
              <span
                className={`text-base md:text-lg font-semibold transition-colors text-center truncate max-w-[120px] ${
                  isActive || isManageMode ? 'text-white font-bold' : 'text-gray-400 group-hover:text-white'
                }`}
              >
                {profile.name}
              </span>
            </div>
          );
        })}

        {/* Add Profile Card (up to 6 profiles) */}
        {profiles.length < 6 && (
          <div
            onClick={openCreate}
            className="group flex flex-col items-center gap-3 cursor-pointer select-none focus:outline-none"
          >
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-[#242424] hover:bg-[#333] border-2 border-dashed border-white/20 hover:border-white flex items-center justify-center transition-all duration-300 transform group-hover:scale-108">
              <Plus className="w-12 h-12 text-gray-400 group-hover:text-white" />
            </div>
            <span className="text-base md:text-lg font-semibold text-gray-400 group-hover:text-white">
              Adicionar
            </span>
          </div>
        )}
      </div>

      {/* Edit / Create Profile Modal Dialog */}
      {(editingProfile || isCreating) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#1C1C1C] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <h3 className="text-xl font-bold text-white">
                {isCreating ? 'Novo Perfil' : 'Editar Perfil'}
              </h3>
              <button
                onClick={() => {
                  setEditingProfile(null);
                  setIsCreating(false);
                }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
                  Nome do perfil
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex: Pedro, Família, Cinema"
                  required
                  className="w-full bg-[#282828] border border-white/20 focus:border-[#E50914] rounded-lg py-2.5 px-4 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
                  Ícone / Emoji
                </label>
                <div className="flex items-center justify-between gap-1 p-2 rounded-lg bg-[#242424]">
                  {EMOJIS.map(em => (
                    <button
                      type="button"
                      key={em}
                      onClick={() => setFormAvatar(em)}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center cursor-pointer transition-transform ${
                        formAvatar === em ? 'bg-[#E50914] scale-110 shadow' : 'hover:bg-white/10'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
                  Cor de destaque
                </label>
                <div className="flex items-center gap-3">
                  {COLORS.map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setFormColor(c)}
                      className={`w-8 h-8 rounded-full cursor-pointer transition-transform ${
                        formColor === c ? 'ring-3 ring-white scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
                  URL da foto de capa (opcional)
                </label>
                <input
                  type="url"
                  value={formPhoto}
                  onChange={e => setFormPhoto(e.target.value)}
                  placeholder="https://exemplo.com/avatar.jpg"
                  className="w-full bg-[#282828] border border-white/20 focus:border-[#E50914] rounded-lg py-2.5 px-4 text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                {!isCreating && editingProfile && profiles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteProfile(editingProfile.id);
                      setEditingProfile(null);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfile(null);
                      setIsCreating(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-transparent text-gray-400 hover:text-white text-sm font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-lg bg-[#E50914] hover:bg-[#B81D24] text-white text-sm font-bold shadow-md cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
