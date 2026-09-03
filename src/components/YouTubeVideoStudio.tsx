import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Youtube,
  Play,
  Pause,
  Square,
  Mic,
  MicOff,
  Sparkles,
  RotateCcw,
  Undo2,
  CheckCircle2,
  Plus,
  Minus,
  Activity,
  Zap,
  AlertTriangle,
  Trophy,
  Volume2,
  Keyboard,
  ListPlus,
  ExternalLink,
  ChevronRight,
  Info,
  Loader2,
  Film,
  Save,
  Clock,
  Check,
  Flame,
  ArrowRight,
  ShieldAlert,
  Users,
  ChevronDown
} from 'lucide-react';
import { PadelMatch, PlayerStats, LiveScoreboardState, PointRally, PlayerProfile } from '../types';
import { getPlayerColor } from '../utils/statsCalculator';
import { parseSpeechPadel } from '../utils/speechPadelParser';
import { playPointSound } from '../utils/soundEffects';
import { RotatableYouTubePlayer } from './RotatableYouTubePlayer';
import { MatchLineupSelector, MatchLineup } from './MatchLineupSelector';

interface YouTubeVideoStudioProps {
  knownPlayers: string[];
  profiles?: PlayerProfile[];
  onSaveNewProfile?: (profile: PlayerProfile) => void;
  allMatches?: PadelMatch[];
  matchToResume?: PadelMatch | null;
  onClearResumeMatch?: () => void;
  onAnalysisComplete: (result: {
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
  }) => void;
  onSaveDirectMatch: (match: PadelMatch) => void;
}

// Sample YouTube Padel videos for quick loading
const SAMPLE_PADEL_VIDEOS = [
  {
    title: 'Punto épico y largo de pádel (Premier)',
    url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    id: 'ScMzIvxBSi4',
    description: 'Ideal para probar el conteo de toques, winners y errores forzados en jugadas largas.',
  },
  {
    title: 'Premier Padel - Mejores Puntos y Remates x3',
    url: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
    id: 'L_LUpnjgPso',
    description: 'Puntos intensos con voleas, bajadas de pared y remates ganadores.',
  }
];

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

const POINT_LEVELS: Array<'0' | '15' | '30' | '40' | 'AD'> = ['0', '15', '30', '40', 'AD'];

