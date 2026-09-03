/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Activity,
  Zap,
  TrendingUp,
  Mic,
  History,
  Sparkles,
  Plus,
  RotateCcw,
  Download,
  Upload,
  Layers,
  ChevronRight,
  BarChart3,
  Users,
  CheckCircle2,
  Youtube,
  MessageSquare,
  Bot,
  Menu,
  Home,
  User,
  ShieldCheck,
  Lock,
  CloudCheck,
  Radio,
  Laugh
} from 'lucide-react';
import { PadelMatch, PlayerStats, PlayerHistorySummary, PlayerProfile, ClubThemeConfig } from './types';
import { INITIAL_MATCHES, INITIAL_KNOWN_PLAYERS } from './data/initialMatches';
import { calculatePlayerHistories, getPlayerColor } from './utils/statsCalculator';
import { 
  loadStoredPlayerProfiles, 
  saveStoredPlayerProfiles, 
  syncProfilesWithMatches,
  loadActiveUserSession,
  saveActiveUserSession,
  ActiveUserSession
} from './utils/playerProfilesStorage';
import { AudioRecorder } from './components/AudioRecorder';
import { YouTubeVideoStudio } from './components/YouTubeVideoStudio';
import { MatchSummaryCard } from './components/MatchSummaryCard';
import { HistoricalTable } from './components/HistoricalTable';
import { EvolutionCharts } from './components/EvolutionCharts';
import { MatchHistoryList } from './components/MatchHistoryList';
import { GroupTacticalInsights } from './components/GroupTacticalInsights';
import { PlayerProfiles } from './components/PlayerProfiles';
import { IronicPlayerRoasts } from './components/IronicPlayerRoasts';
import { StatsQAAssistant } from './components/StatsQAAssistant';
import { MatchDetailModal } from './components/MatchDetailModal';
import { NewMatchModal } from './components/NewMatchModal';
import { ClubHeroBanner } from './components/ClubHeroBanner';
import { ClubThemeModal } from './components/ClubThemeModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { UserAuthModal } from './components/UserAuthModal';
import { SidebarDrawer, AppNavTab } from './components/SidebarDrawer';
import { HomeDashboard } from './components/HomeDashboard';
import { MyProfileView } from './components/MyProfileView';
import { PlayersExplorer } from './components/PlayersExplorer';
import { 
  subscribeToMatches, 
  saveMatchToFirestore, 
  deleteMatchFromFirestore,
  subscribeToPlayerProfiles,
  savePlayerProfileToFirestore,
  deletePlayerProfileFromFirestore,
  subscribeToClubTheme,
  saveClubThemeToFirestore,
  subscribeToAuthState
} from './services/firebaseService';
import { getIsAdminSession, setIsAdminSession, checkAdminPassword } from './utils/adminAuth';

const STORAGE_KEY = 'padelstats_matches_data_v2';
const CLUB_THEME_STORAGE_KEY = 'padelstats_club_theme_v2';

const DEFAULT_CLUB_THEME: ClubThemeConfig = {
  clubName: 'Padel Club Pro',
  clubTagline: 'Circuito Privado de Pádel - Estadísticas y Análisis de Alto Rendimiento',
  bannerImageUrl: '',
  customBackgroundUrl: '',
  backgroundOpacity: 20,
  courtGlow: true,
  neonTheme: 'emerald'
};

