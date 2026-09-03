export interface PlayerProfile {
  id: string;
  name: string; // Nombre canónico y sin errores ortográficos
  nickname?: string;
  avatarColor: string; // Color hexadecimal distintivo
  avatarUrl?: string; // Foto de perfil personalizada (URL o base64)
  coverUrl?: string; // Portada personalizada
  preferredSide: 'drive' | 'reves' | 'ambos'; // Posición habitual en la pista
  dominantHand: 'diestro' | 'zurdo'; // Mano hábil
  notes?: string;
  createdAt: string;
}

export interface ClubThemeConfig {
  clubName: string;
  clubTagline: string;
  bannerImageUrl?: string;
  customBackgroundUrl?: string;
  backgroundOpacity: number; // 0 a 100
  courtGlow: boolean;
  neonTheme: 'emerald' | 'cyan' | 'amber' | 'purple' | 'red';
}

export interface PlayerStats {
  touches: number;            // Toques de bola
  forcedErrors: number;       // Errores forzados
  unforcedErrors: number;     // Errores no forzados
  winners: number;            // Puntos ganadores / Winners
  shotBreakdown?: {
    remates?: number;
    voleas?: number;
    bandejas?: number;
    bajadasPared?: number;
    globos?: number;
    dejadas?: number;
  };
}

export interface MatchPointAction {
  id?: string;
  timeSec?: number;
  player: string;
  type: 'touch' | 'forced_error' | 'unforced_error' | 'winner';
  shotType?: string;
  description: string;
  forcedByPlayer?: string;
}

export interface PointRally {
  id: string;
  pointNumber?: number;
  timeSec?: number;
  videoTimeSec?: number;
  scoreText?: string;
  scoreSnapshotText?: string;
  servingPlayer?: string;
  touchOrder: string[]; // Order of player touches in this point: e.g. ['Mikel', 'Dani', 'Mikel', 'Ortega']
  rallyLength: number; // total touches
  endingAction: 'winner' | 'forced_error' | 'unforced_error' | 'direct_point';
  scoringTeam?: 1 | 2;
  pointWinnerTeam?: 1 | 2;
  pointWinnerPlayer?: string; // Player who scored
  forcedByPlayer?: string; // Player who pressured/caused the error
  forcedOnPlayer?: string; // Player who suffered/made the forced error
  unforcedErrorPlayer?: string;
  description?: string;
  
  // Specific match score & set context
  setNumber?: number; // 1, 2, 3...
  gamesContext?: string; // e.g. "3-0"
  pointsContext?: string; // e.g. "40-40" / "Punto de Oro" / "Tie-break 4-3"
  scoreContextDescription?: string; // e.g. "40-40 yendo 3-0 en el 1º set"
  matchTitle?: string;
  matchDate?: string;
}

export interface ForcedErrorMatchup {
  forcingPlayer: string;
  forcedPlayer: string;
  count: number;
}

export interface MatchRallyAnalytics {
  totalPoints: number;
  longestRally: PointRally | null;
  topLongestRallies: PointRally[];
  avgTouchesPerPoint: number;
  forcedErrorsMatrix: Record<string, Record<string, number>>; // [forcingPlayer][forcedPlayer] = count
  topForcingPlayers: Array<{
    player: string;
    totalForced: number;
    primaryVictim: string;
    countAgainstVictim: number;
    victimBreakdown: Record<string, number>;
  }>;
  rallyLengthDistribution: {
    short: number; // 1-3 touches
    medium: number; // 4-7 touches
    long: number; // 8+ touches
  };
}

export interface AudioNote {
  id: string;
  audioName?: string;
  timestamp: string;
  durationSec?: number;
  transcription: string;
  detectedStats: Record<string, PlayerStats>;
  summarySnippet?: string;
}

export interface PadelMatch {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  court?: string;
  team1: {
    name: string;
    player1: string;
    player2: string;
    score?: string; // e.g. "6 4 7"
  };
  team2: {
    name: string;
    player1: string;
    player2: string;
    score?: string; // e.g. "4 6 6"
  };
  setsScore: string; // e.g. "6-4, 4-6, 7-6"
  winnerTeam?: 1 | 2;
  stats: Record<string, PlayerStats>; // Key: player name
  pointEvents?: MatchPointAction[];
  pointRallies?: PointRally[];
  audioNotes?: AudioNote[];
  summary: string;
  highlights: string[];
  mvp: string;
  tacticalNotes?: string;
  youtubeUrl?: string;
  youtubeTimestamp?: number;
  youtubeRotation?: number; // 0, 90, 180, 270 degrees
  youtubeMirror?: boolean;
  youtubeZoom?: number; // scale multiplier e.g. 1, 1.25, etc.
  isCompleted?: boolean;
  inProgressScoreboard?: LiveScoreboardState;
}

