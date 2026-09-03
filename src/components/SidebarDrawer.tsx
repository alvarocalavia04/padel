import React from 'react';
import {
  Home,
  User,
  Users,
  History,
  BarChart3,
  Bot,
  Laugh,
  PlusCircle,
  ShieldCheck,
  Lock,
  Sparkles,
  ChevronRight,
  LogOut,
  X,
  Trophy,
  Flame,
  Radio
} from 'lucide-react';
import { ActiveUserSession } from '../utils/playerProfilesStorage';
import { PlayerProfile, ClubThemeConfig } from '../types';

export type AppNavTab =
  | 'home'
  | 'my-profile'
  | 'players'
  | 'history'
  | 'charts'
  | 'qa'
  | 'roasts'
  | 'youtube';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AppNavTab;
  onSelectTab: (tab: AppNavTab) => void;
  currentSession: ActiveUserSession;
  playerProfiles: PlayerProfile[];
  clubTheme: ClubThemeConfig;
  totalMatches: number;
  isAdmin: boolean;
  onOpenAuthModal: () => void;
  onOpenClubThemeModal: () => void;
  onOpenNewMatchModal: () => void;
  onForceSyncCloud?: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  currentSession,
  playerProfiles,
  clubTheme,
  totalMatches,
  isAdmin,
  onOpenAuthModal,
  onOpenClubThemeModal,
  onOpenNewMatchModal,
  onForceSyncCloud
}) => {
  if (!isOpen) return null;

  const activeProfile = playerProfiles.find(
    p => p.name.toLowerCase() === currentSession.playerName?.toLowerCase()
  );

  const navItems: Array<{
    id: AppNavTab;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: string;
    adminOnly?: boolean;
    color: string;
  }> = [
    {
      id: 'home',
      label: 'Inicio',
      description: 'Foto de equipo y último partido',
      icon: Home,
      color: 'text-emerald-400'
    },
    {
      id: 'my-profile',
      label: 'Mi Perfil',
      description: currentSession.playerName ? `Ficha personal de ${currentSession.playerName}` : 'Elige tu jugador',
      icon: User,
      badge: currentSession.playerName ? 'Activo' : undefined,
      color: 'text-cyan-400'
    },
    {
      id: 'players',
      label: 'Jugadores',
      description: 'Explorador con menú desplegable',
      icon: Users,
      badge: `${playerProfiles.length}`,
      color: 'text-amber-400'
    },
    {
      id: 'history',
      label: 'Historial de Partidos',
      description: 'Actas, filtros y resultados',
      icon: History,
      badge: `${totalMatches}`,
      color: 'text-emerald-400'
    },
    {
      id: 'charts',
      label: 'Estadísticas & Gráficos',
      description: 'Evolución de errores y parejas',
      icon: BarChart3,
      color: 'text-purple-400'
    },
    {
      id: 'qa',
      label: 'Preguntas IA',
      description: 'Consultas inteligentes sobre el circuito',
      icon: Bot,
      badge: 'Gemini',
      color: 'text-pink-400'
    },
    {
      id: 'roasts',
      label: 'Modo Guasa & Conclusiones',
      description: 'Sala de prensa y risas',
      icon: Laugh,
      badge: 'VIP',
      color: 'text-amber-400'
    },
    {
      id: 'youtube',
      label: 'Anotador & Grabador',
      description: 'Dictado de voz y análisis de vídeo',
      icon: Radio,
      badge: 'Live',
      color: 'text-rose-400'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
      />

      {/* Drawer Container (Slides from left) */}
      <div className="absolute inset-y-0 left-0 max-w-xs sm:max-w-sm w-full bg-[#0b101e] border-r border-slate-800/90 shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-300">
        
        {/* Header with Club Brand & Close button */}
        <div className="p-4 border-b border-slate-800 bg-[#0e1426] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400 font-black text-sm">
                🎾
              </div>
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight truncate max-w-[180px]">
                {clubTheme.clubName || 'PadelStats Pro'}
              </h2>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Circuito Online
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Identity Mini Card */}
        <div className="p-3.5 mx-3 mt-3 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/90 rounded-2xl shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {activeProfile?.avatarUrl ? (
                <img
                  src={activeProfile.avatarUrl}
                  alt={currentSession.playerName || 'Usuario'}
                  className="w-9 h-9 rounded-xl object-cover border border-emerald-500/40"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md"
                  style={{
                    backgroundColor: activeProfile?.avatarColor || (currentSession.isAdmin ? '#10b981' : '#3b82f6')
                  }}
                >
                  {currentSession.playerName ? currentSession.playerName.charAt(0) : '👤'}
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{currentSession.playerName || 'Modo Invitado'}</span>
                  {isAdmin && (
                    <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black rounded-md flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5" /> ADMIN
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  {currentSession.playerName ? (activeProfile?.nickname || 'Jugador Registrado') : 'Toca para identificarte'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenAuthModal();
              }}
              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-lg transition cursor-pointer"
            >
              Cambiar
            </button>
          </div>
        </div>

        {/* Navigation Item List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1">
            Navegación del Circuito
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between group cursor-pointer ${
                  isActive
                    ? 'bg-emerald-950/60 border border-emerald-500/50 shadow-md shadow-emerald-500/10 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : `bg-slate-900 ${item.color} group-hover:scale-110`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      {item.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-emerald-400/30 text-emerald-200'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      isActive ? 'text-emerald-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800 bg-[#0e1426] space-y-2">
          {/* Quick New Match Button */}
          <button
            onClick={() => {
              onClose();
              onOpenNewMatchModal();
            }}
            className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Nuevo Partido</span>
          </button>

          {/* Club Customization & Admin */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenClubThemeModal();
              }}
              className="flex-1 py-2 px-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 text-slate-300 hover:text-white text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="Personalizar fotos, fondo y nombre del club"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Fotos del Club</span>
            </button>

            {onForceSyncCloud && (
              <button
                onClick={() => {
                  onForceSyncCloud();
                }}
                className="py-2 px-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
                title="Sincronizar todos los datos con la nube"
              >
                <span>☁️ Sincronizar</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onOpenAuthModal();
              }}
              className={`py-2 px-3 border rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isAdmin
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isAdmin ? 'Admin' : 'Acceso'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