export default function App() {
  // Admin & User Session State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => getIsAdminSession());
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState<boolean>(false);
  const [isUserAuthModalOpen, setIsUserAuthModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(true);

  // Active User Session (Recognized Player / Google / Guest)
  const [currentSession, setCurrentSession] = useState<ActiveUserSession>(() => {
    return loadActiveUserSession();
  });

  // Load saved matches or start empty from scratch
  const [matches, setMatches] = useState<PadelMatch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
    }
    return INITIAL_MATCHES;
  });

  // Active view tab - default to 'home' (Inicio)
  const [activeTab, setActiveTab] = useState<AppNavTab>('home');

  // Match being resumed / continued in progress
  const [matchToResume, setMatchToResume] = useState<PadelMatch | null>(null);

  // Currently analyzed audio match (waiting to be reviewed / saved)
  const [pendingAnalysis, setPendingAnalysis] = useState<{
    transcription: string;
    detectedPlayers: string[];
    stats: Record<string, PlayerStats>;
    summary: string;
    highlights: string[];
    mvp: string;
    scoreEstimate?: string;
    tacticalAdvice?: string;
    audioName?: string;
    correctionsApplied?: string[];
    youtubeUrl?: string;
  } | null>(null);

  // Selected player for drilldown in charts and players tab
  const [selectedPlayer, setSelectedPlayer] = useState<string>('Álvaro');

  // Modal states
  const [inspectMatch, setInspectMatch] = useState<PadelMatch | null>(null);
  const [isNewMatchModalOpen, setIsNewMatchModalOpen] = useState<boolean>(false);
  const [isClubThemeModalOpen, setIsClubThemeModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Club Theme & Custom Group Photos configuration
  const [clubTheme, setClubTheme] = useState<ClubThemeConfig>(() => {
    try {
      const saved = localStorage.getItem(CLUB_THEME_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CLUB_THEME, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Error reading club theme from localStorage:', e);
    }
    return DEFAULT_CLUB_THEME;
  });

  // Canonical Player Profiles with persistent storage
  const [playerProfiles, setPlayerProfiles] = useState<PlayerProfile[]>(() => {
    return loadStoredPlayerProfiles();
  });

  // 1. Real-time Firebase Firestore Subscriptions (Cloud Sync)
  useEffect(() => {
    setIsCloudSyncing(true);

    // Subscribe to online matches
    const unsubMatches = subscribeToMatches((cloudMatches) => {
      if (cloudMatches && cloudMatches.length > 0) {
        setMatches(cloudMatches);
      } else {
        // If Firestore is empty initially, seed with current local matches from localStorage
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsed.forEach((m: PadelMatch) => {
                saveMatchToFirestore(m).catch(console.error);
              });
            }
          }
        } catch (e) {
          console.error('Error auto-seeding matches to cloud:', e);
        }
      }
      setIsCloudSyncing(false);
    });

    // Subscribe to online player profiles
    const unsubProfiles = subscribeToPlayerProfiles((cloudProfiles) => {
      if (cloudProfiles && cloudProfiles.length > 0) {
        setPlayerProfiles(cloudProfiles);
        saveStoredPlayerProfiles(cloudProfiles);
      } else {
        playerProfiles.forEach(p => {
          savePlayerProfileToFirestore(p).catch(console.error);
        });
      }
    });

    // Subscribe to online club theme settings
    const unsubTheme = subscribeToClubTheme((cloudTheme) => {
      if (cloudTheme && cloudTheme.clubName) {
        setClubTheme(cloudTheme);
      }
    });

    // Subscribe to auth state
    const unsubAuth = subscribeToAuthState((user) => {
      if (user) {
        const isAlvaro = user.email?.toLowerCase() === 'alvarocalavia04@gmail.com' || user.displayName?.toLowerCase().includes('alvaro');
        if (isAlvaro) {
          setIsAdmin(true);
          setIsAdminSession(true);
        }
      }
    });

    return () => {
      unsubMatches();
      unsubProfiles();
      unsubTheme();
      unsubAuth();
    };
  }, []);

  // Force manual push of all local data to Firestore Cloud
  const handleForceSyncCloud = async () => {
    setIsCloudSyncing(true);
    try {
      // Sync matches
      for (const m of matches) {
        await saveMatchToFirestore(m);
      }
      // Sync player profiles
      for (const p of playerProfiles) {
        await savePlayerProfileToFirestore(p);
      }
      // Sync club theme
      await saveClubThemeToFirestore(clubTheme);
      showToast('☁️ Todos los partidos, perfiles y fotos se han sincronizado con la nube para todos los jugadores.');
    } catch (e) {
      console.error('Error in handleForceSyncCloud:', e);
      showToast('Error al sincronizar con la nube.');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Save club theme to localStorage & Cloud
  useEffect(() => {
    try {
      localStorage.setItem(CLUB_THEME_STORAGE_KEY, JSON.stringify(clubTheme));
    } catch (e) {
      console.error('Error saving club theme:', e);
    }
  }, [clubTheme]);

  // Save matches to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }, [matches]);

  // Save active user session
  useEffect(() => {
    saveActiveUserSession(currentSession);
    if (currentSession.isAdmin) {
      setIsAdmin(true);
      setIsAdminSession(true);
    }
  }, [currentSession]);

  // Flash notification helper
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Derive known unique players
  const knownPlayers = useMemo(() => {
    const fromProfiles = playerProfiles.map(p => p.name);
    const fromMatches = matches.flatMap((m) => {
      const declared = [m.team1?.player1, m.team1?.player2, m.team2?.player1, m.team2?.player2].filter(Boolean) as string[];
      if (declared.length > 0) return Array.from(new Set(declared));
      return Object.keys(m.stats || {}).filter(p => {
        const s = m.stats[p];
        return s && (s.touches > 0 || s.forcedErrors > 0 || s.unforcedErrors > 0 || s.winners > 0);
      });
    });
    const combined = Array.from(new Set([...INITIAL_KNOWN_PLAYERS, ...fromProfiles, ...fromMatches]));
    return combined;
  }, [matches, playerProfiles]);

  // Sync player profiles with matches
  useEffect(() => {
    setPlayerProfiles((prev) => syncProfilesWithMatches(prev, matches));
  }, [matches]);

  // Admin login handler
  const handleLoginAsAdmin = (attempt: string) => {
    const ok = checkAdminPassword(attempt);
    if (ok) {
      setIsAdmin(true);
      setIsAdminSession(true);
      showToast('🛡️ Modo Administrador Activado.');
      return true;
    }
    return false;
  };

  const handleLogoutAdmin = () => {
    setIsAdmin(false);
    setIsAdminSession(false);
    showToast('Modo espectador activado.');
  };

  const requireAdminCheck = (actionName: string): boolean => {
    if (isAdmin) return true;
    setIsAdminAuthModalOpen(true);
    showToast(`🔒 Se requiere clave de Administrador para ${actionName}.`);
    return false;
  };

  const handleSaveProfile = async (profile: PlayerProfile) => {
    if (!requireAdminCheck('editar perfiles')) return;
    setPlayerProfiles((prev) => {
      const idx = prev.findIndex(
        (p) => p.id === profile.id || p.name.toLowerCase() === profile.name.toLowerCase()
      );
      let updated: PlayerProfile[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = profile;
      } else {
        updated = [...prev, profile];
      }
      saveStoredPlayerProfiles(updated);
      return updated;
    });
    try {
      await savePlayerProfileToFirestore(profile);
      showToast(`☁️ Perfil de "${profile.name}" sincronizado en la nube.`);
    } catch (e) {
      console.error(e);
      showToast(`👤 Perfil de "${profile.name}" guardado.`);
    }
  };

  const handleDeleteProfile = async (profileId: string, playerName: string) => {
    if (!requireAdminCheck('eliminar jugadores')) return;
    setPlayerProfiles((prev) => {
      const updated = prev.filter(p => p.id !== profileId && p.name.toLowerCase() !== playerName.toLowerCase());
      saveStoredPlayerProfiles(updated);
      return updated;
    });
    try {
      await deletePlayerProfileFromFirestore(profileId);
      showToast(`☁️ Jugador "${playerName}" eliminado de la nube.`);
    } catch (e) {
      console.error(e);
      showToast(`🗑️ Jugador "${playerName}" eliminado del registro.`);
    }
  };

  // Calculate overall player historical stats
  const playerHistories = useMemo(() => {
    const arr = calculatePlayerHistories(matches);
    const map: Record<string, PlayerHistorySummary> = {};
    arr.forEach(h => {
      map[h.name] = h;
    });
    return map;
  }, [matches]);

  // Handler when audio is analyzed by Gemini
  const handleAudioAnalysisComplete = (result: any) => {
    setPendingAnalysis(result);
  };

  // Save new or edited match
  const handleSaveMatch = async (matchData: PadelMatch) => {
    if (!requireAdminCheck('guardar o modificar partidos')) return;

    setMatches((prev) => {
      const idx = prev.findIndex((m) => m.id === matchData.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = matchData;
        return updated;
      }
      return [matchData, ...prev];
    });

    try {
      await saveMatchToFirestore(matchData);
      showToast('☁️ Partido guardado y sincronizado en la nube.');
    } catch (err) {
      console.error('Error saving to cloud:', err);
      showToast('💾 Guardado localmente.');
    }

    setPendingAnalysis(null);
    setMatchToResume(null);
  };

  // Resume or continue match
  const handleResumeMatch = (match: PadelMatch) => {
    if (!requireAdminCheck('editar o reanudar partidos')) return;
    setMatchToResume(match);
    setActiveTab('youtube');
    setInspectMatch(null);
    showToast(`Marcador cargado: "${match.title}" listo para continuar.`);
  };

  // Update match inline from list or modal
  const handleUpdateMatch = async (updated: PadelMatch) => {
    if (!requireAdminCheck('modificar actas')) return;

    setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    if (inspectMatch && inspectMatch.id === updated.id) {
      setInspectMatch(updated);
    }

    try {
      await saveMatchToFirestore(updated);
      showToast('☁️ Acta actualizada en la nube.');
    } catch (e) {
      console.error(e);
      showToast('Acta actualizada con éxito.');
    }
  };

  // Delete match
  const handleDeleteMatch = async (matchId: string) => {
    if (!requireAdminCheck('eliminar partidos')) return;

    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    if (inspectMatch && inspectMatch.id === matchId) {
      setInspectMatch(null);
    }

    try {
      await deleteMatchFromFirestore(matchId);
      showToast('☁️ Partido eliminado de la nube.');
    } catch (e) {
      console.error(e);
      showToast('Partido eliminado del historial.');
    }
  };

  // Reset all matches to default
  const handleResetMatches = () => {
    if (!requireAdminCheck('reiniciar el historial de partidos')) return;

    if (window.confirm('¿Seguro que deseas reiniciar el historial a los datos de fábrica?')) {
      setMatches(INITIAL_MATCHES);
      showToast('Historial reiniciado.');
    }
  };

  // Export JSON
  const handleExportData = () => {
    const payload = {
      exportDate: new Date().toISOString(),
      clubTheme,
      matches,
      playerProfiles
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `padelstats_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Datos exportados en archivo JSON.');
  };

  // Import JSON
  const handleImportData = async (data: any) => {
    if (!requireAdminCheck('importar copias de seguridad')) return;

    try {
      if (Array.isArray(data)) {
        setMatches(data);
        for (const m of data) {
          await saveMatchToFirestore(m).catch(console.error);
        }
      } else if (data.matches && Array.isArray(data.matches)) {
        setMatches(data.matches);
        for (const m of data.matches) {
          await saveMatchToFirestore(m).catch(console.error);
        }
        if (data.playerProfiles && Array.isArray(data.playerProfiles)) {
          setPlayerProfiles(data.playerProfiles);
          saveStoredPlayerProfiles(data.playerProfiles);
          for (const p of data.playerProfiles) {
            await savePlayerProfileToFirestore(p).catch(console.error);
          }
        }
        if (data.clubTheme) {
          setClubTheme(data.clubTheme);
          await saveClubThemeToFirestore(data.clubTheme).catch(console.error);
        }
      }
      showToast('¡Datos importados y sincronizados con éxito!');
    } catch (e) {
      console.error(e);
      showToast('Error al importar el archivo JSON.');
    }
  };

  // Import single match
  const handleImportSingleMatch = async (match: PadelMatch) => {
    if (!requireAdminCheck('importar partidos')) return;
    setMatches((prev) => [match, ...prev]);
    try {
      await saveMatchToFirestore(match);
      showToast(`☁️ Partido "${match.title}" importado y subido a la nube.`);
    } catch (e) {
      console.error(e);
      showToast(`Partido "${match.title}" importado con éxito.`);
    }
  };

  // Save club theme handler
  const handleSaveClubTheme = async (updated: ClubThemeConfig) => {
    if (!requireAdminCheck('personalizar el club y fotos')) return;
    setClubTheme(updated);
    try {
      await saveClubThemeToFirestore(updated);
      showToast('☁️ Fotos y estilo del club guardados en la nube.');
    } catch (e) {
      console.error(e);
      showToast('Configuración guardada localmente.');
    }
  };

  // Active profile matching current session
  const activeProfile = playerProfiles.find(
    p => p.name.toLowerCase() === currentSession.playerName?.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-16 relative overflow-x-hidden selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Background Court Texture / Glow */}
      {clubTheme.customBackgroundUrl ? (
        <div
          className="fixed inset-0 pointer-events-none bg-cover bg-center transition-opacity duration-500"
          style={{
            backgroundImage: `url(${clubTheme.customBackgroundUrl})`,
            opacity: (clubTheme.backgroundOpacity ?? 20) / 100
          }}
        />
      ) : (
        clubTheme.courtGlow && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/4 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px]" />
            <div className="absolute top-1/3 right-1/4 w-[600px] h-[400px] bg-teal-500/5 rounded-full blur-[150px]" />
            <div className="absolute -bottom-10 left-1/3 w-[800px] h-[350px] bg-cyan-500/5 rounded-full blur-[160px]" />
          </div>
        )
      )}

      {/* TOP HEADER WITH MOBILE HAMBURGER & QUICK ACTIONS */}
      <header className="sticky top-0 z-40 bg-[#0a101f]/95 backdrop-blur-md border-b border-slate-800/80 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          
          {/* Left: Hamburger Menu Button + Club Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-2 transition cursor-pointer shadow-sm active:scale-95"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-5 h-5 stroke-[2.5]" />
              <span className="hidden sm:inline text-xs font-black uppercase tracking-wider">
                Menú
              </span>
            </button>

            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2 text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-xs">
                  🎾
                </div>
              </div>
              <div className="leading-tight">
                <span className="text-xs sm:text-sm font-black text-white tracking-tight block truncate max-w-[140px] sm:max-w-[200px]">
                  {clubTheme.clubName || 'PadelStats'}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold block">
                  {activeTab === 'home' && 'Inicio'}
                  {activeTab === 'my-profile' && `Mi Perfil (${currentSession.playerName || 'Invitado'})`}
                  {activeTab === 'players' && 'Jugadores'}
                  {activeTab === 'history' && 'Historial'}
                  {activeTab === 'charts' && 'Gráficos'}
                  {activeTab === 'qa' && 'Preguntas IA'}
                  {activeTab === 'roasts' && 'Modo Guasa'}
                  {activeTab === 'youtube' && 'Anotador'}
                </span>
              </div>
            </button>
          </div>

          {/* Right: User Status Chip & Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Cloud Sync Button */}
            <button
              onClick={handleForceSyncCloud}
              disabled={isCloudSyncing}
              className="px-2.5 sm:px-3 py-1.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              title="Sincronizar todos los datos y partidos con la base de datos en la nube"
            >
              <span className={isCloudSyncing ? 'animate-spin' : ''}>☁️</span>
              <span className="hidden md:inline font-bold">
                {isCloudSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </span>
            </button>
            
            {/* User Session Pill */}
            <button
              onClick={() => setIsUserAuthModalOpen(true)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition border cursor-pointer ${
                currentSession.playerName
                  ? 'bg-slate-900/90 border-slate-700/90 text-white hover:border-emerald-500/50'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              }`}
              title="Toca para cambiar de jugador o iniciar sesión con Google"
            >
              {activeProfile?.avatarUrl ? (
                <img
                  src={activeProfile.avatarUrl}
                  alt={currentSession.playerName}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                  style={{ backgroundColor: activeProfile?.avatarColor || '#10b981' }}
                >
                  {currentSession.playerName ? currentSession.playerName.charAt(0) : '👤'}
                </div>
              )}
              
              <span className="text-xs font-bold truncate max-w-[90px] sm:max-w-[120px]">
                {currentSession.playerName || 'Iniciar Sesión'}
              </span>

              {isAdmin && (
                <span className="hidden sm:inline px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black rounded-md">
                  ADMIN
                </span>
              )}
            </button>

            {/* Quick New Match Button */}
            <button
              onClick={() => {
                if (requireAdminCheck('crear un nuevo partido')) {
                  setIsNewMatchModalOpen(true);
                }
              }}
              className="p-1.5 sm:px-3 sm:py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
              title="Registrar nuevo partido"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Nuevo Partido</span>
            </button>

          </div>

        </div>
      </header>

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500/60 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-4 sm:mt-6">
        
        {/* 1. INICIO (Home Dashboard) */}
        {activeTab === 'home' && (
          <HomeDashboard
            clubTheme={clubTheme}
            matches={matches}
            playerHistories={playerHistories}
            playerProfiles={playerProfiles}
            currentSession={currentSession}
            isAdmin={isAdmin}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onInspectMatch={(m) => setInspectMatch(m)}
            onSelectPlayerForDetail={(pName) => {
              setSelectedPlayer(pName);
              setActiveTab('players');
            }}
            onOpenNewMatchModal={() => {
              if (requireAdminCheck('crear un nuevo partido')) {
                setIsNewMatchModalOpen(true);
              }
            }}
            onOpenClubThemeModal={() => {
              if (requireAdminCheck('personalizar el club y fotos')) {
                setIsClubThemeModalOpen(true);
              }
            }}
          />
        )}

        {/* 2. MI PERFIL (Personalized active player view) */}
        {activeTab === 'my-profile' && (
          <MyProfileView
            currentSession={currentSession}
            playerProfiles={playerProfiles}
            playerHistories={playerHistories}
            matches={matches}
            onSaveProfile={handleSaveProfile}
            onOpenAuthModal={() => setIsUserAuthModalOpen(true)}
            onInspectMatch={(m) => setInspectMatch(m)}
          />
        )}

        {/* 3. JUGADORES (Dropdown selector & player dossiers) */}
        {activeTab === 'players' && (
          <PlayersExplorer
            playerProfiles={playerProfiles}
            playerHistories={playerHistories}
            matches={matches}
            selectedPlayerName={selectedPlayer}
            onSelectPlayer={(pName) => setSelectedPlayer(pName)}
            onSaveProfile={handleSaveProfile}
            onDeleteProfile={handleDeleteProfile}
            isAdmin={isAdmin}
            onInspectMatch={(m) => setInspectMatch(m)}
          />
        )}

        {/* 4. HISTORIAL DE PARTIDOS */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <MatchHistoryList
              matches={matches}
              isAdmin={isAdmin}
              onSelectMatch={(m) => setInspectMatch(m)}
              onResumeMatch={handleResumeMatch}
              onUpdateMatch={handleUpdateMatch}
              onDeleteMatch={handleDeleteMatch}
              onResetToDefault={handleResetMatches}
              onExportData={handleExportData}
              onImportData={handleImportData}
              onImportSingleMatch={handleImportSingleMatch}
            />
          </div>
        )}

        {/* 5. ESTADÍSTICAS & GRÁFICOS */}
        {activeTab === 'charts' && (
          <div className="space-y-6">
            <EvolutionCharts
              matches={matches}
              playerHistories={Object.values(playerHistories)}
              selectedPlayerName={selectedPlayer}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
            />

            <HistoricalTable
              playerHistories={Object.values(playerHistories)}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
            />
          </div>
        )}

        {/* 6. PREGUNTAS IA (Gemini Padel Assistant) */}
        {activeTab === 'qa' && (
          <div className="space-y-6">
            <StatsQAAssistant
              matches={matches}
              playerHistories={Object.values(playerHistories)}
              onSelectPlayerForCharts={(playerName) => {
                setSelectedPlayer(playerName);
                setActiveTab('charts');
              }}
            />
          </div>
        )}

        {/* 7. MODO GUASA & CONCLUSIONES TÁCTICAS */}
        {activeTab === 'roasts' && (
          <div className="space-y-6">
            <IronicPlayerRoasts playerHistories={Object.values(playerHistories)} />
            <GroupTacticalInsights playerHistories={Object.values(playerHistories)} />
          </div>
        )}

        {/* 8. ANOTADOR EN VIVO / YOUTUBE & AUDIO */}
        {activeTab === 'youtube' && (
          <div className="space-y-6">
            <YouTubeVideoStudio
              knownPlayers={knownPlayers}
              profiles={playerProfiles}
              onSaveNewProfile={handleSaveProfile}
              allMatches={matches}
              matchToResume={matchToResume}
              onClearResumeMatch={() => setMatchToResume(null)}
              onAnalysisComplete={handleAudioAnalysisComplete}
              onSaveDirectMatch={handleSaveMatch}
            />

            {/* Pending analysis review card */}
            {pendingAnalysis && (
              <MatchSummaryCard
                analysisData={pendingAnalysis}
                onSaveToHistory={handleSaveMatch}
                onDiscard={() => setPendingAnalysis(null)}
              />
            )}
          </div>
        )}
      </main>

      {/* SIDEBAR DRAWER MENU */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        currentSession={currentSession}
        playerProfiles={playerProfiles}
        clubTheme={clubTheme}
        totalMatches={matches.length}
        isAdmin={isAdmin}
        onOpenAuthModal={() => setIsUserAuthModalOpen(true)}
        onOpenClubThemeModal={() => {
          if (requireAdminCheck('personalizar imágenes y fotos del club')) {
            setIsClubThemeModalOpen(true);
          }
        }}
        onOpenNewMatchModal={() => {
          if (requireAdminCheck('crear un nuevo partido')) {
            setIsNewMatchModalOpen(true);
          }
        }}
        onForceSyncCloud={handleForceSyncCloud}
      />

      {/* USER AUTH & PLAYER SELECTION MODAL */}
      <UserAuthModal
        isOpen={isUserAuthModalOpen}
        onClose={() => setIsUserAuthModalOpen(false)}
        currentSession={currentSession}
        playerProfiles={playerProfiles}
        onSelectPlayerSession={(session) => {
          setCurrentSession(session);
          if (session.isAdmin) {
            setIsAdmin(true);
            setIsAdminSession(true);
          }
          showToast(`¡Bienvenido, ${session.playerName || session.displayName}!`);
        }}
      />

      {/* Match Detail Modal */}
      <MatchDetailModal
        match={inspectMatch}
        onClose={() => setInspectMatch(null)}
        onResumeMatch={handleResumeMatch}
        onUpdateMatch={handleUpdateMatch}
      />

      {/* Manual New Match Modal */}
      <NewMatchModal
        isOpen={isNewMatchModalOpen}
        onClose={() => setIsNewMatchModalOpen(false)}
        onSaveMatch={(newM) => {
          handleSaveMatch(newM);
        }}
        knownPlayers={knownPlayers}
        profiles={playerProfiles}
        onSaveNewProfile={handleSaveProfile}
      />

      {/* Club Theme & Group Photos Customization Modal */}
      <ClubThemeModal
        isOpen={isClubThemeModalOpen}
        config={clubTheme}
        onSave={handleSaveClubTheme}
        onClose={() => setIsClubThemeModalOpen(false)}
      />

      {/* Admin Authentication & Permissions Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        isAdmin={isAdmin}
        onLoginAsAdmin={handleLoginAsAdmin}
        onLogoutAdmin={handleLogoutAdmin}
      />

    </div>
  );
}
