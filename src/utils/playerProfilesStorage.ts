import { PlayerProfile, PadelMatch } from '../types';
import { getPlayerColor } from './statsCalculator';

export const PROFILES_STORAGE_KEY = 'padelstats_player_profiles_v2';

export const PROFILE_COLOR_PRESETS = [
  { name: 'Esmeralda', hex: '#10B981', ring: 'ring-emerald-500', bg: 'bg-emerald-500' },
  { name: 'Cian', hex: '#06B6D4', ring: 'ring-cyan-500', bg: 'bg-cyan-500' },
  { name: 'Azul', hex: '#3B82F6', ring: 'ring-blue-500', bg: 'bg-blue-500' },
  { name: 'Púrpura', hex: '#8B5CF6', ring: 'ring-purple-500', bg: 'bg-purple-500' },
  { name: 'Rosa', hex: '#EC4899', ring: 'ring-pink-500', bg: 'bg-pink-500' },
  { name: 'Ámbar', hex: '#F59E0B', ring: 'ring-amber-500', bg: 'bg-amber-500' },
  { name: 'Naranja', hex: '#F97316', ring: 'ring-orange-500', bg: 'bg-orange-500' },
  { name: 'Lima', hex: '#84CC16', ring: 'ring-lime-500', bg: 'bg-lime-500' },
  { name: 'Teal', hex: '#14B8A6', ring: 'ring-teal-500', bg: 'bg-teal-500' },
  { name: 'Rojo Carmesí', hex: '#EF4444', ring: 'ring-red-500', bg: 'bg-red-500' },
];

export const DEFAULT_PROFILES: PlayerProfile[] = [
  {
    id: 'profile-alvaro',
    name: 'Álvaro',
    nickname: 'El Muro / Admin',
    avatarColor: '#10B981',
    preferredSide: 'reves',
    dominantHand: 'diestro',
    notes: 'Gran solidez defensiva, control de fondo y bajada de pared letal.',
    createdAt: '2026-01-01'
  },
  {
    id: 'profile-marcos',
    name: 'Marcos',
    nickname: 'El Estratega',
    avatarColor: '#F59E0B',
    preferredSide: 'drive',
    dominantHand: 'diestro',
    notes: 'Lectura de juego, chiquitas milimétricas y aceleración de bola.',
    createdAt: '2026-01-01'
  },
  {
    id: 'profile-mikel',
    name: 'Mikel',
    nickname: 'El Cañonero',
    avatarColor: '#3B82F6',
    preferredSide: 'reves',
    dominantHand: 'diestro',
    notes: 'Potencia aérea en el remate por tres y agresividad en la red.',
    createdAt: '2026-01-01'
  },
  {
    id: 'profile-nico',
    name: 'Nico',
    nickname: 'El Rayo',
    avatarColor: '#8B5CF6',
    preferredSide: 'drive',
    dominantHand: 'diestro',
    notes: 'Velocidad en transiciones defensivas, reflejos y voleas profundas.',
    createdAt: '2026-01-01'
  },
  {
    id: 'profile-victor',
    name: 'Víctor',
    nickname: 'El Mago',
    avatarColor: '#EC4899',
    preferredSide: 'ambos',
    dominantHand: 'diestro',
    notes: 'Toques de calidad, dejadas impredecibles y salida de pared limpia.',
    createdAt: '2026-01-01'
  }
];

export const ACTIVE_USER_STORAGE_KEY = 'padelstats_active_user_v2';

export interface ActiveUserSession {
  type: 'google' | 'player' | 'guest';
  playerName?: string;
  email?: string;
  photoUrl?: string;
  displayName?: string;
  isAdmin?: boolean;
}

export function loadActiveUserSession(): ActiveUserSession {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading active user session:', e);
  }
  return { type: 'guest', playerName: undefined, isAdmin: false };
}

export function saveActiveUserSession(session: ActiveUserSession): void {
  try {
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Error saving active user session:', e);
  }
}

export const loadStoredPlayerProfiles = loadSavedPlayerProfiles;
export const saveStoredPlayerProfiles = savePlayerProfilesToStorage;
export function loadSavedPlayerProfiles(): PlayerProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading player profiles from storage:', e);
  }
  return DEFAULT_PROFILES;
}

/**
 * Saves profiles to localStorage
 */
export function savePlayerProfilesToStorage(profiles: PlayerProfile[]): void {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error('Error writing player profiles to storage:', e);
  }
}

/**
 * Ensures any player found in matches has a corresponding PlayerProfile object.
 * If not, creates one automatically with their computed color and default side.
 */
export function syncProfilesWithMatches(existingProfiles: PlayerProfile[], matches: PadelMatch[]): PlayerProfile[] {
  const profileMap = new Map<string, PlayerProfile>();
  
  // Add current profiles to map
  existingProfiles.forEach(p => {
    profileMap.set(p.name.trim().toLowerCase(), p);
  });

  // Extract all player names who actively participated in matches
  const matchPlayers = new Set<string>();
  matches.forEach(m => {
    const declared = [m.team1?.player1, m.team1?.player2, m.team2?.player1, m.team2?.player2].filter(Boolean) as string[];
    if (declared.length > 0) {
      declared.forEach(p => matchPlayers.add(p.trim()));
    } else if (m.stats) {
      Object.keys(m.stats).forEach(pName => {
        const s = m.stats[pName];
        if (s && (s.touches > 0 || s.forcedErrors > 0 || s.unforcedErrors > 0 || s.winners > 0)) {
          matchPlayers.add(pName.trim());
        }
      });
    }
  });

  // For any missing player, generate a clean profile
  let hasNew = false;
  matchPlayers.forEach(pName => {
    if (!pName) return;
    const lower = pName.toLowerCase();
    if (!profileMap.has(lower)) {
      const newProf: PlayerProfile = {
        id: `profile-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: pName,
        avatarColor: getPlayerColor(pName),
        preferredSide: 'ambos',
        dominantHand: 'diestro',
        createdAt: new Date().toISOString().split('T')[0]
      };
      profileMap.set(lower, newProf);
      hasNew = true;
    }
  });

  const merged = Array.from(profileMap.values());
  if (hasNew) {
    savePlayerProfilesToStorage(merged);
  }
  return merged;
}

/**
 * Formats side label in Spanish
 */
export function getSideLabel(side: 'drive' | 'reves' | 'ambos'): string {
  switch (side) {
    case 'drive': return 'Drive';
    case 'reves': return 'Revés';
    case 'ambos': return 'Ambos / Polivalente';
  }
}

/**
 * Formats side badge class
 */
export function getSideBadgeClass(side: 'drive' | 'reves' | 'ambos'): string {
  switch (side) {
    case 'drive': return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
    case 'reves': return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
    case 'ambos': return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
  }
}
