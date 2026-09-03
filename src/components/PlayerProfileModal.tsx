import React, { useState, useEffect, useRef } from 'react';
import { X, UserPlus, Check, UserCheck, Shield, Sparkles, AlertCircle, Camera, Upload, Trash2, Loader2 } from 'lucide-react';
import { PlayerProfile } from '../types';
import { PROFILE_COLOR_PRESETS } from '../utils/playerProfilesStorage';
import { compressImageFile } from '../utils/imageCompressor';

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: PlayerProfile) => void;
  onDelete?: (profileId: string, playerName: string) => void;
  initialProfile?: PlayerProfile | null;
  existingProfiles: PlayerProfile[];
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialProfile,
  existingProfiles
}) => {
  if (!isOpen) return null;

  const isEditing = !!initialProfile;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  const [name, setName] = useState<string>(initialProfile?.name || '');
  const [nickname, setNickname] = useState<string>(initialProfile?.nickname || '');
  const [avatarColor, setAvatarColor] = useState<string>(
    initialProfile?.avatarColor || PROFILE_COLOR_PRESETS[0].hex
  );
  const [avatarUrl, setAvatarUrl] = useState<string>(initialProfile?.avatarUrl || '');
  const [preferredSide, setPreferredSide] = useState<'drive' | 'reves' | 'ambos'>(
    initialProfile?.preferredSide || 'drive'
  );
  const [dominantHand, setDominantHand] = useState<'diestro' | 'zurdo'>(
    initialProfile?.dominantHand || 'diestro'
  );
  const [notes, setNotes] = useState<string>(initialProfile?.notes || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name);
      setNickname(initialProfile.nickname || '');
      setAvatarColor(initialProfile.avatarColor);
      setAvatarUrl(initialProfile.avatarUrl || '');
      setPreferredSide(initialProfile.preferredSide);
      setDominantHand(initialProfile.dominantHand);
      setNotes(initialProfile.notes || '');
    } else {
      setName('');
      setNickname('');
      setAvatarUrl('');
      // Assign next unused color if possible
      const usedColors = new Set(existingProfiles.map(p => p.avatarColor.toLowerCase()));
      const availablePreset = PROFILE_COLOR_PRESETS.find(c => !usedColors.has(c.hex.toLowerCase()));
      setAvatarColor(availablePreset ? availablePreset.hex : PROFILE_COLOR_PRESETS[Math.floor(Math.random() * PROFILE_COLOR_PRESETS.length)].hex);
      setPreferredSide('drive');
      setDominantHand('diestro');
      setNotes('');
    }
    setError(null);
    setIsProcessingPhoto(false);
  }, [initialProfile, isOpen, existingProfiles]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingPhoto(true);
      setError(null);
      try {
        const compressed = await compressImageFile(file, {
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.85
        });
        setAvatarUrl(compressed);
      } catch (err: any) {
        console.error('Error compressing profile photo:', err);
        setError('No se pudo procesar la foto del jugador.');
      } finally {
        setIsProcessingPhoto(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Por favor introduce el nombre del jugador.');
      return;
    }

    // Check duplicate names (excluding current editing profile)
    const duplicate = existingProfiles.find(
      p => p.name.toLowerCase() === cleanName.toLowerCase() && p.id !== initialProfile?.id
    );
    if (duplicate) {
      setError(`Ya existe un jugador con el nombre "${duplicate.name}". Usa un nombre diferente o añade su apellido para evitar confusiones.`);
      return;
    }

    const savedProfile: PlayerProfile = {
      id: initialProfile?.id || `profile-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: cleanName,
      nickname: nickname.trim() || undefined,
      avatarColor,
      avatarUrl: avatarUrl.trim() || undefined,
      preferredSide,
      dominantHand,
      notes: notes.trim() || undefined,
      createdAt: initialProfile?.createdAt || new Date().toISOString().split('T')[0]
    };

    onSave(savedProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden my-8 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-md" style={{ backgroundColor: avatarColor }}>
              {name ? name.charAt(0).toUpperCase() : '🎾'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                {isEditing ? <UserCheck className="w-4 h-4 text-cyan-400" /> : <UserPlus className="w-4 h-4 text-emerald-400" />}
                {isEditing ? 'Editar Perfil de Jugador' : 'Registrar Nuevo Jugador'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Garantiza que las estadísticas se asignen con precisión
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-600/60 rounded-xl text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Nickname */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Nombre Oficial / Canónico <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ej. Álvaro, Carlos..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Apodo / Alias (Opcional)
              </label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Ej. El Muro, El Rayo..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Photo / Avatar Section */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Foto de Perfil del Jugador (Opcional)</span>
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="text-[10px] text-rose-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Quitar foto</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-900 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name || 'Jugador'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-base text-white" style={{ backgroundColor: avatarColor }}>
                    {name ? name.charAt(0).toUpperCase() : '🎾'}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isProcessingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-emerald-300 text-[11px] font-bold rounded-lg border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                >
                  {isProcessingPhoto ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3" />
                      <span>Subir foto (JPG/PNG)</span>
                    </>
                  )}
                </button>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="O pega enlace URL..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Preferred Side on Court */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Lado Preferido en la Pista
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'drive', label: 'Drive (Derecha)', desc: 'Control & salida' },
                { id: 'reves', label: 'Revés (Izquierda)', desc: 'Potencia & definición' },
                { id: 'ambos', label: 'Polivalente', desc: 'Juega en ambos' },
              ].map(side => (
                <button
                  key={side.id}
                  type="button"
                  onClick={() => setPreferredSide(side.id as any)}
                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                    preferredSide === side.id
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-950/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-xs">{side.label}</span>
                  <span className="text-[9px] text-slate-500">{side.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dominant Hand */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Mano Dominante
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'diestro', label: '🎾 Diestro' },
                { id: 'zurdo', label: '⚡ Zurdo (Especial zurdos)' },
              ].map(hand => (
                <button
                  key={hand.id}
                  type="button"
                  onClick={() => setDominantHand(hand.id as any)}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer font-semibold ${
                    dominantHand === hand.id
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {hand.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Preset Palette */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Color Distintivo del Jugador
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PROFILE_COLOR_PRESETS.map(preset => {
                const isSelected = avatarColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setAvatarColor(preset.hex)}
                    className={`w-7 h-7 rounded-full transition flex items-center justify-center cursor-pointer ${
                      isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    title={preset.name}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Notas Tácticas / Características de Juego (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. Muy seguro con la volea de revés, peligroso en bajadas de pared..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
            {isEditing && onDelete ? (
              isConfirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-rose-400 font-bold">¿Seguro?</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (initialProfile) {
                        onDelete(initialProfile.id, initialProfile.name);
                        onClose();
                      }
                    }}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                  >
                    Sí, eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg transition"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3 py-2 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/60 text-rose-400 hover:text-rose-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Eliminar este perfil de jugador"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              )
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{isEditing ? 'Guardar Cambios' : 'Crear Perfil'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