export const YouTubeVideoStudio: React.FC<YouTubeVideoStudioProps> = ({
  knownPlayers,
  profiles = [],
  onSaveNewProfile,
  allMatches = [],
  matchToResume = null,
  onClearResumeMatch,
  onAnalysisComplete,
  onSaveDirectMatch
}) => {
  // Active Match ID (if resuming or continuing)
  const [currentMatchId, setCurrentMatchId] = useState<string>(() => matchToResume?.id || `match-${Date.now()}`);
  const [matchTitle, setMatchTitle] = useState<string>(() => matchToResume?.title || 'Partido de Pádel (Vídeo YouTube + Voz)');
  const [matchDate, setMatchDate] = useState<string>(() => matchToResume?.date || new Date().toISOString().split('T')[0]);
  const [matchCourt, setMatchCourt] = useState<string>(() => matchToResume?.court || 'Pista Central');

  // Lineup selection modal state
  const [isLineupModalOpen, setIsLineupModalOpen] = useState<boolean>(false);

  // Video URL State
  const [videoUrlInput, setVideoUrlInput] = useState<string>(() => matchToResume?.youtubeUrl || 'https://www.youtube.com/watch?v=ScMzIvxBSi4');
  const [activeVideoId, setActiveVideoId] = useState<string>(() => {
    if (matchToResume?.youtubeUrl) {
      return extractYouTubeVideoId(matchToResume.youtubeUrl) || 'ScMzIvxBSi4';
    }
    return 'ScMzIvxBSi4';
  });
  const [iframeStartOffset, setIframeStartOffset] = useState<number>(() => matchToResume?.youtubeTimestamp || 0);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(() => matchToResume?.youtubeTimestamp || 0);
  const [isPlayingTimer, setIsPlayingTimer] = useState<boolean>(false);

  // Teams & Players Setup
  const [team1P1, setTeam1P1] = useState<string>(() => matchToResume?.team1?.player1 || knownPlayers[0] || 'Álvaro');
  const [team1P2, setTeam1P2] = useState<string>(() => matchToResume?.team1?.player2 || knownPlayers[1] || 'Víctor');
  const [team2P1, setTeam2P1] = useState<string>(() => matchToResume?.team2?.player1 || knownPlayers[2] || 'Marcos');
  const [team2P2, setTeam2P2] = useState<string>(() => matchToResume?.team2?.player2 || knownPlayers[3] || 'Mikel');

  const allPlayers = [team1P1, team1P2, team2P1, team2P2];
  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState<number>(0);
  const activePlayerName = allPlayers[selectedPlayerIdx] || team1P1;

  // Live Scoreboard State (Sets, Games, Points, Tiebreak, Server)
  const [team1Sets, setTeam1Sets] = useState<number[]>(() => matchToResume?.inProgressScoreboard?.team1?.sets || []);
  const [team2Sets, setTeam2Sets] = useState<number[]>(() => matchToResume?.inProgressScoreboard?.team2?.sets || []);
  const [team1Games, setTeam1Games] = useState<number>(() => matchToResume?.inProgressScoreboard?.team1?.currentGames || 0);
  const [team2Games, setTeam2Games] = useState<number>(() => matchToResume?.inProgressScoreboard?.team2?.currentGames || 0);
  const [team1Points, setTeam1Points] = useState<'0' | '15' | '30' | '40' | 'AD' | number>(() => matchToResume?.inProgressScoreboard?.team1?.currentPoints || '0');
  const [team2Points, setTeam2Points] = useState<'0' | '15' | '30' | '40' | 'AD' | number>(() => matchToResume?.inProgressScoreboard?.team2?.currentPoints || '0');
  const [isTiebreak, setIsTiebreak] = useState<boolean>(() => matchToResume?.inProgressScoreboard?.isTieBreak || false);
  const [tiebreakPoints, setTiebreakPoints] = useState<{ team1: number; team2: number }>(() => matchToResume?.inProgressScoreboard?.tieBreakPoints || { team1: 0, team2: 0 });
  const [goldenPoint, setGoldenPoint] = useState<boolean>(() => matchToResume?.inProgressScoreboard?.goldenPoint ?? false);
  const [servingTeam, setServingTeam] = useState<1 | 2>(() => matchToResume?.inProgressScoreboard?.servingTeam || 1);
  const [servingPlayer, setServingPlayer] = useState<string>(() => matchToResume?.inProgressScoreboard?.servingPlayer || team1P1);

  // Match Format Configuration (Best of 3 [wins with 2 sets], Best of 1, Best of 5, Unlimited)
  const [matchFormat, setMatchFormat] = useState<'best_of_3' | 'best_of_1' | 'best_of_5' | 'unlimited'>('best_of_3');
  const [isMatchFinished, setIsMatchFinished] = useState<boolean>(() => matchToResume?.isCompleted ?? false);
  const [matchWinnerTeam, setMatchWinnerTeam] = useState<1 | 2 | undefined>(() => matchToResume?.winnerTeam);

  // Helper to determine sets needed to win the match
  const getSetsNeededToWin = (format: 'best_of_3' | 'best_of_1' | 'best_of_5' | 'unlimited'): number => {
    if (format === 'best_of_1') return 1;
    if (format === 'best_of_3') return 2;
    if (format === 'best_of_5') return 3;
    return 999; // unlimited
  };

  // Cumulative Individual Player Stats
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>(() => {
    if (matchToResume?.stats && Object.keys(matchToResume.stats).length > 0) {
      return matchToResume.stats;
    }
    return {
      [team1P1]: { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 },
      [team1P2]: { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 },
      [team2P1]: { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 },
      [team2P2]: { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 },
    };
  });

  // Active Rally Sequence Tracking (Order of touches in the ongoing point)
  const [currentRallyTouches, setCurrentRallyTouches] = useState<string[]>([]);
  // Completed Point Rallies History
  const [pointRallies, setPointRallies] = useState<PointRally[]>(() => matchToResume?.pointRallies || []);

  // Action / Point History Log for Undo & Timeline
  const [historyTimeline, setHistoryTimeline] = useState<Array<{
    id: string;
    videoTimeSec: number;
    scoringTeam?: 1 | 2;
    player?: string;
    actionType: 'winner' | 'unforced_error' | 'forced_error' | 'touch' | 'direct';
    description: string;
    scoreSnapshot: {
      team1Sets: number[];
      team2Sets: number[];
      team1Games: number;
      team2Games: number;
      team1Points: any;
      team2Points: any;
      isTiebreak: boolean;
      tiebreakPoints: { team1: number; team2: number };
      goldenPoint?: boolean;
      servingTeam: 1 | 2;
      servingPlayer: string;
      isMatchFinished: boolean;
      matchWinnerTeam?: 1 | 2;
      matchFormat: 'best_of_3' | 'best_of_1' | 'best_of_5' | 'unlimited';
      statsSnapshot: Record<string, PlayerStats>;
      ralliesSnapshot?: PointRally[];
      currentRallyTouchesSnapshot?: string[];
    };
  }>>([]);

  // Voice Listening State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [recentActionText, setRecentActionText] = useState<string>('Listo para anotar con voz, atajos (1-4, J-K-L-Ñ) o clics.');
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Video rotation, mirror, and zoom settings
  const [videoRotation, setVideoRotation] = useState<number>(() => matchToResume?.youtubeRotation || 0);
  const [videoMirror, setVideoMirror] = useState<boolean>(() => matchToResume?.youtubeMirror || false);
  const [videoZoom, setVideoZoom] = useState<number>(() => matchToResume?.youtubeZoom || 1);

  // Settings & player iframe ref
  const recognitionRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoTimerRef = useRef<any>(null);

  // Filter in-progress matches from allMatches
  const inProgressMatches = allMatches.filter(m => m.isCompleted === false);

  // Sync when `matchToResume` changes from external trigger
  useEffect(() => {
    if (matchToResume) {
      setCurrentMatchId(matchToResume.id);
      setMatchTitle(matchToResume.title);
      setMatchDate(matchToResume.date);
      if (matchToResume.court) setMatchCourt(matchToResume.court);
      if (matchToResume.youtubeUrl) {
        setVideoUrlInput(matchToResume.youtubeUrl);
        const ytid = extractYouTubeVideoId(matchToResume.youtubeUrl);
        if (ytid) setActiveVideoId(ytid);
      }
      if (matchToResume.youtubeTimestamp !== undefined) {
        setCurrentVideoTime(matchToResume.youtubeTimestamp);
        setIframeStartOffset(matchToResume.youtubeTimestamp);
      }
      if (matchToResume.team1) {
        setTeam1P1(matchToResume.team1.player1);
        setTeam1P2(matchToResume.team1.player2);
      }
      if (matchToResume.team2) {
        setTeam2P1(matchToResume.team2.player1);
        setTeam2P2(matchToResume.team2.player2);
      }
      if (matchToResume.stats) {
        setPlayerStats(matchToResume.stats);
      }
      if (matchToResume.inProgressScoreboard) {
        const sc = matchToResume.inProgressScoreboard;
        setTeam1Sets(sc.team1.sets || []);
        setTeam2Sets(sc.team2.sets || []);
        setTeam1Games(sc.team1.currentGames || 0);
        setTeam2Games(sc.team2.currentGames || 0);
        setTeam1Points(sc.team1.currentPoints || '0');
        setTeam2Points(sc.team2.currentPoints || '0');
        setIsTiebreak(sc.isTieBreak || false);
        if (sc.tieBreakPoints) setTiebreakPoints(sc.tieBreakPoints);
        setServingTeam(sc.servingTeam || 1);
        if (sc.servingPlayer) setServingPlayer(sc.servingPlayer);
      }
      if (matchToResume.pointRallies && matchToResume.pointRallies.length > 0) {
        setPointRallies(matchToResume.pointRallies);
      }
      if (matchToResume.youtubeRotation !== undefined) {
        setVideoRotation(matchToResume.youtubeRotation);
      }
      if (matchToResume.youtubeMirror !== undefined) {
        setVideoMirror(matchToResume.youtubeMirror);
      }
      if (matchToResume.youtubeZoom !== undefined) {
        setVideoZoom(matchToResume.youtubeZoom);
      }
      setRecentActionText(`🔄 Partido "${matchToResume.title}" retomado con éxito. ¡Continúa donde lo dejaste!`);
    }
  }, [matchToResume]);

  // Video playback stopwatch timer (only ticks when isPlayingTimer is true, without modifying iframe URL)
  useEffect(() => {
    if (!isPlayingTimer) {
      if (videoTimerRef.current) clearInterval(videoTimerRef.current);
      return;
    }
    videoTimerRef.current = setInterval(() => {
      setCurrentVideoTime(prev => prev + 1);
    }, 1000);
    return () => {
      if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    };
  }, [isPlayingTimer]);

  // YouTube postMessage controls (play, pause, seek without iframe reload)
  const sendYouTubeCommand = useCallback((func: string, args: any[] = []) => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch (_) {}
  }, []);

  const handlePlayVideo = useCallback(() => {
    sendYouTubeCommand('playVideo');
    setIsPlayingTimer(true);
    setRecentActionText('▶️ Reproduciendo vídeo / Cronómetro activo');
  }, [sendYouTubeCommand]);

  const handlePauseVideo = useCallback(() => {
    sendYouTubeCommand('pauseVideo');
    setIsPlayingTimer(false);
    setRecentActionText('⏸️ Vídeo / Cronómetro pausado');
  }, [sendYouTubeCommand]);

  const handleSeek = useCallback((seconds: number) => {
    const target = Math.max(0, seconds);
    setCurrentVideoTime(target);
    sendYouTubeCommand('seekTo', [target, true]);
    setRecentActionText(`⏱️ Salto a ${Math.floor(target / 60).toString().padStart(2, '0')}:${Math.floor(target % 60).toString().padStart(2, '0')}`);
  }, [sendYouTubeCommand]);

  // Format seconds to mm:ss
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Switch Serving Player
  const handleToggleServe = useCallback(() => {
    setServingTeam(prev => {
      const nextTeam = prev === 1 ? 2 : 1;
      const nextPlayer = nextTeam === 1 ? team1P1 : team2P1;
      setServingPlayer(nextPlayer);
      setRecentActionText(`🎾 Turno de saque para Pareja ${nextTeam} (${nextPlayer})`);
      return nextTeam;
    });
  }, [team1P1, team2P1]);

  // Helper to find the opponent who hit the ball right before the victim's error
  const findOpponentForcer = useCallback((
    touches: string[],
    victim: string
  ): string => {
    const isVictimTeam1 = victim === team1P1 || victim === team1P2;
    const oppPlayers = isVictimTeam1 ? [team2P1, team2P2] : [team1P1, team1P2];
    for (let i = touches.length - 1; i >= 0; i--) {
      if (oppPlayers.includes(touches[i])) {
        return touches[i];
      }
    }
    return oppPlayers[0] || '';
  }, [team1P1, team1P2, team2P1, team2P2]);

  // Remove the last recorded touch from the ongoing rally
  const handleRemoveLastTouch = useCallback(() => {
    if (currentRallyTouches.length === 0) return;
    const lastPlayer = currentRallyTouches[currentRallyTouches.length - 1];
    setCurrentRallyTouches(prev => prev.slice(0, prev.length - 1));
    setPlayerStats(prev => {
      const cur = prev[lastPlayer] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
      return {
        ...prev,
        [lastPlayer]: {
          ...cur,
          touches: Math.max(0, cur.touches - 1)
        }
      };
    });
    setRecentActionText(`↩️ Eliminado último toque de ${lastPlayer} del peloteo actual.`);
  }, [currentRallyTouches]);

  // Clear current rally touches
  const handleClearCurrentRally = useCallback(() => {
    if (currentRallyTouches.length === 0) return;
    setCurrentRallyTouches([]);
    setRecentActionText('✖ Secuencia de peloteo actual reiniciada.');
  }, [currentRallyTouches]);

  // Record a touch (+1 touch to player, doesn't alter scoreboard score)
  const addTouch = useCallback((playerName: string, count = 1) => {
    // Snapshot for Undo before adding touch
    const snapshot = {
      team1Sets: [...team1Sets],
      team2Sets: [...team2Sets],
      team1Games,
      team2Games,
      team1Points,
      team2Points,
      isTiebreak,
      tiebreakPoints: { ...tiebreakPoints },
      goldenPoint,
      servingTeam,
      servingPlayer,
      isMatchFinished,
      matchWinnerTeam,
      matchFormat,
      statsSnapshot: JSON.parse(JSON.stringify(playerStats)),
      ralliesSnapshot: [...pointRallies],
      currentRallyTouchesSnapshot: [...currentRallyTouches]
    };

    setPlayerStats(prev => {
      const p = prev[playerName] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
      return {
        ...prev,
        [playerName]: {
          ...p,
          touches: p.touches + count
        }
      };
    });

    // Add to active rally sequence
    setCurrentRallyTouches(prev => [
      ...prev,
      ...Array(count).fill(playerName)
    ]);

    try {
      playPointSound('point');
    } catch (_) {}

    // Save touch action to history so "Deshacer" reverts the touch and restores individual player stats
    setHistoryTimeline(prev => [
      {
        id: `touch-${Date.now()}-${Math.random()}`,
        videoTimeSec: currentVideoTime,
        player: playerName,
        actionType: 'touch',
        description: `🎾 +${count} Toque de ${playerName} (Golpe #${currentRallyTouches.length + count})`,
        scoreSnapshot: snapshot
      },
      ...prev
    ]);

    setRecentActionText(`🎾 +${count} Toque para ${playerName} (Peloteo en curso: ${currentRallyTouches.length + count} golpes)`);
  }, [
    team1Sets,
    team2Sets,
    team1Games,
    team2Games,
    team1Points,
    team2Points,
    isTiebreak,
    tiebreakPoints,
    goldenPoint,
    servingTeam,
    servingPlayer,
    isMatchFinished,
    matchWinnerTeam,
    matchFormat,
    playerStats,
    pointRallies,
    currentRallyTouches,
    currentVideoTime
  ]);

  // Execute a multi-action speech rally atomically (touches + point/error)
  const executeRally = useCallback((actions: Array<{ player: string; type: 'touch' | 'winner' | 'unforced_error' | 'forced_error'; count?: number }>, rawTranscript: string) => {
    if (!actions || actions.length === 0) return;

    // Snapshot of current state before rally starts
    const snapshot = {
      team1Sets: [...team1Sets],
      team2Sets: [...team2Sets],
      team1Games,
      team2Games,
      team1Points,
      team2Points,
      isTiebreak,
      tiebreakPoints: { ...tiebreakPoints },
      goldenPoint,
      servingTeam,
      servingPlayer,
      isMatchFinished,
      matchWinnerTeam,
      matchFormat,
      statsSnapshot: JSON.parse(JSON.stringify(playerStats)),
      ralliesSnapshot: [...pointRallies],
      currentRallyTouchesSnapshot: [...currentRallyTouches]
    };

    // Deep clone stats to apply all touches and scoring actions atomically
    const nextStats = JSON.parse(JSON.stringify(playerStats));
    let scoringAction: { player: string; type: 'winner' | 'unforced_error' | 'forced_error'; scoringTeam: 1 | 2 } | null = null;
    let totalTouchesInRally = 0;
    const speechTouches: string[] = [];

    actions.forEach(action => {
      if (!nextStats[action.player]) {
        nextStats[action.player] = { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
      }
      const isTeam1 = action.player === team1P1 || action.player === team1P2;

      if (action.type === 'touch') {
        const c = action.count || 1;
        nextStats[action.player].touches += c;
        totalTouchesInRally += c;
        for (let i = 0; i < c; i++) speechTouches.push(action.player);
      } else if (action.type === 'winner') {
        nextStats[action.player].winners += 1;
        nextStats[action.player].touches += 1;
        totalTouchesInRally += 1;
        speechTouches.push(action.player);
        scoringAction = { player: action.player, type: 'winner', scoringTeam: isTeam1 ? 1 : 2 };
      } else if (action.type === 'unforced_error') {
        nextStats[action.player].unforcedErrors += 1;
        scoringAction = { player: action.player, type: 'unforced_error', scoringTeam: isTeam1 ? 2 : 1 };
      } else if (action.type === 'forced_error') {
        nextStats[action.player].forcedErrors += 1;
        scoringAction = { player: action.player, type: 'forced_error', scoringTeam: isTeam1 ? 2 : 1 };
      }
    });

    setPlayerStats(nextStats);

    if (scoringAction) {
      const { player, type: actionType, scoringTeam } = scoringAction;
      try {
        if (actionType === 'winner') playPointSound('game');
        else playPointSound('point');
      } catch (_) {}

      // Form full rally touch sequence
      let fullTouchOrder = [...currentRallyTouches, ...speechTouches];
      let forcedByPlayer: string | undefined = undefined;
      let forcedOnPlayer: string | undefined = undefined;
      let unforcedErrorPlayer: string | undefined = undefined;
      let pointWinnerPlayer: string | undefined = undefined;

      if (actionType === 'winner') {
        pointWinnerPlayer = player;
      } else if (actionType === 'forced_error') {
        forcedOnPlayer = player;
        forcedByPlayer = findOpponentForcer(fullTouchOrder, player);
        pointWinnerPlayer = forcedByPlayer;
        if (fullTouchOrder.length === 0) {
          fullTouchOrder = [forcedByPlayer, player].filter(Boolean);
        }
      } else if (actionType === 'unforced_error') {
        unforcedErrorPlayer = player;
        pointWinnerPlayer = scoringTeam === 1 ? team1P1 : team2P1;
        if (fullTouchOrder.length === 0) {
          fullTouchOrder = [player];
        }
      }

      // Calculate new score based on scoringTeam
      let newTeam1Games = team1Games;
      let newTeam2Games = team2Games;
      let newTeam1Sets = [...team1Sets];
      let newTeam2Sets = [...team2Sets];
      let newIsTiebreak = isTiebreak;
      let newTiebreakPoints = { ...tiebreakPoints };
      let newTeam1Points = team1Points;
      let newTeam2Points = team2Points;
      let actionDesc = '';

      if (isTiebreak) {
        const p1 = scoringTeam === 1 ? tiebreakPoints.team1 + 1 : tiebreakPoints.team1;
        const p2 = scoringTeam === 2 ? tiebreakPoints.team2 + 1 : tiebreakPoints.team2;
        newTiebreakPoints = { team1: p1, team2: p2 };
        actionDesc = `Punto Tie-break para Pareja ${scoringTeam} (${p1} - ${p2})`;

        if ((p1 >= 7 && p1 - p2 >= 2) || (p2 >= 7 && p2 - p1 >= 2)) {
          const setWinner = p1 > p2 ? 1 : 2;
          newTeam1Sets.push(setWinner === 1 ? 7 : 6);
          newTeam2Sets.push(setWinner === 2 ? 7 : 6);
          newTeam1Games = 0;
          newTeam2Games = 0;
          newTeam1Points = '0';
          newTeam2Points = '0';
          newIsTiebreak = false;
          newTiebreakPoints = { team1: 0, team2: 0 };

          // Evaluate if match is finished (e.g. 2 sets in best-of-3)
          let t1Won = 0;
          let t2Won = 0;
          newTeam1Sets.forEach((s1, idx) => {
            const s2 = newTeam2Sets[idx];
            if (s1 > s2) t1Won++;
            else if (s2 > s1) t2Won++;
          });
          const setsNeeded = getSetsNeededToWin(matchFormat);
          if (t1Won >= setsNeeded || t2Won >= setsNeeded) {
            const matchWinner = t1Won >= setsNeeded ? 1 : 2;
            setIsMatchFinished(true);
            setMatchWinnerTeam(matchWinner);
            try { playPointSound('match'); } catch (_) {}
            const winNames = matchWinner === 1 ? `${team1P1} & ${team1P2}` : `${team2P1} & ${team2P2}`;
            const setsScoreStr = newTeam1Sets.map((s, idx) => `${s}-${newTeam2Sets[idx]}`).join(', ');
            actionDesc = `🏆 ¡¡PARTIDO FINALIZADO!! ¡Victoria de ${winNames} por ${Math.max(t1Won, t2Won)} sets a ${Math.min(t1Won, t2Won)} (${setsScoreStr})!`;
          } else {
            actionDesc = `🏆 ¡Set ${newTeam1Sets.length} cerrado en Tie-break para Pareja ${setWinner}! (${p1}-${p2})`;
          }
        } else {
          newTeam1Points = p1;
          newTeam2Points = p2;
        }
      } else {
        const currentScorerPt = scoringTeam === 1 ? team1Points : team2Points;
        const currentRivalPt = scoringTeam === 1 ? team2Points : team1Points;
        let gameWon = false;

        if (currentScorerPt === '0') {
          if (scoringTeam === 1) newTeam1Points = '15'; else newTeam2Points = '15';
        } else if (currentScorerPt === '15') {
          if (scoringTeam === 1) newTeam1Points = '30'; else newTeam2Points = '30';
        } else if (currentScorerPt === '30') {
          if (scoringTeam === 1) newTeam1Points = '40'; else newTeam2Points = '40';
        } else if (currentScorerPt === '40') {
          if (currentRivalPt === '40') {
            if (goldenPoint) {
              gameWon = true;
              actionDesc = `⭐ ¡Juego ganado en PUNTO DE ORO para Pareja ${scoringTeam}!`;
            } else {
              if (scoringTeam === 1) {
                newTeam1Points = 'AD';
                newTeam2Points = '40';
                actionDesc = `🎾 ¡VENTAJA para Pareja 1! (Bola de Juego)`;
              } else {
                newTeam1Points = '40';
                newTeam2Points = 'AD';
                actionDesc = `🎾 ¡VENTAJA para Pareja 2! (Bola de Juego)`;
              }
            }
          } else if (currentRivalPt === 'AD') {
            newTeam1Points = '40';
            newTeam2Points = '40';
            actionDesc = `⚖️ ¡Vuelta a IGUALES! (40 - 40 / Deuce)`;
          } else {
            gameWon = true;
          }
        } else if (currentScorerPt === 'AD') {
          gameWon = true;
          actionDesc = `🎾 ¡Juego cerrado con VENTAJA para Pareja ${scoringTeam}!`;
        }

        if (gameWon) {
          if (scoringTeam === 1) newTeam1Games += 1;
          else newTeam2Games += 1;
          newTeam1Points = '0';
          newTeam2Points = '0';

          if (newTeam1Games === 6 && newTeam2Games === 6) {
            newIsTiebreak = true;
            newTiebreakPoints = { team1: 0, team2: 0 };
            actionDesc = `¡Juego para Pareja ${scoringTeam}! Entramos en TIE-BREAK a 7 puntos (6-6).`;
          } else if (
            (newTeam1Games >= 6 && newTeam1Games - newTeam2Games >= 2) ||
            (newTeam2Games >= 6 && newTeam2Games - newTeam1Games >= 2)
          ) {
            const setWinner = newTeam1Games > newTeam2Games ? 1 : 2;
            newTeam1Sets.push(newTeam1Games);
            newTeam2Sets.push(newTeam2Games);
            newTeam1Games = 0;
            newTeam2Games = 0;

            // Evaluate if match is finished (e.g. 2 sets in best-of-3)
            let t1Won = 0;
            let t2Won = 0;
            newTeam1Sets.forEach((s1, idx) => {
              const s2 = newTeam2Sets[idx];
              if (s1 > s2) t1Won++;
              else if (s2 > s1) t2Won++;
            });
            const setsNeeded = getSetsNeededToWin(matchFormat);
            if (t1Won >= setsNeeded || t2Won >= setsNeeded) {
              const matchWinner = t1Won >= setsNeeded ? 1 : 2;
              setIsMatchFinished(true);
              setMatchWinnerTeam(matchWinner);
              try { playPointSound('match'); } catch (_) {}
              const winNames = matchWinner === 1 ? `${team1P1} & ${team1P2}` : `${team2P1} & ${team2P2}`;
              const setsScoreStr = newTeam1Sets.map((s, idx) => `${s}-${newTeam2Sets[idx]}`).join(', ');
              actionDesc = `🏆 ¡¡PARTIDO FINALIZADO!! ¡Victoria de ${winNames} por ${Math.max(t1Won, t2Won)} sets a ${Math.min(t1Won, t2Won)} (${setsScoreStr})!`;
            } else {
              actionDesc = `🏆 ¡Set ${newTeam1Sets.length} ganado por Pareja ${setWinner} (${newTeam1Sets[newTeam1Sets.length - 1]}-${newTeam2Sets[newTeam2Sets.length - 1]})!`;
            }
          } else {
            if (!actionDesc.includes('Juego')) {
              actionDesc = `¡Juego para Pareja ${scoringTeam}! Marcador: ${newTeam1Games} - ${newTeam2Games}`;
            }
          }
          setServingTeam(prev => (prev === 1 ? 2 : 1));
        } else if (!actionDesc) {
          const p1Str = scoringTeam === 1 ? newTeam1Points : team1Points;
          const p2Str = scoringTeam === 2 ? newTeam2Points : team2Points;
          actionDesc = `Punto Pareja ${scoringTeam} (${p1Str} - ${p2Str})`;
        }
      }

      setTeam1Games(newTeam1Games);
      setTeam2Games(newTeam2Games);
      setTeam1Sets(newTeam1Sets);
      setTeam2Sets(newTeam2Sets);
      setTeam1Points(newTeam1Points);
      setTeam2Points(newTeam2Points);
      setIsTiebreak(newIsTiebreak);
      setTiebreakPoints(newTiebreakPoints);

      const actionLabel = actionType === 'winner' ? '⚡ WINNER' : actionType === 'forced_error' ? '🛡️ ERROR FORZADO' : '❌ ERROR NO FORZADO';
      const rallyLen = Math.max(fullTouchOrder.length, 1);
      const desc = rallyLen > 1 
        ? `Peloteo (${rallyLen} toq: ${fullTouchOrder.join('➔')}) -> ${actionLabel} de ${player}`
        : `${actionLabel} de ${player}`;

      const setNum = snapshot.team1Sets.length + 1;
      const gamesBefore = `${snapshot.team1Games}-${snapshot.team2Games}`;
      const pointsBefore = snapshot.isTiebreak
        ? `Tie-break ${snapshot.tiebreakPoints.team1}-${snapshot.tiebreakPoints.team2}`
        : `${snapshot.team1Points}-${snapshot.team2Points}${snapshot.team1Points === '40' && snapshot.team2Points === '40' ? (goldenPoint ? ' (Punto de Oro)' : ' (Iguales)') : ''}`;
      const scoreContextDesc = snapshot.isTiebreak
        ? `en el Tie-break (${snapshot.tiebreakPoints.team1}-${snapshot.tiebreakPoints.team2}) con 6-6 en el ${setNum}º set`
        : `en el ${pointsBefore} yendo ${gamesBefore} en el ${setNum}º set`;

      // Save PointRally object
      const newPointRally: PointRally = {
        id: `rally-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        pointNumber: pointRallies.length + 1,
        timeSec: currentVideoTime,
        videoTimeSec: currentVideoTime,
        servingPlayer: servingPlayer || fullTouchOrder[0] || (snapshot.servingTeam === 1 ? team1P1 : team2P1),
        touchOrder: fullTouchOrder.length > 0 ? fullTouchOrder : [player],
        rallyLength: rallyLen,
        endingAction: actionType,
        scoringTeam,
        pointWinnerPlayer,
        forcedByPlayer,
        forcedOnPlayer,
        unforcedErrorPlayer,
        setNumber: setNum,
        gamesContext: gamesBefore,
        pointsContext: pointsBefore,
        scoreContextDescription: scoreContextDesc,
        scoreSnapshotText: `${newTeam1Points} - ${newTeam2Points}`,
        description: `${actionLabel} de ${player} (${scoreContextDesc})`
      };

      setPointRallies(prev => [...prev, newPointRally]);
      setCurrentRallyTouches([]);

      setHistoryTimeline(prev => [
        {
          id: `rally-${Date.now()}`,
          videoTimeSec: currentVideoTime,
          scoringTeam,
          player,
          actionType,
          description: `${desc} -> ${actionDesc}`,
          scoreSnapshot: snapshot
        },
        ...prev
      ]);

      const forcingNote = forcedByPlayer ? ` (Provocado por ${forcedByPlayer})` : '';
      setRecentActionText(`${actionLabel} de ${player}${forcingNote}. Punto para Pareja ${scoringTeam} [${rallyLen} golpes]. (${newTeam1Points} - ${newTeam2Points})`);
    } else {
      // Only touches in this speech utterance
      try {
        playPointSound('point');
      } catch (_) {}

      // Update current rally touches
      setCurrentRallyTouches(prev => [...prev, ...speechTouches]);

      const desc = `Peloteo (+${totalTouchesInRally} toques): ${actions.map(a => `${a.player} (${a.count || 1})`).join(', ')}`;
      setHistoryTimeline(prev => [
        {
          id: `touches-${Date.now()}`,
          videoTimeSec: currentVideoTime,
          actionType: 'touch',
          description: `🎾 ${desc}`,
          scoreSnapshot: snapshot
        },
        ...prev
      ]);
      setRecentActionText(`🎾 ${desc} (Total peloteo: ${currentRallyTouches.length + totalTouchesInRally} golpes)`);
    }
  }, [
    team1Sets,
    team2Sets,
    team1Games,
    team2Games,
    team1Points,
    team2Points,
    isTiebreak,
    tiebreakPoints,
    goldenPoint,
    servingTeam,
    servingPlayer,
    isMatchFinished,
    matchWinnerTeam,
    matchFormat,
    playerStats,
    pointRallies,
    currentRallyTouches,
    currentVideoTime,
    team1P1,
    team1P2,
    team2P1,
    team2P2,
    findOpponentForcer
  ]);

  // Main Core Scoring Engine
  const scorePoint = useCallback((
    scoringTeam: 1 | 2,
    attributedPlayer?: string,
    actionType: 'winner' | 'unforced_error' | 'forced_error' | 'direct' = 'direct'
  ) => {
    // Snapshot for Undo before updating
    const snapshot = {
      team1Sets: [...team1Sets],
      team2Sets: [...team2Sets],
      team1Games,
      team2Games,
      team1Points,
      team2Points,
      isTiebreak,
      tiebreakPoints: { ...tiebreakPoints },
      goldenPoint,
      servingTeam,
      servingPlayer,
      isMatchFinished,
      matchWinnerTeam,
      matchFormat,
      statsSnapshot: JSON.parse(JSON.stringify(playerStats)),
      ralliesSnapshot: [...pointRallies],
      currentRallyTouchesSnapshot: [...currentRallyTouches]
    };

    // Form touch order sequence for this point
    let fullTouchOrder = [...currentRallyTouches];
    let forcedByPlayer: string | undefined = undefined;
    let forcedOnPlayer: string | undefined = undefined;
    let unforcedErrorPlayer: string | undefined = undefined;
    let pointWinnerPlayer: string | undefined = undefined;

    // Update individual player stats if attributed
    if (attributedPlayer) {
      setPlayerStats(prev => {
        const cur = prev[attributedPlayer] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
        const updated = { ...cur };
        if (actionType === 'winner') {
          updated.winners += 1;
          updated.touches += 1; // winning shot is also a touch
        } else if (actionType === 'unforced_error') {
          updated.unforcedErrors += 1;
        } else if (actionType === 'forced_error') {
          updated.forcedErrors += 1;
        }
        return { ...prev, [attributedPlayer]: updated };
      });
    }

    if (actionType === 'winner') {
      pointWinnerPlayer = attributedPlayer;
      if (attributedPlayer && (fullTouchOrder.length === 0 || fullTouchOrder[fullTouchOrder.length - 1] !== attributedPlayer)) {
        fullTouchOrder.push(attributedPlayer);
      }
    } else if (actionType === 'forced_error') {
      forcedOnPlayer = attributedPlayer;
      forcedByPlayer = findOpponentForcer(fullTouchOrder, attributedPlayer || '');
      pointWinnerPlayer = forcedByPlayer;
      if (fullTouchOrder.length === 0) {
        fullTouchOrder = [forcedByPlayer, attributedPlayer || ''].filter(Boolean);
      }
    } else if (actionType === 'unforced_error') {
      unforcedErrorPlayer = attributedPlayer;
      pointWinnerPlayer = scoringTeam === 1 ? team1P1 : team2P1;
      if (fullTouchOrder.length === 0 && attributedPlayer) {
        fullTouchOrder = [attributedPlayer];
      }
    } else if (actionType === 'direct') {
      pointWinnerPlayer = scoringTeam === 1 ? team1P1 : team2P1;
      if (fullTouchOrder.length === 0) {
        fullTouchOrder = [servingPlayer || team1P1];
      }
    }

    try {
      if (actionType === 'winner') playPointSound('game');
      else playPointSound('point');
    } catch (_) {}

    // Scoreboard updates
    let newTeam1Games = team1Games;
    let newTeam2Games = team2Games;
    let newTeam1Sets = [...team1Sets];
    let newTeam2Sets = [...team2Sets];
    let newIsTiebreak = isTiebreak;
    let newTiebreakPoints = { ...tiebreakPoints };
    let newTeam1Points = team1Points;
    let newTeam2Points = team2Points;
    let actionDesc = '';

    if (isTiebreak) {
      // Tiebreak scoring (1, 2, 3, 4...)
      const p1 = scoringTeam === 1 ? tiebreakPoints.team1 + 1 : tiebreakPoints.team1;
      const p2 = scoringTeam === 2 ? tiebreakPoints.team2 + 1 : tiebreakPoints.team2;
      newTiebreakPoints = { team1: p1, team2: p2 };

      actionDesc = `Punto Tie-break para Pareja ${scoringTeam} (${p1} - ${p2})`;

      // Check tiebreak won (at least 7 points and difference >= 2)
      if ((p1 >= 7 && p1 - p2 >= 2) || (p2 >= 7 && p2 - p1 >= 2)) {
        const setWinner = p1 > p2 ? 1 : 2;
        newTeam1Sets.push(setWinner === 1 ? 7 : 6);
        newTeam2Sets.push(setWinner === 2 ? 7 : 6);
        newTeam1Games = 0;
        newTeam2Games = 0;
        newTeam1Points = '0';
        newTeam2Points = '0';
        newIsTiebreak = false;
        newTiebreakPoints = { team1: 0, team2: 0 };

        // Evaluate if match is finished (e.g. 2 sets in best-of-3)
        let t1Won = 0;
        let t2Won = 0;
        newTeam1Sets.forEach((s1, idx) => {
          const s2 = newTeam2Sets[idx];
          if (s1 > s2) t1Won++;
          else if (s2 > s1) t2Won++;
        });
        const setsNeeded = getSetsNeededToWin(matchFormat);
        if (t1Won >= setsNeeded || t2Won >= setsNeeded) {
          const matchWinner = t1Won >= setsNeeded ? 1 : 2;
          setIsMatchFinished(true);
          setMatchWinnerTeam(matchWinner);
          try { playPointSound('match'); } catch (_) {}
          const winNames = matchWinner === 1 ? `${team1P1} & ${team1P2}` : `${team2P1} & ${team2P2}`;
          const setsScoreStr = newTeam1Sets.map((s, idx) => `${s}-${newTeam2Sets[idx]}`).join(', ');
          actionDesc = `🏆 ¡¡PARTIDO FINALIZADO!! ¡Victoria de ${winNames} por ${Math.max(t1Won, t2Won)} sets a ${Math.min(t1Won, t2Won)} (${setsScoreStr})!`;
        } else {
          actionDesc = `🏆 ¡Set ${newTeam1Sets.length} cerrado en Tie-break para Pareja ${setWinner}! (${p1}-${p2})`;
        }
      } else {
        newTeam1Points = p1;
        newTeam2Points = p2;
      }
    } else {
      // Normal game points scoring ('0', '15', '30', '40', 'AD', Punto de Oro)
      const currentScorerPt = scoringTeam === 1 ? team1Points : team2Points;
      const currentRivalPt = scoringTeam === 1 ? team2Points : team1Points;

      let gameWon = false;

      if (currentScorerPt === '0') {
        if (scoringTeam === 1) newTeam1Points = '15'; else newTeam2Points = '15';
      } else if (currentScorerPt === '15') {
        if (scoringTeam === 1) newTeam1Points = '30'; else newTeam2Points = '30';
      } else if (currentScorerPt === '30') {
        if (scoringTeam === 1) newTeam1Points = '40'; else newTeam2Points = '40';
      } else if (currentScorerPt === '40') {
        if (currentRivalPt === '40') {
          // 40-40 Deuce / Iguales
          if (goldenPoint) {
            // Punto de Oro: instant game win
            gameWon = true;
            actionDesc = `⭐ ¡Juego ganado en PUNTO DE ORO para Pareja ${scoringTeam}!`;
          } else {
            // Advantage mode: Give AD to scoring team
            if (scoringTeam === 1) {
              newTeam1Points = 'AD';
              newTeam2Points = '40';
              actionDesc = `🎾 ¡VENTAJA para Pareja 1! (Bola de Juego)`;
            } else {
              newTeam1Points = '40';
              newTeam2Points = 'AD';
              actionDesc = `🎾 ¡VENTAJA para Pareja 2! (Bola de Juego)`;
            }
          }
        } else if (currentRivalPt === 'AD') {
          // Rival had advantage, back to 40-40 (Iguales / Deuce)
          newTeam1Points = '40';
          newTeam2Points = '40';
          actionDesc = `⚖️ ¡Vuelta a IGUALES! (40 - 40 / Deuce)`;
        } else {
          // Normal game win (Rival was 0, 15, or 30)
          gameWon = true;
        }
      } else if (currentScorerPt === 'AD') {
        // Team with Advantage scores -> Game won!
        gameWon = true;
        actionDesc = `🎾 ¡Juego cerrado con VENTAJA para Pareja ${scoringTeam}!`;
      }

      if (gameWon) {
        if (scoringTeam === 1) newTeam1Games += 1;
        else newTeam2Games += 1;

        newTeam1Points = '0';
        newTeam2Points = '0';

        // Check Set won (6 games and difference >= 2, or tiebreak at 6-6)
        if (newTeam1Games === 6 && newTeam2Games === 6) {
          newIsTiebreak = true;
          newTiebreakPoints = { team1: 0, team2: 0 };
          actionDesc = `¡Juego para Pareja ${scoringTeam}! Entramos en TIE-BREAK a 7 puntos (6-6).`;
        } else if (
          (newTeam1Games >= 6 && newTeam1Games - newTeam2Games >= 2) ||
          (newTeam2Games >= 6 && newTeam2Games - newTeam1Games >= 2)
        ) {
          const setWinner = newTeam1Games > newTeam2Games ? 1 : 2;
          newTeam1Sets.push(newTeam1Games);
          newTeam2Sets.push(newTeam2Games);
          newTeam1Games = 0;
          newTeam2Games = 0;

          // Evaluate if match is finished (e.g. 2 sets in best-of-3)
          let t1Won = 0;
          let t2Won = 0;
          newTeam1Sets.forEach((s1, idx) => {
            const s2 = newTeam2Sets[idx];
            if (s1 > s2) t1Won++;
            else if (s2 > s1) t2Won++;
          });
          const setsNeeded = getSetsNeededToWin(matchFormat);
          if (t1Won >= setsNeeded || t2Won >= setsNeeded) {
            const matchWinner = t1Won >= setsNeeded ? 1 : 2;
            setIsMatchFinished(true);
            setMatchWinnerTeam(matchWinner);
            try { playPointSound('match'); } catch (_) {}
            const winNames = matchWinner === 1 ? `${team1P1} & ${team1P2}` : `${team2P1} & ${team2P2}`;
            const setsScoreStr = newTeam1Sets.map((s, idx) => `${s}-${newTeam2Sets[idx]}`).join(', ');
            actionDesc = `🏆 ¡¡PARTIDO FINALIZADO!! ¡Victoria de ${winNames} por ${Math.max(t1Won, t2Won)} sets a ${Math.min(t1Won, t2Won)} (${setsScoreStr})!`;
          } else {
            actionDesc = `🏆 ¡Set ${newTeam1Sets.length} ganado por Pareja ${setWinner} (${newTeam1Sets[newTeam1Sets.length - 1]}-${newTeam2Sets[newTeam2Sets.length - 1]})!`;
          }
        } else {
          if (!actionDesc.includes('Juego')) {
            actionDesc = `¡Juego para Pareja ${scoringTeam}! Marcador: ${newTeam1Games} - ${newTeam2Games}`;
          }
        }

        // Rotate serve to other team after game
        setServingTeam(prev => (prev === 1 ? 2 : 1));
      } else if (!actionDesc) {
        const p1Str = scoringTeam === 1 ? newTeam1Points : team1Points;
        const p2Str = scoringTeam === 2 ? newTeam2Points : team2Points;
        actionDesc = `Punto Pareja ${scoringTeam} (${p1Str} - ${p2Str})`;
      }
    }

    // Apply states
    setTeam1Games(newTeam1Games);
    setTeam2Games(newTeam2Games);
    setTeam1Sets(newTeam1Sets);
    setTeam2Sets(newTeam2Sets);
    setTeam1Points(newTeam1Points);
    setTeam2Points(newTeam2Points);
    setIsTiebreak(newIsTiebreak);
    setTiebreakPoints(newTiebreakPoints);

    const rallyLen = Math.max(fullTouchOrder.length, 1);

    const setNum = snapshot.team1Sets.length + 1;
    const gamesBefore = `${snapshot.team1Games}-${snapshot.team2Games}`;
    const pointsBefore = snapshot.isTiebreak
      ? `Tie-break ${snapshot.tiebreakPoints.team1}-${snapshot.tiebreakPoints.team2}`
      : `${snapshot.team1Points}-${snapshot.team2Points}${snapshot.team1Points === '40' && snapshot.team2Points === '40' ? (goldenPoint ? ' (Punto de Oro)' : ' (Iguales)') : ''}`;
    const scoreContextDesc = snapshot.isTiebreak
      ? `en el Tie-break (${snapshot.tiebreakPoints.team1}-${snapshot.tiebreakPoints.team2}) con 6-6 en el ${setNum}º set`
      : `en el ${pointsBefore} yendo ${gamesBefore} en el ${setNum}º set`;

    // Save PointRally object
    const newPointRally: PointRally = {
      id: `pt-rally-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      pointNumber: pointRallies.length + 1,
      timeSec: currentVideoTime,
      videoTimeSec: currentVideoTime,
      servingPlayer: servingPlayer || fullTouchOrder[0] || (snapshot.servingTeam === 1 ? team1P1 : team2P1),
      touchOrder: fullTouchOrder.length > 0 ? fullTouchOrder : [attributedPlayer || servingPlayer],
      rallyLength: rallyLen,
      endingAction: actionType === 'direct' ? 'direct_point' : actionType,
      scoringTeam,
      pointWinnerPlayer,
      forcedByPlayer,
      forcedOnPlayer,
      unforcedErrorPlayer,
      setNumber: setNum,
      gamesContext: gamesBefore,
      pointsContext: pointsBefore,
      scoreContextDescription: scoreContextDesc,
      scoreSnapshotText: `${newTeam1Points} - ${newTeam2Points}`,
      description: attributedPlayer ? `${actionType.toUpperCase()}: ${attributedPlayer} (${scoreContextDesc})` : scoreContextDesc
    };

    setPointRallies(prev => [...prev, newPointRally]);
    setCurrentRallyTouches([]);

    // Save event in history log
    setHistoryTimeline(prev => [
      {
        id: `action-${Date.now()}`,
        videoTimeSec: currentVideoTime,
        scoringTeam,
        player: attributedPlayer,
        actionType,
        description: attributedPlayer ? `${actionType.toUpperCase()}: ${attributedPlayer} (${rallyLen} golpes) -> ${actionDesc}` : actionDesc,
        scoreSnapshot: snapshot
      },
      ...prev
    ]);

    const forcingNote = forcedByPlayer ? ` (Provocado por ${forcedByPlayer})` : '';
    setRecentActionText(
      attributedPlayer
        ? `${actionType === 'winner' ? '⚡ WINNER' : actionType === 'forced_error' ? '🛡️ ERROR FORZADO' : '❌ ERROR NO FORZADO'} de ${attributedPlayer}${forcingNote} [${rallyLen} golpes]. Punto para Pareja ${scoringTeam}. (${newTeam1Points} - ${newTeam2Points})`
        : `Punto para Pareja ${scoringTeam} [${rallyLen} golpes]. Marcador: ${newTeam1Games}-${newTeam2Games} (${newTeam1Points}-${newTeam2Points})`
    );
  }, [
    team1Sets,
    team2Sets,
    team1Games,
    team2Games,
    team1Points,
    team2Points,
    isTiebreak,
    tiebreakPoints,
    goldenPoint,
    servingTeam,
    servingPlayer,
    isMatchFinished,
    matchWinnerTeam,
    matchFormat,
    playerStats,
    pointRallies,
    currentRallyTouches,
    currentVideoTime,
    team1P1,
    team1P2,
    team2P1,
    team2P2,
    findOpponentForcer
  ]);

  // Undo last action
  const handleUndo = useCallback(() => {
    if (historyTimeline.length === 0) {
      setRecentActionText('No hay acciones previas que deshacer.');
      return;
    }

    const [lastEvent, ...remainingTimeline] = historyTimeline;
    const snap = lastEvent.scoreSnapshot;

    if (snap) {
      if (snap.team1Sets) setTeam1Sets([...snap.team1Sets]);
      if (snap.team2Sets) setTeam2Sets([...snap.team2Sets]);
      if (snap.team1Games !== undefined) setTeam1Games(snap.team1Games);
      if (snap.team2Games !== undefined) setTeam2Games(snap.team2Games);
      if (snap.team1Points !== undefined) setTeam1Points(snap.team1Points);
      if (snap.team2Points !== undefined) setTeam2Points(snap.team2Points);
      if (snap.isTiebreak !== undefined) setIsTiebreak(snap.isTiebreak);
      if (snap.tiebreakPoints) setTiebreakPoints({ ...snap.tiebreakPoints });
      if (snap.goldenPoint !== undefined) setGoldenPoint(snap.goldenPoint);
      if (snap.servingTeam !== undefined) setServingTeam(snap.servingTeam);
      if (snap.servingPlayer !== undefined) setServingPlayer(snap.servingPlayer);
      if (snap.isMatchFinished !== undefined) setIsMatchFinished(snap.isMatchFinished);
      if (snap.matchWinnerTeam !== undefined) setMatchWinnerTeam(snap.matchWinnerTeam);
      if (snap.matchFormat !== undefined) setMatchFormat(snap.matchFormat);
      if (snap.statsSnapshot) {
        setPlayerStats(JSON.parse(JSON.stringify(snap.statsSnapshot)));
      }
      if (snap.ralliesSnapshot) {
        setPointRallies([...snap.ralliesSnapshot]);
      }
      if (snap.currentRallyTouchesSnapshot) {
        setCurrentRallyTouches([...snap.currentRallyTouchesSnapshot]);
      }
    }
    setHistoryTimeline(remainingTimeline);

    setRecentActionText(`↩️ Acción deshecha: "${lastEvent.description}". Marcador y estadísticas restaurados.`);
  }, [historyTimeline]);

  // Keyboard Shortcuts Listener (1-4 for player select, J-K-L-Ñ for instant actions)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key;
      const upperKey = key.toUpperCase();

      // 1, 2, 3, 4 -> Select Player
      if (upperKey === '1') {
        setSelectedPlayerIdx(0);
        setRecentActionText(`Jugador activo: [1] ${allPlayers[0]}`);
      } else if (upperKey === '2') {
        setSelectedPlayerIdx(1);
        setRecentActionText(`Jugador activo: [2] ${allPlayers[1]}`);
      } else if (upperKey === '3') {
        setSelectedPlayerIdx(2);
        setRecentActionText(`Jugador activo: [3] ${allPlayers[2]}`);
      } else if (upperKey === '4') {
        setSelectedPlayerIdx(3);
        setRecentActionText(`Jugador activo: [4] ${allPlayers[3]}`);
      }
      // J -> Touch (+1 Toque)
      else if (upperKey === 'J') {
        const p = allPlayers[selectedPlayerIdx] || team1P1;
        addTouch(p);
      }
      // K -> Winner (gives point to player's team!)
      else if (upperKey === 'K') {
        const p = allPlayers[selectedPlayerIdx] || team1P1;
        const scoringTeam = selectedPlayerIdx < 2 ? 1 : 2;
        scorePoint(scoringTeam, p, 'winner');
      }
      // L -> Error Forzado (gives point to rival team!)
      else if (upperKey === 'L') {
        const p = allPlayers[selectedPlayerIdx] || team1P1;
        const scoringTeam = selectedPlayerIdx < 2 ? 2 : 1;
        scorePoint(scoringTeam, p, 'forced_error');
      }
      // Ñ or ; or + -> Error No Forzado (gives point to rival team!)
      else if (upperKey === 'Ñ' || key === 'ñ' || key === 'Ñ' || key === ';' || key === '+') {
        const p = allPlayers[selectedPlayerIdx] || team1P1;
        const scoringTeam = selectedPlayerIdx < 2 ? 2 : 1;
        scorePoint(scoringTeam, p, 'unforced_error');
      }
      // Utility keys
      else if (upperKey === 'S') {
        handleToggleServe();
      } else if (upperKey === 'Z') {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlayerIdx, allPlayers, team1P1, addTouch, scorePoint, handleToggleServe, handleUndo]);

  // Voice Recognition for YouTube Studio
  const startVoiceRecognition = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Tu navegador no soporta reconocimiento de voz nativo Web Speech API. Usa Chrome o Edge.');
        return;
      }

      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';
      recognitionRef.current = recognition;

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const rawTranscript = event.results[i][0].transcript;
          const transcript = rawTranscript.toLowerCase().trim();

          if (event.results[i].isFinal) {
            setInterimTranscript('');

            // Global voice triggers
            if (transcript.includes('deshacer') || transcript.includes('anula') || transcript.includes('rectificar') || transcript.includes('borra el ultimo')) {
              handleUndo();
              return;
            }
            if (transcript.includes('doble falta')) {
              const oppTeam = servingTeam === 1 ? 2 : 1;
              scorePoint(oppTeam, servingPlayer, 'unforced_error');
              setRecentActionText(`❌ Doble falta de ${servingPlayer}. Punto para Pareja ${oppTeam}.`);
              return;
            }
            if (transcript.includes('primer saque fuera') || transcript.includes('falla primer saque') || transcript.includes('falla el primer saque')) {
              setRecentActionText(`🎾 Primer servicio fallado por ${servingPlayer}. 2º saque contará como 1 toque si entra.`);
              return;
            }
            if (transcript.includes('cambiar saque') || transcript.includes('cambia saque') || transcript.includes('siguiente saque')) {
              handleToggleServe();
              return;
            }
            if (transcript.includes('activar ventajas') || transcript.includes('con ventajas') || transcript.includes('modo ventajas') || transcript.includes('sistema de ventajas') || transcript.includes('jugar con ventajas')) {
              setGoldenPoint(false);
              setRecentActionText('🎾 Sistema Tradicional de Ventajas activado (Ventaja / Iguales / Deuce)');
              return;
            }
            if (transcript.includes('activar punto de oro') || transcript.includes('con punto de oro') || transcript.includes('modo punto de oro') || transcript.includes('jugar punto de oro')) {
              setGoldenPoint(true);
              setRecentActionText('⭐ Modo Punto de Oro activado (Juego decisivo en 40-40)');
              return;
            }
            if (transcript.includes('iguales') || transcript.includes('deuce') || transcript.includes('a iguales') || transcript.includes('volver a iguales')) {
              if (!isTiebreak) {
                setTeam1Points('40');
                setTeam2Points('40');
                setRecentActionText('⚖️ Marcador ajustado a IGUALES (40 - 40 / Deuce)');
                return;
              }
            }

            // Continuous and smart rally parsing ("Víctor Mikel Víctor Mikel error no forzado", "Mikel toque", etc.)
            const parsed = parseSpeechPadel(rawTranscript, allPlayers);

            if (parsed.actions.length > 0) {
              executeRally(parsed.actions, rawTranscript);
            } else {
              // Direct team triggers
              if (transcript.includes('ventaja pareja 1') || transcript.includes('ventaja equipo 1') || transcript.includes('ventaja uno') || transcript.includes('ventaja pareja uno')) {
                scorePoint(1);
              } else if (transcript.includes('ventaja pareja 2') || transcript.includes('ventaja equipo 2') || transcript.includes('ventaja dos') || transcript.includes('ventaja pareja dos')) {
                scorePoint(2);
              } else if (transcript.includes('pareja 1') || transcript.includes('equipo 1') || transcript.includes('punto uno')) {
                scorePoint(1);
              } else if (transcript.includes('pareja 2') || transcript.includes('equipo 2') || transcript.includes('punto dos')) {
                scorePoint(2);
              }
            }
          } else {
            setInterimTranscript(rawTranscript);
          }
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Voice recognition error:', err);
      };

      recognition.onend = () => {
        if (isListening) {
          try {
            recognition.start();
          } catch (_) {}
        }
      };

      recognition.start();
      setIsListening(true);
      setRecentActionText('🎙️ Reconocimiento de voz activo: Narra el punto libremente (ej. "Víctor Mikel Víctor Mikel error forzado")');
    } catch (e) {
      console.warn(e);
    }
  };

  const stopVoiceRecognition = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setInterimTranscript('');
  };

  // Format full match sets score text
  const currentSetsScoreText = [
    ...team1Sets.map((s, idx) => `${s}-${team2Sets[idx]}`),
    `${team1Games}-${team2Games}${isTiebreak ? ' (TB)' : ''} [en juego]`
  ].join(', ');

  // Assemble current match payload
  const buildCurrentMatchObject = (isFinished: boolean): PadelMatch => {
    const liveScoreboardState: LiveScoreboardState = {
      team1: {
        player1: team1P1,
        player2: team1P2,
        sets: team1Sets,
        currentGames: team1Games,
        currentPoints: team1Points
      },
      team2: {
        player1: team2P1,
        player2: team2P2,
        sets: team2Sets,
        currentGames: team2Games,
        currentPoints: team2Points
      },
      currentSet: team1Sets.length,
      isTieBreak: isTiebreak,
      tieBreakPoints: tiebreakPoints,
      goldenPoint,
      servingTeam,
      servingPlayer,
      isFinished,
      matchDurationSec: currentVideoTime,
      pointsHistory: pointRallies.length > 0
        ? pointRallies.map((r, i) => ({
            id: r.id || `pt-hist-${i}`,
            timeSec: r.videoTimeSec || r.timeSec || 0,
            scoringTeam: (r.scoringTeam || 1) as 1 | 2,
            attributedPlayer: r.pointWinnerPlayer || (r.touchOrder && r.touchOrder[r.touchOrder.length - 1]) || team1P1,
            actionType: r.endingAction === 'direct_point' ? 'direct_point' : (r.endingAction as any),
            scoreText: r.scoreSnapshotText || r.description || `Punto ${i + 1}`,
            touchOrder: r.touchOrder,
            rallyLength: r.rallyLength || (r.touchOrder ? r.touchOrder.length : 1),
            forcedByPlayer: r.forcedByPlayer,
            forcedOnPlayer: r.forcedOnPlayer
          }))
        : historyTimeline.map((h, i) => {
            const matchingRally = pointRallies.find(r => r.id === h.id || Math.abs((r.videoTimeSec || r.timeSec || 0) - h.videoTimeSec) < 1);
            return {
              id: h.id,
              timeSec: h.videoTimeSec,
              scoringTeam: (h.scoringTeam || 1) as 1 | 2,
              attributedPlayer: h.player,
              actionType: h.actionType === 'touch' ? 'direct_point' : (h.actionType as any),
              scoreText: h.description,
              touchOrder: matchingRally?.touchOrder || [h.player],
              rallyLength: matchingRally?.rallyLength || 1,
              forcedByPlayer: matchingRally?.forcedByPlayer,
              forcedOnPlayer: matchingRally?.forcedOnPlayer
            };
          })
    };

    // Calculate MVP based on Winners and Touches
    let highestMvp = team1P1;
    let highestScore = -999;
    Object.entries(playerStats).forEach(([pName, val]) => {
      const s = val as PlayerStats;
      const score = (s.winners * 3) + (s.touches * 0.2) - (s.unforcedErrors * 2) - s.forcedErrors;
      if (score > highestScore) {
        highestScore = score;
        highestMvp = pName;
      }
    });

    const statsList = Object.values(playerStats) as PlayerStats[];

    // Calculate sets won for accurate winner computation (support 2-set, 3-set or 1-set matches)
    let t1Won = 0;
    let t2Won = 0;
    team1Sets.forEach((s1, idx) => {
      const s2 = team2Sets[idx];
      if (s1 > s2) t1Won++;
      else if (s2 > s1) t2Won++;
    });

    let calculatedWinner: 1 | 2 = 1;
    if (t1Won > t2Won) calculatedWinner = 1;
    else if (t2Won > t1Won) calculatedWinner = 2;
    else if (team1Games > team2Games) calculatedWinner = 1;
    else if (team2Games > team1Games) calculatedWinner = 2;

    const finalWinnerTeam = matchWinnerTeam || calculatedWinner;
    const winnerNames = finalWinnerTeam === 1 ? `${team1P1} & ${team1P2}` : `${team2P1} & ${team2P2}`;

    const setsFormatted = team1Sets.map((s, idx) => `${s}-${team2Sets[idx]}`).join(', ');
    const setsSummary = isFinished
      ? (setsFormatted || `${team1Games}-${team2Games}`)
      : currentSetsScoreText;

    const finishSummaryText = isFinished
      ? `Partido finalizado en ${team1Sets.length} sets. Ganador: Pareja ${finalWinnerTeam} (${winnerNames}) con resultado ${setsSummary}. MVP del encuentro: ${highestMvp}.`
      : `Partido en curso anotado en vídeo (${formatTime(currentVideoTime)}). Marcador provisional: ${setsSummary}.`;

    // Calculate longest rally info for highlights if available
    const maxRally = pointRallies.length > 0
      ? pointRallies.reduce((max, r) => (r.rallyLength > max.rallyLength ? r : max), pointRallies[0])
      : null;

    const highlightsArray = [
      `Resultado final en sets: ${setsSummary}`,
      `Volumen total de toques: ${statsList.reduce((a, b) => a + b.touches, 0)} toques registrados.`,
      `Winners acumulados: ${statsList.reduce((a, b) => a + b.winners, 0)} tiros ganadores.`,
      `Errores no forzados: ${statsList.reduce((a, b) => a + b.unforcedErrors, 0)} fallos directos.`
    ];

    if (maxRally && maxRally.rallyLength > 1) {
      highlightsArray.push(`Peloteo más largo: ${maxRally.rallyLength} toques (${maxRally.touchOrder.slice(0, 4).join('➔')}...)`);
    }

    return {
      id: currentMatchId,
      title: matchTitle,
      date: matchDate,
      court: matchCourt,
      team1: {
        name: `${team1P1} & ${team1P2}`,
        player1: team1P1,
        player2: team1P2,
        score: team1Sets.join(' ')
      },
      team2: {
        name: `${team2P1} & ${team2P2}`,
        player1: team2P1,
        player2: team2P2,
        score: team2Sets.join(' ')
      },
      setsScore: setsSummary,
      winnerTeam: finalWinnerTeam,
      stats: playerStats,
      pointRallies: pointRallies,
      summary: finishSummaryText,
      highlights: highlightsArray,
      mvp: highestMvp,
      tacticalNotes: `Anotación interactiva vinculada a YouTube. Segundo del vídeo: ${formatTime(currentVideoTime)}.`,
      youtubeUrl: videoUrlInput,
      youtubeTimestamp: currentVideoTime,
      youtubeRotation: videoRotation,
      youtubeMirror: videoMirror,
      youtubeZoom: videoZoom,
      isCompleted: isFinished,
      inProgressScoreboard: liveScoreboardState
    };
  };

  // Save as in-progress ("Guardar como Partido en Curso / A medias")
  const handleSaveInProgress = () => {
    const inProgressMatch = buildCurrentMatchObject(false);
    onSaveDirectMatch(inProgressMatch);
    setStatusNotification('💾 ¡Partido guardado como EN CURSO! Podrás retomarlo en cualquier momento.');
    setTimeout(() => setStatusNotification(null), 4000);
  };

  // Finish and save complete match ("Finalizar y Guardar Partido Completo")
  const handleFinishMatch = () => {
    setIsMatchFinished(true);
    const completedMatch = buildCurrentMatchObject(true);
    onSaveDirectMatch(completedMatch);
    if (onClearResumeMatch) onClearResumeMatch();
    setStatusNotification(`🏆 ¡Partido "${completedMatch.title}" FINALIZADO y guardado con éxito en el Historial!`);
    setTimeout(() => setStatusNotification(null), 6000);
  };

  // Start fresh new match
  const handleStartFreshMatch = () => {
    const freshId = 'padel-match-' + Date.now();
    setCurrentMatchId(freshId);
    setMatchTitle('Partido de Pádel');
    setMatchDate(new Date().toISOString().split('T')[0]);
    setTeam1Sets([]);
    setTeam2Sets([]);
    setTeam1Games(0);
    setTeam2Games(0);
    setTeam1Points('0');
    setTeam2Points('0');
    setIsTiebreak(false);
    setTiebreakPoints({ team1: 0, team2: 0 });
    setIsMatchFinished(false);
    setMatchWinnerTeam(null);
    setServingTeam(1);
    setHistoryTimeline([]);
    setRecentActionText('✨ Nuevo partido en blanco iniciado.');
    setStatusNotification('✨ Nuevo partido iniciado.');
    setTimeout(() => setStatusNotification(null), 3000);
  };

  // Quick Resume from an existing In-Progress match
  const handleSelectResume = (m: PadelMatch) => {
    setCurrentMatchId(m.id);
    setMatchTitle(m.title);
    setMatchDate(m.date);
    if (m.court) setMatchCourt(m.court);
    if (m.youtubeUrl) {
      setVideoUrlInput(m.youtubeUrl);
      const ytid = extractYouTubeVideoId(m.youtubeUrl);
      if (ytid) setActiveVideoId(ytid);
    }
    if (m.youtubeTimestamp !== undefined) {
      setCurrentVideoTime(m.youtubeTimestamp);
      setIframeStartOffset(m.youtubeTimestamp);
    }
    if (m.team1) {
      setTeam1P1(m.team1.player1);
      setTeam1P2(m.team1.player2);
    }
    if (m.team2) {
      setTeam2P1(m.team2.player1);
      setTeam2P2(m.team2.player2);
    }
    if (m.stats) {
      setPlayerStats(m.stats);
    }
    if (m.inProgressScoreboard) {
      const sc = m.inProgressScoreboard;
      setTeam1Sets(sc.team1.sets || []);
      setTeam2Sets(sc.team2.sets || []);
      setTeam1Games(sc.team1.currentGames || 0);
      setTeam2Games(sc.team2.currentGames || 0);
      setTeam1Points(sc.team1.currentPoints || '0');
      setTeam2Points(sc.team2.currentPoints || '0');
      setIsTiebreak(sc.isTieBreak || false);
      if (sc.tieBreakPoints) setTiebreakPoints(sc.tieBreakPoints);
      setServingTeam(sc.servingTeam || 1);
      if (sc.servingPlayer) setServingPlayer(sc.servingPlayer);
    }
    if (m.pointRallies && m.pointRallies.length > 0) {
      setPointRallies(m.pointRallies);
    } else if (m.inProgressScoreboard?.pointsHistory && m.inProgressScoreboard.pointsHistory.length > 0) {
      const recovered: PointRally[] = m.inProgressScoreboard.pointsHistory.map((h, i) => ({
        id: h.id || `pt-rec-${i}`,
        pointNumber: i + 1,
        timeSec: h.timeSec || 0,
        videoTimeSec: h.timeSec || 0,
        servingPlayer: h.touchOrder?.[0] || m.team1?.player1 || 'Sacador',
        touchOrder: h.touchOrder || (h.attributedPlayer ? [h.attributedPlayer] : []),
        rallyLength: h.rallyLength || (h.touchOrder ? h.touchOrder.length : 1),
        endingAction: (h.actionType === 'direct_point' ? 'direct_point' : h.actionType) as any,
        scoringTeam: h.scoringTeam || 1,
        pointWinnerPlayer: h.actionType === 'winner' ? h.attributedPlayer : (h.forcedByPlayer || h.attributedPlayer),
        forcedByPlayer: h.forcedByPlayer,
        forcedOnPlayer: h.forcedOnPlayer,
        unforcedErrorPlayer: h.actionType === 'unforced_error' ? h.attributedPlayer : undefined,
        scoreSnapshotText: h.scoreText,
        description: h.scoreText
      }));
      setPointRallies(recovered);
    } else {
      setPointRallies([]);
    }
    if (m.youtubeRotation !== undefined) setVideoRotation(m.youtubeRotation);
    if (m.youtubeMirror !== undefined) setVideoMirror(m.youtubeMirror);
    if (m.youtubeZoom !== undefined) setVideoZoom(m.youtubeZoom);
    setRecentActionText(`🔄 Retomado partido "${m.title}". Registrados ${m.pointRallies?.length || 0} puntos en el historial.`);
  };

  return (
    <div id="youtube-studio-unified" className="space-y-6 text-slate-100">
      {/* Toast notification banner */}
      {statusNotification && (
        <div className="bg-emerald-950 border-2 border-emerald-500 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{statusNotification}</span>
        </div>
      )}

      {/* IN-PROGRESS MATCHES RESUME BAR (If any matches are incomplete) */}
      {inProgressMatches.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Partidos a medias guardados ({inProgressMatches.length}):</span>
            </div>
            <span className="text-[11px] text-amber-400/80 font-mono">
              Haz clic en cualquiera para retomarlo al instante
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {inProgressMatches.map(m => {
              const isCurrent = m.id === currentMatchId;
              return (
                <button
                  key={`resume-card-${m.id}`}
                  type="button"
                  onClick={() => handleSelectResume(m)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-900/60 border-amber-400 ring-2 ring-amber-400/30'
                      : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate max-w-[170px]">
                      {m.title}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                      {m.setsScore}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>{m.team1.player1}&{m.team1.player2} vs {m.team2.player1}&{m.team2.player2}</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      ▶️ Retomar
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TOP HEADER: LIVE MATCH SCOREBOARD BANNER (Fully Interactive & Automatic) */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
        {/* Match Title, Status & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-2xl">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={matchTitle}
                  onChange={e => setMatchTitle(e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 text-sm sm:text-base font-black text-white focus:outline-none"
                />
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                  EN CURSO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2 font-mono">
                <span>⏱️ Vídeo: {formatTime(currentVideoTime)}</span>
                <span>•</span>
                <span>Sistema: <strong className={!goldenPoint ? 'text-cyan-400' : 'text-amber-400'}>{!goldenPoint ? '🎾 Con Ventajas (Deuce / AD)' : '⭐ Punto de Oro (40-40)'}</strong></span>
                <span>•</span>
                <span>Formato: <strong className="text-emerald-400">{matchFormat === 'best_of_1' ? '🥇 1 Set Único' : matchFormat === 'best_of_3' ? '🎾 Al mejor de 3 (gana 2)' : matchFormat === 'best_of_5' ? '🎾 Al mejor de 5 (gana 3)' : '♾️ Libre'}</strong></span>
              </p>
            </div>
          </div>

          {/* Top Control Buttons: Match Format / Scoring Mode / Save Draft / Finish / Undo */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Formato de Partido (1 Set, Al mejor de 3 [2 sets para ganar], Al mejor de 5, Libre) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <select
                value={matchFormat}
                onChange={e => {
                  const val = e.target.value as any;
                  setMatchFormat(val);
                  setRecentActionText(`Formato cambiado a: ${val === 'best_of_1' ? '1 Set Único' : val === 'best_of_3' ? 'Al mejor de 3 sets (gana con 2)' : val === 'best_of_5' ? 'Al mejor de 5 sets' : 'Libre'}`);
                }}
                className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none px-2 py-1 cursor-pointer"
                title="Configuración de duración del partido"
              >
                <option value="best_of_3" className="bg-slate-900 text-white">🎾 Al mejor de 3 (Gana con 2 sets)</option>
                <option value="best_of_1" className="bg-slate-900 text-white">🥇 1 Set Único (Gana con 1 set)</option>
                <option value="best_of_5" className="bg-slate-900 text-white">🎾 Al mejor de 5 (Gana con 3 sets)</option>
                <option value="unlimited" className="bg-slate-900 text-white">♾️ Sin límite / Libre</option>
              </select>
            </div>

            {/* Sistema de Puntuación: Ventajas vs Punto de Oro */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setGoldenPoint(false);
                  setRecentActionText('🎾 Sistema Tradicional de Ventajas activado (Ventaja / Iguales / Deuce)');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  !goldenPoint
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Modo oficial tradicional: Deuce (Iguales), Ventajas (AD) y ganar por 2 puntos de diferencia"
              >
                <span>🎾 Con Ventajas</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGoldenPoint(true);
                  setRecentActionText('⭐ Modo Punto de Oro activado (Juego decisivo en 40-40)');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  goldenPoint
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Modo Punto de Oro: En 40-40 el siguiente punto gana el juego directamente"
              >
                <span>⭐ Punto de Oro</span>
              </button>
            </div>

            {/* Undo */}
            <button
              type="button"
              onClick={handleUndo}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              title="Deshacer última acción (Atajo: Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Deshacer [Z]</span>
            </button>

            {/* Save In-Progress Draft */}
            <button
              type="button"
              onClick={handleSaveInProgress}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-md shadow-cyan-950/30"
              title="Guarda el partido a medias para retomarlo en cualquier momento"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar en Curso</span>
            </button>

            {/* Finish & Complete Match */}
            <button
              type="button"
              onClick={handleFinishMatch}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition shadow-lg shadow-emerald-500/25"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Finalizar Partido</span>
            </button>

            {/* Lineup & Profiles Config Button */}
            <button
              type="button"
              onClick={() => setIsLineupModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-md"
              title="Configurar y seleccionar perfiles oficiales para este partido"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Perfiles / Alineación</span>
            </button>
          </div>
        </div>

        {/* PROMINENT MATCH VICTORY BANNER (When 2 sets or required sets are reached) */}
        {isMatchFinished && (
          <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-950 border-2 border-emerald-400 text-white p-5 rounded-2xl shadow-2xl shadow-emerald-950/60 animate-in zoom-in-95 duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-emerald-500 text-slate-950 rounded-2xl shadow-lg shadow-emerald-500/30 text-2xl font-black">
                🏆
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    ¡PARTIDO FINALIZADO!
                  </span>
                  <span className="text-xs text-emerald-300 font-mono font-bold">
                    ({team1Sets.length} {team1Sets.length === 1 ? 'Set jugado' : 'Sets jugados'})
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">
                  ¡Victoria de {matchWinnerTeam === 1 ? `${team1P1} & ${team1P2}` : `${team2P1} & ${team2P2}`}!
                </h3>
                <p className="text-xs text-emerald-200/90 font-mono mt-0.5">
                  Marcador: <strong className="text-white text-sm">{team1Sets.map((s, idx) => `${s}-${team2Sets[idx]}`).join(', ')}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleFinishMatch}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-400/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Trophy className="w-4 h-4" />
                <span>Guardar Partido Finalizado</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMatchFinished(false);
                  setRecentActionText('🔄 Partido reactivado para jugar set adicional o de exhibición.');
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                title="Continuar jugando otro set de exhibición"
              >
                <span>🔄 Jugar Set Adicional</span>
              </button>
              <button
                type="button"
                onClick={handleUndo}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl border border-slate-800 transition cursor-pointer"
                title="Deshacer el punto que cerró el partido"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Deshacer</span>
              </button>
            </div>
          </div>
        )}

        {/* DYNAMIC MATCH SITUATION BANNER (Advantages, Deuce, Golden Point, Tiebreak) */}
        {isTiebreak ? (
          <div className="bg-purple-950/60 border border-purple-500/50 text-purple-200 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg shadow-purple-950/30">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shrink-0" />
              <span>⚡ TIE-BREAK AL MEJOR DE 7 PUNTOS ({tiebreakPoints.team1} - {tiebreakPoints.team2})</span>
            </div>
            <span className="text-purple-300 text-[11px] font-normal hidden sm:inline">Diferencia mínima de 2 puntos para ganar</span>
          </div>
        ) : team1Points === 'AD' ? (
          <div className="bg-cyan-950/80 border-2 border-cyan-400 text-cyan-100 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-xl shadow-cyan-950/50 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <span>🎾 ¡VENTAJA PAREJA 1 ({team1P1} & {team1P2})! — BOLA DE JUEGO</span>
            </div>
            <span className="text-cyan-300 text-[11px] font-normal hidden sm:inline">Si anotan ganan el juego; si anota Pareja 2 vuelve a Iguales (40-40)</span>
          </div>
        ) : team2Points === 'AD' ? (
          <div className="bg-amber-950/80 border-2 border-amber-400 text-amber-100 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-xl shadow-amber-950/50 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span>🎾 ¡VENTAJA PAREJA 2 ({team2P1} & {team2P2})! — BOLA DE JUEGO</span>
            </div>
            <span className="text-amber-300 text-[11px] font-normal hidden sm:inline">Si anotan ganan el juego; si anota Pareja 1 vuelve a Iguales (40-40)</span>
          </div>
        ) : (team1Points === '40' && team2Points === '40') ? (
          !goldenPoint ? (
            <div className="bg-slate-900 border-2 border-cyan-500/70 text-cyan-200 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-xl">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                <span>⚖️ 40 - 40 IGUALES (DEUCE) — Sistema de Ventajas</span>
              </div>
              <span className="text-cyan-300/80 text-[11px] font-normal hidden sm:inline">El próximo punto otorga Ventaja (AD). Se gana con +2 puntos.</span>
            </div>
          ) : (
            <div className="bg-amber-950/90 border-2 border-amber-400 text-amber-100 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-xl animate-pulse">
              <div className="flex items-center gap-2">
                <span className="text-sm">⭐</span>
                <span>40 - 40 ¡PUNTO DE ORO! — BOLA DE JUEGO DEFINITIVA</span>
              </div>
              <span className="text-amber-300 text-[11px] font-normal hidden sm:inline">Quien gane este punto se lleva el juego</span>
            </div>
          )
        ) : null}

        {/* SCOREBOARD DISPLAY (PAREJA 1 vs PAREJA 2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TEAM 1 (Pareja 1) */}
          <div className={`p-4 rounded-2xl border-2 transition ${
            team1Points === 'AD'
              ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-400/30 shadow-xl shadow-cyan-950/60'
              : servingTeam === 1
              ? 'bg-slate-900/90 border-cyan-500/70 shadow-lg shadow-cyan-950/40'
              : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono text-xs font-black border border-cyan-800/60">
                  PAREJA 1
                </span>
                {team1Points === 'AD' && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] uppercase animate-pulse">
                    🎾 VENTAJA
                  </span>
                )}
                {servingTeam === 1 && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                    🎾 AL SAQUE ({servingPlayer})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setServingTeam(1);
                  setServingPlayer(team1P1);
                }}
                className="text-[10px] text-slate-400 hover:text-cyan-300 font-mono underline cursor-pointer"
              >
                Poner saque aquí
              </button>
            </div>

            {/* Players Selection */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getPlayerColor(team1P1) }} />
                <select
                  value={team1P1}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '__ADD_NEW__') {
                      setIsLineupModalOpen(true);
                    } else {
                      setTeam1P1(val);
                    }
                  }}
                  className="w-full bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value={team1P1} className="bg-slate-900 text-white">{team1P1}</option>
                  {profiles.filter(p => p.name !== team1P1).map(p => (
                    <option key={`t1p1-opt-${p.id}`} value={p.name} className="bg-slate-900 text-white">
                      {p.name} {p.nickname ? `(${p.nickname})` : ''} - {p.preferredSide}
                    </option>
                  ))}
                  <option value="__ADD_NEW__" className="bg-slate-800 text-cyan-300 font-bold">+ Administrar / Crear Perfil...</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getPlayerColor(team1P2) }} />
                <select
                  value={team1P2}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '__ADD_NEW__') {
                      setIsLineupModalOpen(true);
                    } else {
                      setTeam1P2(val);
                    }
                  }}
                  className="w-full bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value={team1P2} className="bg-slate-900 text-white">{team1P2}</option>
                  {profiles.filter(p => p.name !== team1P2).map(p => (
                    <option key={`t1p2-opt-${p.id}`} value={p.name} className="bg-slate-900 text-white">
                      {p.name} {p.nickname ? `(${p.nickname})` : ''} - {p.preferredSide}
                    </option>
                  ))}
                  <option value="__ADD_NEW__" className="bg-slate-800 text-cyan-300 font-bold">+ Administrar / Crear Perfil...</option>
                </select>
              </div>
            </div>

            {/* Live Score Digits */}
            <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
              {/* Sets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Sets:</span>
                {team1Sets.length > 0 ? (
                  team1Sets.map((s, idx) => (
                    <span key={`t1-set-${idx}`} className="w-6 h-6 rounded bg-slate-800 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center border border-slate-700">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600 font-mono">-</span>
                )}
              </div>

              {/* Games & Points */}
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-[9px] text-slate-400 uppercase font-semibold">Juegos</div>
                  <div className="text-2xl font-black text-white font-mono">{team1Games}</div>
                </div>
                <div className={`text-center px-3 py-1 rounded-xl border transition ${
                  team1Points === 'AD'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 ring-2 ring-cyan-400 shadow-lg'
                    : 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50'
                }`}>
                  <div className={`text-[9px] uppercase font-semibold ${team1Points === 'AD' ? 'text-slate-950 font-black' : 'text-cyan-400'}`}>
                    {isTiebreak ? 'TieBreak' : team1Points === 'AD' ? 'Ventaja' : (team1Points === '40' && team2Points === '40') ? 'Iguales' : 'Puntos'}
                  </div>
                  <div className={`text-2xl font-black font-mono ${team1Points === 'AD' ? 'text-slate-950' : 'text-cyan-300'}`}>
                    {isTiebreak ? tiebreakPoints.team1 : team1Points}
                  </div>
                </div>
              </div>

              {/* Manual Direct Point Button with Contextual Label */}
              <button
                type="button"
                onClick={() => scorePoint(1)}
                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black transition active:scale-95 shadow-md shadow-cyan-600/30 cursor-pointer flex flex-col items-center"
              >
                <span>+ Pto P1</span>
                {team1Points === 'AD' ? (
                  <span className="text-[9px] text-cyan-200">Ganar Juego</span>
                ) : team2Points === 'AD' ? (
                  <span className="text-[9px] text-cyan-200">A Iguales</span>
                ) : (team1Points === '40' && team2Points === '40') ? (
                  <span className="text-[9px] text-cyan-200">{goldenPoint ? 'Pto Oro' : 'A Ventaja'}</span>
                ) : null}
              </button>
            </div>
          </div>

          {/* TEAM 2 (Pareja 2) */}
          <div className={`p-4 rounded-2xl border-2 transition ${
            team2Points === 'AD'
              ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/30 shadow-xl shadow-amber-950/60'
              : servingTeam === 2
              ? 'bg-slate-900/90 border-amber-500/70 shadow-lg shadow-amber-950/40'
              : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 font-mono text-xs font-black border border-amber-800/60">
                  PAREJA 2
                </span>
                {team2Points === 'AD' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase animate-pulse">
                    🎾 VENTAJA
                  </span>
                )}
                {servingTeam === 2 && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                    🎾 AL SAQUE ({servingPlayer})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setServingTeam(2);
                  setServingPlayer(team2P1);
                }}
                className="text-[10px] text-slate-400 hover:text-amber-300 font-mono underline cursor-pointer"
              >
                Poner saque aquí
              </button>
            </div>

            {/* Players Selection */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getPlayerColor(team2P1) }} />
                <select
                  value={team2P1}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '__ADD_NEW__') {
                      setIsLineupModalOpen(true);
                    } else {
                      setTeam2P1(val);
                    }
                  }}
                  className="w-full bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value={team2P1} className="bg-slate-900 text-white">{team2P1}</option>
                  {profiles.filter(p => p.name !== team2P1).map(p => (
                    <option key={`t2p1-opt-${p.id}`} value={p.name} className="bg-slate-900 text-white">
                      {p.name} {p.nickname ? `(${p.nickname})` : ''} - {p.preferredSide}
                    </option>
                  ))}
                  <option value="__ADD_NEW__" className="bg-slate-800 text-cyan-300 font-bold">+ Administrar / Crear Perfil...</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getPlayerColor(team2P2) }} />
                <select
                  value={team2P2}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '__ADD_NEW__') {
                      setIsLineupModalOpen(true);
                    } else {
                      setTeam2P2(val);
                    }
                  }}
                  className="w-full bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value={team2P2} className="bg-slate-900 text-white">{team2P2}</option>
                  {profiles.filter(p => p.name !== team2P2).map(p => (
                    <option key={`t2p2-opt-${p.id}`} value={p.name} className="bg-slate-900 text-white">
                      {p.name} {p.nickname ? `(${p.nickname})` : ''} - {p.preferredSide}
                    </option>
                  ))}
                  <option value="__ADD_NEW__" className="bg-slate-800 text-cyan-300 font-bold">+ Administrar / Crear Perfil...</option>
                </select>
              </div>
            </div>

            {/* Live Score Digits */}
            <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
              {/* Sets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Sets:</span>
                {team2Sets.length > 0 ? (
                  team2Sets.map((s, idx) => (
                    <span key={`t2-set-${idx}`} className="w-6 h-6 rounded bg-slate-800 text-amber-400 font-mono font-bold text-xs flex items-center justify-center border border-slate-700">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600 font-mono">-</span>
                )}
              </div>

              {/* Games & Points */}
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-[9px] text-slate-400 uppercase font-semibold">Juegos</div>
                  <div className="text-2xl font-black text-white font-mono">{team2Games}</div>
                </div>
                <div className={`text-center px-3 py-1 rounded-xl border transition ${
                  team2Points === 'AD'
                    ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400 shadow-lg'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                }`}>
                  <div className={`text-[9px] uppercase font-semibold ${team2Points === 'AD' ? 'text-slate-950 font-black' : 'text-amber-400'}`}>
                    {isTiebreak ? 'TieBreak' : team2Points === 'AD' ? 'Ventaja' : (team1Points === '40' && team2Points === '40') ? 'Iguales' : 'Puntos'}
                  </div>
                  <div className={`text-2xl font-black font-mono ${team2Points === 'AD' ? 'text-slate-950' : 'text-amber-300'}`}>
                    {isTiebreak ? tiebreakPoints.team2 : team2Points}
                  </div>
                </div>
              </div>

              {/* Manual Direct Point Button with Contextual Label */}
              <button
                type="button"
                onClick={() => scorePoint(2)}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black transition active:scale-95 shadow-md shadow-amber-600/30 cursor-pointer flex flex-col items-center"
              >
                <span>+ Pto P2</span>
                {team2Points === 'AD' ? (
                  <span className="text-[9px] text-amber-200">Ganar Juego</span>
                ) : team1Points === 'AD' ? (
                  <span className="text-[9px] text-amber-200">A Iguales</span>
                ) : (team1Points === '40' && team2Points === '40') ? (
                  <span className="text-[9px] text-amber-200">{goldenPoint ? 'Pto Oro' : 'A Ventaja'}</span>
                ) : null}
              </button>
            </div>
          </div>
        </div>

        {/* Live Narration / Feedback Bar */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-emerald-300">{recentActionText}</span>
          </div>
          {interimTranscript && (
            <span className="text-amber-300 italic text-[11px]">
              Escuchando: "{interimTranscript}"
            </span>
          )}
        </div>

        {/* Live Ongoing Rally Sequence Banner */}
        {currentRallyTouches.length > 0 && (
          <div className="p-3 bg-emerald-950/40 border-2 border-emerald-500/50 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg shadow-emerald-950/40 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black font-mono text-xs">
                🎾 PELOTEO EN CURSO ({currentRallyTouches.length} TOQUES)
              </span>
              <span className="text-slate-300 text-[11px] font-mono flex items-center gap-1 overflow-x-auto max-w-md">
                {currentRallyTouches.map((p, idx) => (
                  <React.Fragment key={`live-touch-${idx}-${p}`}>
                    <span
                      className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-200 border border-slate-800 font-bold"
                      style={{ borderLeftColor: getPlayerColor(p), borderLeftWidth: 3 }}
                    >
                      {idx + 1}. {p}
                    </span>
                    {idx < currentRallyTouches.length - 1 && <span className="text-slate-500">➔</span>}
                  </React.Fragment>
                ))}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentRallyTouches(prev => prev.slice(0, -1))}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg border border-slate-700 transition cursor-pointer"
                title="Deshacer el último toque registrado del peloteo"
              >
                Deshacer toque
              </button>
              <button
                type="button"
                onClick={() => setCurrentRallyTouches([])}
                className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[11px] rounded-lg border border-rose-800/60 transition cursor-pointer"
                title="Reiniciar contador de peloteo actual"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MAIN TWO-COLUMN STUDIO: YOUTUBE VIDEO ON LEFT, ERGONOMIC SCORING PAD ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: YOUTUBE PLAYER & VIDEO LOADER (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* YouTube Video URL Loader */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <form
              onSubmit={e => {
                e.preventDefault();
                const ytid = extractYouTubeVideoId(videoUrlInput);
                if (ytid) {
                  setActiveVideoId(ytid);
                  setIframeStartOffset(0);
                  setCurrentVideoTime(0);
                  setIsPlayingTimer(true);
                  setRecentActionText(`🎬 Vídeo cargado: ${ytid}`);
                }
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Youtube className="w-4 h-4 text-red-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={videoUrlInput}
                  onChange={e => setVideoUrlInput(e.target.value)}
                  placeholder="Pega el enlace de YouTube del partido (ej. https://www.youtube.com/watch?v=...)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
              >
                Cargar Vídeo
              </button>
            </form>

            {/* Sample Videos Shortcuts */}
            <div className="flex items-center gap-2 overflow-x-auto text-[11px] text-slate-400 pt-1">
              <span className="shrink-0 font-medium">Ejemplos:</span>
              {SAMPLE_PADEL_VIDEOS.map((vid, idx) => (
                <button
                  key={`sample-vid-${idx}`}
                  type="button"
                  onClick={() => {
                    setVideoUrlInput(vid.url);
                    setActiveVideoId(vid.id);
                    setIframeStartOffset(0);
                    setCurrentVideoTime(0);
                    setIsPlayingTimer(true);
                    setRecentActionText(`🎬 Vídeo de ejemplo cargado: ${vid.title}`);
                  }}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition whitespace-nowrap cursor-pointer"
                >
                  {vid.title}
                </button>
              ))}
            </div>
          </div>

          {/* YouTube Embed Player with Interactive Rotation, Flip & Scaling */}
          <RotatableYouTubePlayer
            videoId={activeVideoId}
            title="YouTube Padel Player"
            startTime={iframeStartOffset}
            iframeRef={iframeRef}
            rotation={videoRotation}
            onRotationChange={setVideoRotation}
            mirror={videoMirror}
            onMirrorChange={setVideoMirror}
            zoom={videoZoom}
            onZoomChange={setVideoZoom}
          />

          {/* Player & Match Stopwatch Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={isPlayingTimer ? handlePauseVideo : handlePlayVideo}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isPlayingTimer
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                }`}
              >
                {isPlayingTimer ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Reproducir / Cronómetro</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSeek(currentVideoTime - 10)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-mono transition cursor-pointer flex items-center gap-1"
                title="Retroceder 10 segundos"
              >
                <RotateCcw className="w-3 h-3" />
                -10s
              </button>

              <button
                type="button"
                onClick={() => handleSeek(currentVideoTime + 10)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-mono transition cursor-pointer flex items-center gap-1"
                title="Avanzar 10 segundos"
              >
                +10s
              </button>

              <button
                type="button"
                onClick={() => handleSeek(0)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-mono transition cursor-pointer"
                title="Reiniciar a 00:00"
              >
                00:00
              </button>
            </div>

            {/* Video Timestamp display */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 text-[10px] uppercase font-bold">Tiempo Partido:</span>
              <span className="text-emerald-300 font-black text-sm">{formatTime(currentVideoTime)}</span>
            </div>
          </div>

          {/* Action / Point Events Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                Cronología de Puntos y Acciones ({historyTimeline.length})
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">Últimas acciones registradas</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {historyTimeline.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-[11px] bg-slate-950 rounded-xl border border-slate-800/60">
                  Ninguna acción registrada aún. Usa el micro, atajos de teclado o botones para anotar.
                </div>
              ) : (
                historyTimeline.map((item, idx) => (
                  <div
                    key={`hist-item-${idx}-${item.id}`}
                    className="p-2 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                        ⏱️ {formatTime(item.videoTimeSec)}
                      </span>
                      <span className="text-slate-200 font-medium">
                        {item.description}
                      </span>
                    </div>
                    {item.player && (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: getPlayerColor(item.player) }}
                      >
                        {item.player}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: VOICE SCORER & ERGONOMIC MASTER PAD (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* VOICE SCORER ACTIVATION CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                  Anotación por Voz Continua
                </h4>
              </div>
              <button
                type="button"
                onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/25'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isListening ? 'Detener Voz' : 'Iniciar Dictado de Voz'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Habla con naturalidad durante el partido. Ejemplos reconocidos:
              <br />
              • Peloteo continuo: <strong className="text-emerald-300 font-mono">"Víctor Mikel Víctor Mikel error forzado"</strong>
              <br />
              • Acción directa: <strong className="text-cyan-300 font-mono">"Winner Víctor"</strong> o <strong className="text-rose-300 font-mono">"Mikel error no forzado"</strong> (suma punto al rival automáticamente).
            </p>
          </div>

          {/* 1. SELECT ACTIVE PLAYER (KEYS 1, 2, 3, 4) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>1. Jugador Activo (Teclas 1 - 4):</span>
              <span className="text-cyan-400 font-mono">Activo: {activePlayerName}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {allPlayers.map((playerName, idx) => {
                const isSelected = selectedPlayerIdx === idx;
                const isTeam1 = idx < 2;
                const pColor = getPlayerColor(playerName);
                const pStats = playerStats[playerName] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };

                return (
                  <button
                    key={`select-player-btn-${idx}-${playerName}`}
                    type="button"
                    onClick={() => setSelectedPlayerIdx(idx)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-500 ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-950/50'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                        isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        [{idx + 1}]
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        P{isTeam1 ? 1 : 2}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pColor }} />
                      <span className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {playerName}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center justify-between">
                      <span>{pStats.touches} toqs</span>
                      <span className="text-emerald-400 font-bold">{pStats.winners}W</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 2. MASTER PAD TÁCTIL (J, K, L, Ñ) */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                <span>2. Acciones para <strong className="text-cyan-300">{activePlayerName}</strong> (Teclas J, K, L, Ñ):</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* J: +1 TOQUE */}
                <button
                  type="button"
                  onClick={() => addTouch(activePlayerName)}
                  className="p-3 bg-gradient-to-b from-emerald-950/80 to-slate-950 hover:from-emerald-900 text-emerald-300 hover:text-white border-2 border-emerald-700/60 hover:border-emerald-500 rounded-xl transition active:scale-95 flex flex-col justify-center items-center gap-0.5 cursor-pointer shadow-md shadow-emerald-950/30"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 rounded text-[10px] font-mono font-black text-emerald-300">[J]</span>
                    <span className="text-xs sm:text-sm font-black">🎾 +1 TOQUE</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Total: {playerStats[activePlayerName]?.touches || 0}
                  </span>
                </button>

                {/* K: WINNER */}
                <button
                  type="button"
                  onClick={() => {
                    const scoringTeam = selectedPlayerIdx < 2 ? 1 : 2;
                    scorePoint(scoringTeam, activePlayerName, 'winner');
                  }}
                  className="p-3 bg-gradient-to-b from-cyan-950/80 to-slate-950 hover:from-cyan-900 text-cyan-300 hover:text-white border-2 border-cyan-700/60 hover:border-cyan-500 rounded-xl transition active:scale-95 flex flex-col justify-center items-center gap-0.5 cursor-pointer shadow-md shadow-cyan-950/30"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-cyan-500/20 rounded text-[10px] font-mono font-black text-cyan-300">[K]</span>
                    <span className="text-xs sm:text-sm font-black">⚡ WINNER</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    +1 Pto Pareja {selectedPlayerIdx < 2 ? 1 : 2}
                  </span>
                </button>

                {/* L: ERROR FORZADO */}
                <button
                  type="button"
                  onClick={() => {
                    const scoringTeam = selectedPlayerIdx < 2 ? 2 : 1;
                    scorePoint(scoringTeam, activePlayerName, 'forced_error');
                  }}
                  className="p-3 bg-gradient-to-b from-amber-950/80 to-slate-950 hover:from-amber-900 text-amber-300 hover:text-white border-2 border-amber-700/60 hover:border-amber-500 rounded-xl transition active:scale-95 flex flex-col justify-center items-center gap-0.5 cursor-pointer shadow-md shadow-amber-950/30"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-amber-500/20 rounded text-[10px] font-mono font-black text-amber-300">[L]</span>
                    <span className="text-xs sm:text-sm font-black">🛡️ FORZADO</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    +1 Pto Rival (P{selectedPlayerIdx < 2 ? 2 : 1})
                  </span>
                </button>

                {/* Ñ: ERROR NO FORZADO */}
                <button
                  type="button"
                  onClick={() => {
                    const scoringTeam = selectedPlayerIdx < 2 ? 2 : 1;
                    scorePoint(scoringTeam, activePlayerName, 'unforced_error');
                  }}
                  className="p-3 bg-gradient-to-b from-rose-950/80 to-slate-950 hover:from-rose-900 text-rose-300 hover:text-white border-2 border-rose-700/60 hover:border-rose-500 rounded-xl transition active:scale-95 flex flex-col justify-center items-center gap-0.5 cursor-pointer shadow-md shadow-rose-950/30"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-rose-500/20 rounded text-[10px] font-mono font-black text-rose-300">[Ñ]</span>
                    <span className="text-xs sm:text-sm font-black">❌ NO FORZADO</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    +1 Pto Rival (P{selectedPlayerIdx < 2 ? 2 : 1})
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* INDIVIDUAL PLAYER STATS SUMMARY TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
              Estadísticas Acumuladas en Este Partido
            </h4>

            <div className="space-y-2">
              {allPlayers.map((pName, pIdx) => {
                const s = playerStats[pName] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
                const isTeam1 = pIdx < 2;
                return (
                  <div
                    key={`stat-row-${pName}`}
                    className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getPlayerColor(pName) }} />
                      <span className="font-bold text-white">{pName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">P{isTeam1 ? 1 : 2}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-emerald-400">{s.touches} toqs</span>
                      <span className="text-cyan-400 font-bold">{s.winners} W</span>
                      <span className="text-amber-400">{s.forcedErrors} EF</span>
                      <span className="text-rose-400 font-bold">{s.unforcedErrors} ENF</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Lineup & Registered Profiles Modal */}
      {isLineupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Configurar Alineación del Partido (Perfiles)
              </h3>
              <button
                type="button"
                onClick={() => setIsLineupModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <MatchLineupSelector
              profiles={profiles}
              lineup={{
                team1Player1: team1P1,
                team1Player2: team1P2,
                team2Player1: team2P1,
                team2Player2: team2P2
              }}
              onChangeLineup={(newLineup) => {
                setTeam1P1(newLineup.team1Player1);
                setTeam1P2(newLineup.team1Player2);
                setTeam2P1(newLineup.team2Player1);
                setTeam2P2(newLineup.team2Player2);
                // sync stats
                setPlayerStats(prev => {
                  const next = { ...prev };
                  [newLineup.team1Player1, newLineup.team1Player2, newLineup.team2Player1, newLineup.team2Player2].forEach(p => {
                    if (p && !next[p]) {
                      next[p] = { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
                    }
                  });
                  return next;
                });
              }}
              onSaveNewProfile={onSaveNewProfile}
            />

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsLineupModalOpen(false)}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer shadow-emerald-500/20"
              >
                Aplicar Alineación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