export interface LiveScoreboardState {
  team1: {
    player1: string;
    player2: string;
    sets: number[]; // e.g. [6, 3, 2]
    currentGames: number;
    currentPoints: '0' | '15' | '30' | '40' | 'AD' | number;
  };
  team2: {
    player1: string;
    player2: string;
    sets: number[];
    currentGames: number;
    currentPoints: '0' | '15' | '30' | '40' | 'AD' | number;
  };
  currentSet: number; // 0, 1, 2 (Set 1, Set 2, Set 3)
  isTieBreak: boolean;
  tieBreakPoints?: { team1: number; team2: number };
  goldenPoint: boolean; // Punto de Oro at 40-40
  servingTeam: 1 | 2;
  servingPlayer: string;
  isFinished: boolean;
  winnerTeam?: 1 | 2;
  matchDurationSec: number;
  pointsHistory: {
    id: string;
    timeSec: number;
    scoringTeam: 1 | 2;
    attributedPlayer?: string;
    actionType: 'winner' | 'unforced_error' | 'forced_error' | 'direct_point';
    scoreText: string;
    touchOrder?: string[];
    rallyLength?: number;
    forcedByPlayer?: string;
    forcedOnPlayer?: string;
  }[];
}

export interface PlayerTimelineEntry {
  matchId: string;
  matchDate: string;
  matchTitle: string;
  touches: number;
  forcedErrors: number;
  unforcedErrors: number;
  winners: number;
  netScore: number;
  won: boolean;
  unforcedErrorPerTouchPct: number; // (unforcedErrors / touches) * 100
  touchesPerUnforcedError: number; // touches / (unforcedErrors || 1)
  progressionDeltaPct?: number; // difference in % vs previous match (negative means improvement/fewer errors)
}

export interface PlayerHistorySummary {
  name: string;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number; // percentage 0-100
  totalTouches: number;
  avgTouches: number;
  totalForcedErrors: number;
  avgForcedErrors: number;
  totalUnforcedErrors: number;
  avgUnforcedErrors: number;
  totalWinners: number;
  avgWinners: number;
  winnerToUnforcedRatio: number; // Winners / (UnforcedErrors || 1)
  netDifferential: number; // Winners - UnforcedErrors
  unforcedErrorPerTouchPct: number; // (totalUnforcedErrors / totalTouches) * 100
  touchesPerUnforcedError: number; // totalTouches / (totalUnforcedErrors || 1)
  bestUnforcedErrorPerTouchPct: number; // Lowest % ENF/toque achieved in a match
  latestUnforcedErrorPerTouchPct: number; // % ENF/toque in the latest match
  unforcedErrorTrend: 'improving' | 'worsening' | 'stable';
  timeline: PlayerTimelineEntry[];
}

export interface PlayerTacticalProfile {
  name: string;
  archetype: string;
  archetypeTagline: string;
  overallRating: number; // 0-99
  strengths: string[];
  weaknesses: string[];
  tacticalAdvice: string;
  recommendedPartner: string;
  partnerSynergyReason: string;
  radarScores: {
    attack: number;     // 0-100
    defense: number;    // 0-100
    consistency: number;// 0-100
    volume: number;     // 0-100
    clutch: number;     // 0-100
  };
  coachVerdict: string;
}

export interface PlayerIronicRoast {
  name: string;
  comicArchetype: string;
  roastSummary: string;
  signatureExcuse: string;
  absurdAward: string;
  ironicTip: string;
  dangerLevelOnGlass: string;
  postMatchRitual: string;
}

export interface MatchNarrativeChronicle {
  matchId: string;
  headline: string;
  subheadline: string;
  fullStory: string;
  keyTurningPoint: string;
  postMatchQuotes: { speaker: string; quote: string }[];
  whatsappShareText: string;
}

export interface StatsQAMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedQuestions?: string[];
  highlightedStats?: Array<{
    label: string;
    value: string;
    badge?: string;
  }>;
}

export interface StatsQAResponse {
  answer: string;
  suggestedQuestions?: string[];
  highlightedStats?: Array<{
    label: string;
    value: string;
    badge?: string;
  }>;
}

