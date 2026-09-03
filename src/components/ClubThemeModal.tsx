import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Image as ImageIcon, 
  Upload, 
  Check, 
  Palette, 
  Eye, 
  Layers, 
  Sliders,
  Trash2,
  Camera,
  Users,
  Loader2
} from 'lucide-react';
import { ClubThemeConfig } from '../types';
import { compressImageFile } from '../utils/imageCompressor';

interface ClubThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ClubThemeConfig;
  onSave?: (newConfig: ClubThemeConfig) => void;
  onSaveConfig?: (newConfig: ClubThemeConfig) => void;
}

export const PRESET_BACKGROUNDS = [
  {
    name: 'Pista Nocturna Pro',
    url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1920&q=80',
    description: 'Iluminación LED de pista de cristal'
  },
  {
    name: 'Cancha Azul Torneo',
    url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1920&q=80',
    description: 'Superficie azul con contraste atlético'
  },
  {
    name: 'Atmósfera Deportiva Dark',
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80',
    description: 'Textura minimalista de alta intensidad'
  },
  {
    name: 'Pala & Pelota Pro',
    url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1920&q=80',
    description: 'Enfoque de precisión en pala y pista'
  }
];

export const ClubThemeModal: React.FC<ClubThemeModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onSaveConfig
}) => {
  if (!isOpen) return null;

  const [clubName, setClubName] = useState(config.clubName || 'PadelStats Pro');
  const [clubTagline, setClubTagline] = useState(config.clubTagline || 'Club Privado & Circuito de Amigos');
  const [bannerImageUrl, setBannerImageUrl] = useState(config.bannerImageUrl || '');
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState(config.customBackgroundUrl || '');
  const [backgroundOpacity, setBackgroundOpacity] = useState(config.backgroundOpacity ?? 20);
  const [courtGlow, setCourtGlow] = useState(config.courtGlow ?? true);
  const [neonTheme, setNeonTheme] = useState<ClubThemeConfig['neonTheme']>(config.neonTheme || 'emerald');

  const [isProcessingBanner, setIsProcessingBanner] = useState<boolean>(false);
  const [isProcessingBg, setIsProcessingBg] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingBanner(true);
      setUploadError(null);
      try {
        // Compress and optimize image to ensure it fits perfectly in storage
        const compressed = await compressImageFile(file, {
          maxWidth: 1440,
          maxHeight: 900,
          quality: 0.82
        });
        setBannerImageUrl(compressed);
      } catch (err: any) {
        console.error('Error compressing banner:', err);
        setUploadError('No se pudo procesar la imagen del banner. Inténtalo con otra imagen.');
      } finally {
        setIsProcessingBanner(false);
      }
    }
  };

  const handleBgFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingBg(true);
      setUploadError(null);
      try {
        // Compress background to prevent localStorage quota overflow
        const compressed = await compressImageFile(file, {
          maxWidth: 1600,
          maxHeight: 1000,
          quality: 0.78
        });
        setCustomBackgroundUrl(compressed);
      } catch (err: any) {
        console.error('Error compressing background:', err);
        setUploadError('No se pudo procesar el fondo. Inténtalo con otra imagen.');
      } finally {
        setIsProcessingBg(false);
      }
    }
  };

  const handleSave = () => {
    const newConfig: ClubThemeConfig = {
      clubName: clubName.trim() || 'PadelStats Pro',
      clubTagline: clubTagline.trim() || 'Club Privado & Circuito de Amigos',
      bannerImageUrl: bannerImageUrl.trim(),
      customBackgroundUrl: customBackgroundUrl.trim(),
      backgroundOpacity,
      courtGlow,
      neonTheme
    };

    if (onSave) {
      onSave(newConfig);
    } else if (onSaveConfig) {
      onSaveConfig(newConfig);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0b101b] border border-slate-700/80 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8 text-slate-100">
        
        {/* Modal Header */}
        <div className="p-6 bg-slate-950/90 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Diseño del Club & Fotos del Grupo</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Personaliza el banner de tu grupo, fotos de fondo y estética deportiva neón.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">

          {/* 1. Group / Club Identity */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Users className="w-4 h-4" />
              <span>1. Nombre del Grupo o Club</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
                  Nombre del Club / Grupo
                </label>
                <input
                  type="text"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="ej: Circuito Pádel Galácticos"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
                  Lema / Subtítulo
                </label>
                <input
                  type="text"
                  value={clubTagline}
                  onChange={(e) => setClubTagline(e.target.value)}
                  placeholder="ej: Temporada 2026 - Partidos & Estadísticas"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Group Photo / Banner */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Camera className="w-4 h-4" />
                <span>2. Foto de Cabecera del Grupo (Hero Banner)</span>
              </div>
              {bannerImageUrl && (
                <button
                  type="button"
                  onClick={() => setBannerImageUrl('')}
                  className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Quitar foto</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {/* Preview */}
              {bannerImageUrl ? (
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-emerald-500/40 shadow-inner group">
                  <img
                    src={bannerImageUrl}
                    alt="Banner del grupo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex items-end p-3">
                    <div>
                      <div className="text-sm font-black text-white">{clubName}</div>
                      <div className="text-[11px] text-emerald-400">{clubTagline}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-24 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <ImageIcon className="w-6 h-6 mb-1 text-slate-600" />
                  <span>Sin foto de cabecera personalizada (usa el diseño neón por defecto)</span>
                </div>
              )}

              {/* Upload actions */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={bannerFileInputRef}
                  onChange={handleBannerFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isProcessingBanner}
                  onClick={() => bannerFileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/40 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isProcessingBanner ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Optimizando foto...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir foto de tu grupo (JPG/PNG)</span>
                    </>
                  )}
                </button>

                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="O pega una URL directa de imagen..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Global Background Image */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Layers className="w-4 h-4" />
                <span>3. Imagen de Fondo de Toda la Web (Atmósfera)</span>
              </div>
              {customBackgroundUrl && (
                <button
                  type="button"
                  onClick={() => setCustomBackgroundUrl('')}
                  className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Usar fondo oscuro liso</span>
                </button>
              )}
            </div>

            {/* Presets Grid */}
            <div>
              <div className="text-[11px] text-slate-400 font-semibold mb-2">
                Fondos de Pista Pro Recomendados:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_BACKGROUNDS.map((bg) => {
                  const isSelected = customBackgroundUrl === bg.url;
                  return (
                    <button
                      key={bg.name}
                      type="button"
                      onClick={() => setCustomBackgroundUrl(bg.url)}
                      className={`relative h-20 rounded-xl overflow-hidden border text-left p-2 transition cursor-pointer group ${
                        isSelected
                          ? 'border-emerald-400 ring-2 ring-emerald-500/50 shadow-lg'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <img
                        src={bg.url}
                        alt={bg.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-950/70 group-hover:bg-slate-950/50 transition" />
                      <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="text-[11px] font-bold text-white leading-tight">
                          {bg.name}
                        </div>
                        {isSelected && (
                          <div className="self-end p-0.5 bg-emerald-500 text-slate-950 rounded-full">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom URL or Upload */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="file"
                ref={bgFileInputRef}
                onChange={handleBgFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                disabled={isProcessingBg}
                onClick={() => bgFileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                {isProcessingBg ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Optimizando fondo...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir fondo propio</span>
                  </>
                )}
              </button>

              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={customBackgroundUrl}
                  onChange={(e) => setCustomBackgroundUrl(e.target.value)}
                  placeholder="URL de fondo personalizada..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Opacity slider */}
            {customBackgroundUrl && (
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    Intensidad / Opacidad del Fondo:
                  </span>
                  <span className="font-mono font-bold text-emerald-400">{backgroundOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={backgroundOpacity}
                  onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="text-[10px] text-slate-500">
                  Valores entre 15% y 30% ofrecen la mejor atmósfera de fondo sin reducir la legibilidad de las estadísticas.
                </div>
              </div>
            )}
          </div>

          {/* 4. Lighting & Neon Accents */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>4. Acentos Neón & Tonalidad de Pista</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'emerald', label: 'Volt Emerald', color: 'bg-emerald-500', ring: 'ring-emerald-400' },
                { id: 'cyan', label: 'Laser Cyan', color: 'bg-cyan-400', ring: 'ring-cyan-400' },
                { id: 'amber', label: 'Cyber Gold', color: 'bg-amber-400', ring: 'ring-amber-400' },
                { id: 'purple', label: 'Neon Purple', color: 'bg-purple-500', ring: 'ring-purple-400' },
                { id: 'red', label: 'Hyper Red', color: 'bg-rose-500', ring: 'ring-rose-400' },
              ].map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setNeonTheme(th.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                    neonTheme === th.id
                      ? 'bg-slate-800 border-emerald-500/80 ring-2 ring-emerald-500/30'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${th.color} shadow-sm`} />
                  <span className="text-[11px] font-bold text-slate-200">{th.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Aplicar y Guardar Diseño</span>
          </button>
        </div>

      </div>
    </div>
  );
};
