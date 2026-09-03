import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy,
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  CheckCircle2,
  Activity,
  Mic,
  MicOff,
  Keyboard,
  Maximize2,
  Minimize2,
  Tv,
  Settings2,
  Plus,
  Minus,
  Save,
  Flame,
  AlertCircle
} from 'lucide-react';
import { PadelMatch, PlayerStats, LiveScoreboardState, PlayerProfile } from '../types';
import { getPlayerColor } from '../utils/statsCalculator';
import { playPointSound } from '../utils/soundEffects';
import { parseSpeechPadel } from '../utils/speechPadelParser';
import { MatchLineupSelector, MatchLineup } from './MatchLineupSelector';

interface LiveScoreboardProps {
  knownPlayers: string[];
  profiles?: PlayerProfile[];
  onSaveNewProfile?: (profile: PlayerProfile) => void;
  onSaveMatch: (match: PadelMatch) => void;
  initialTeam1?: { p1: string; p2: string };
  initialTeam2?: { p1: string; p2: string };
  compactMode?: boolean;
}

const POINT_SEQUENCE: ('0' | '15' | '30' | '40')[] = ['0', '15', '30', '40'];

interface ScoreSnapshot {
  team1Sets: number[];
  team2Sets: number[];
  team1Games: number;
  team2Games: number;
  team1Points: '0' | '15' | '30' | '40' | 'AD' | number;
  team2Points: '0' | '15' | '30' | '40' | 'AD' | number;
  currentSet: number;
  isTieBreak: boolean;
  tieBreakPoints: { team1: number; team2: number };
  servingTeam: 1 | 2;
  servingPlayer: string;
  isFinished: boolean;
  winnerTeam?: 1 | 2;
  stats: Record<string, PlayerStats>;
  actionDescription: string;
}

export const LiveScoreboard: React.FC<LiveScoreboardProps> = ({
  knownPlayers,
  profiles = [],
  onSaveNewProfile,
  onSaveMatch,
  initialTeam1,
  initialTeam2,
  compactMode = false
}) => {
  // Players config
  const [team1P1, setTeam1P1] = useState<string>(initialTeam1?.p1 || knownPlayers[0] || 'Álvaro');
  const [team1P2, setTeam1P2] = useState<string>(initialTeam1?.p2 || knownPlayers[1] || 'Carlos');
  const [team2P1, setTeam2P1] = useState<string>(initialTeam2?.p1 || knownPlayers[2] || 'Pablo');
  const [team2P2, setTeam2P2] = useState<string>(initialTeam2?.p2 || knownPlayers[3] || 'Marcos');
  const [matchTitle, setMatchTitle] = useState<string>('Partido de Pádel en Directo');
  const [courtName, setCourtName] = useState<string>('Pista Central');

  // Match Scoring State
  const [team1Sets, setTeam1Sets] = useState<number[]>([0, 0, 0]);
  const [team2Sets, setTeam2Sets] = useState<number[]>([0, 0, 0]);
  const [team1Games, setTeam1Games] = useState<number>(0);
  const [team2Games, setTeam2Games] = useState<number>(0);
  const [team1Points, setTeam1Points] = useState<'0' | '15' | '30' | '40' | 'AD' | number>('0');
  const [team2Points, setTeam2Points] = useState<'0' | '15' | '30' | '40' | 'AD' | number>('0');
  const [currentSet, setCurrentSet] = useState<number>(0); // 0 = Set 1, 1 = Set 2, 2 = Set 3
  const [isTieBreak, setIsTieBreak] = useState<boolean>(false);
  const [tieBreakPoints, setTieBreakPoints] = useState<{ team1: number; team2: number }>({ team1: 0, team2: 0 });
  const [goldenPointMode, setGoldenPointMode] = useState<boolean>(true); // Punto de Oro at 40-40
  const [servingTeam, setServingTeam] = useState<1 | 2>(1);
  const [servingPlayer, setServingPlayer] = useState<string>(team1P1);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [winnerTeam, setWinnerTeam] = useState<1 | 2 | undefined>(undefined);

  // Player stats accumulated during live match
  const [liveStats, setLiveStats] = useState<Record<string, PlayerStats>>({
    [team1P1]: { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 },
    [team1P2]: { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 },
    [team2P1]: { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 },
    [team2P2]: { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 },
  });

  // Undo / History stack
  const [historyStack, setHistoryStack] = useState<ScoreSnapshot[]>([]);
  const [recentActionText, setRecentActionText] = useState<string | null>(null);

  // Match Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Sound and Display toggles
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [tvViewMode, setTvViewMode] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [activeVoiceListen, setActiveVoiceListen] = useState<boolean>(false);
  const [voiceInterim, setVoiceInterim] = useState<string>('');
  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  const allPlayers = [team1P1, team1P2, team2P1, team2P2];
  const activePlayerName = allPlayers[selectedPlayerIdx] || team1P1;

  // Keep stats map in sync with current player names
  useEffect(() => {
    setLiveStats(prev => {
      const next = { ...prev };
      allPlayers.forEach(p => {
        if (!next[p]) {
          next[p] = { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
        }
      });
      return next;
    });
  }, [team1P1, team1P2, team2P1, team2P2]);

  // Match Timer effect
  useEffect(() => {
    if (isTimerRunning && !isFinished) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, isFinished]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}:${(mins % 60).toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Push snapshot before modifying state
  const takeSnapshot = (actionDescription: string) => {
    const snap: ScoreSnapshot = {
      team1Sets: [...team1Sets],
      team2Sets: [...team2Sets],
      team1Games,
      team2Games,
      team1Points,
      team2Points,
      currentSet,
      isTieBreak,
      tieBreakPoints: { ...tieBreakPoints },
      servingTeam,
      servingPlayer,
      isFinished,
      winnerTeam,
      stats: JSON.parse(JSON.stringify(liveStats)),
      actionDescription
    };
    setHistoryStack(prev => [snap, ...prev.slice(0, 49)]);
  };

  // Undo point
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const [prevSnap, ...rest] = historyStack;
    setTeam1Sets(prevSnap.team1Sets);
    setTeam2Sets(prevSnap.team2Sets);
    setTeam1Games(prevSnap.team1Games);
    setTeam2Games(prevSnap.team2Games);
    setTeam1Points(prevSnap.team1Points);
    setTeam2Points(prevSnap.team2Points);
    setCurrentSet(prevSnap.currentSet);
    setIsTieBreak(prevSnap.isTieBreak);
    setTieBreakPoints(prevSnap.tieBreakPoints);
    setServingTeam(prevSnap.servingTeam);
    setServingPlayer(prevSnap.servingPlayer);
    setIsFinished(prevSnap.isFinished);
    setWinnerTeam(prevSnap.winnerTeam);
    setLiveStats(prevSnap.stats);
    setHistoryStack(rest);

    if (soundEnabled) playPointSound('undo');
    setRecentActionText(`Deshecho: ${prevSnap.actionDescription}`);
    setTimeout(() => setRecentActionText(null), 3000);
  };

  // Toggle Serve manually or on game end
  const handleToggleServe = () => {
    takeSnapshot('Cambio de saque');
    if (servingTeam === 1) {
      setServingTeam(2);
      setServingPlayer(servingPlayer === team2P1 ? team2P2 : team2P1);
    } else {
      setServingTeam(1);
      setServingPlayer(servingPlayer === team1P1 ? team1P2 : team1P1);
    }
  };

  // Next Set transition helper
  const finalizeSet = (setWinner: 1 | 2, finalT1Games: number, finalT2Games: number) => {
    const nextT1Sets = [...team1Sets];
    const nextT2Sets = [...team2Sets];
    nextT1Sets[currentSet] = finalT1Games;
    nextT2Sets[currentSet] = finalT2Games;
    setTeam1Sets(nextT1Sets);
    setTeam2Sets(nextT2Sets);

    // Count sets won
    let t1SetsWon = 0;
    let t2SetsWon = 0;
    for (let i = 0; i <= currentSet; i++) {
      if (nextT1Sets[i] > nextT2Sets[i]) t1SetsWon++;
      else if (nextT2Sets[i] > nextT1Sets[i]) t2SetsWon++;
    }

    if (t1SetsWon >= 2) {
      setIsFinished(true);
      setWinnerTeam(1);
      if (soundEnabled) playPointSound('match');
      setRecentActionText(`🏆 ¡VICTORIA DE ${team1P1} & ${team1P2}! Partidazo ganado.`);
      return;
    } else if (t2SetsWon >= 2) {
      setIsFinished(true);
      setWinnerTeam(2);
      if (soundEnabled) playPointSound('match');
      setRecentActionText(`🏆 ¡VICTORIA DE ${team2P1} & ${team2P2}! Partidazo ganado.`);
      return;
    }

    // Advance to next set
    setCurrentSet(prev => prev + 1);
    setTeam1Games(0);
    setTeam2Games(0);
    setTeam1Points('0');
    setTeam2Points('0');
    setIsTieBreak(false);
    setTieBreakPoints({ team1: 0, team2: 0 });

    // Switch serve on set end
    handleToggleServe();

    if (soundEnabled) playPointSound('set');
    setRecentActionText(`🎾 ¡Set ${currentSet + 1} finalizado! (${finalT1Games}-${finalT2Games}). Comienza el Set ${currentSet + 2}.`);
  };

  // Game Won transition helper
  const finalizeGame = (gameWinner: 1 | 2) => {
    let nextT1Games = team1Games + (gameWinner === 1 ? 1 : 0);
    let nextT2Games = team2Games + (gameWinner === 2 ? 1 : 0);

    setTeam1Points('0');
    setTeam2Points('0');

    // Switch serve after every game
    setServingTeam(prev => (prev === 1 ? 2 : 1));
    setServingPlayer(prev => {
      if (servingTeam === 1) {
        return prev === team2P1 ? team2P2 : team2P1;
      } else {
        return prev === team1P1 ? team1P2 : team1P1;
      }
    });

    // Check Set winning conditions:
    // 1. Regular set win: 6-0 to 6-4 (or 7-5)
    if (nextT1Games >= 6 && nextT1Games - nextT2Games >= 2) {
      setTeam1Games(nextT1Games);
      finalizeSet(1, nextT1Games, nextT2Games);
      return;
    } else if (nextT2Games >= 6 && nextT2Games - nextT1Games >= 2) {
      setTeam2Games(nextT2Games);
      finalizeSet(2, nextT1Games, nextT2Games);
      return;
    }

    // 2. Tie-break trigger at 6-6
    if (nextT1Games === 6 && nextT2Games === 6) {
      setTeam1Games(6);
      setTeam2Games(6);
      setIsTieBreak(true);
      setTieBreakPoints({ team1: 0, team2: 0 });
      if (soundEnabled) playPointSound('golden_point');
      setRecentActionText(`🔥 ¡Llegamos al TIE-BREAK a 7 puntos!`);
      return;
    }

    // Regular game won
    setTeam1Games(nextT1Games);
    setTeam2Games(nextT2Games);
    if (soundEnabled) playPointSound('game');
    setRecentActionText(`Juego para Pareja ${gameWinner} (${nextT1Games}-${nextT2Games})`);
  };

  // Main Point Scorer Engine
  const scorePoint = useCallback((
    scoringTeam: 1 | 2,
    playerAttributed?: string,
    actionType: 'direct' | 'winner' | 'unforced_error' | 'forced_error' = 'direct'
  ) => {
    if (isFinished) return;

    let actionLabel = `Punto Pareja ${scoringTeam}`;
    if (playerAttributed) {
      if (actionType === 'winner') actionLabel = `Winner de ${playerAttributed}`;
      else if (actionType === 'unforced_error') actionLabel = `Error No Forzado de ${playerAttributed}`;
      else if (actionType === 'forced_error') actionLabel = `Error Forzado de ${playerAttributed}`;
    }

    takeSnapshot(actionLabel);

    // Update player stats if attributed
    if (playerAttributed) {
      setLiveStats(prev => {
        const cur = prev[playerAttributed] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
        const updated = { ...cur };
        if (actionType === 'winner') updated.winners += 1;
        else if (actionType === 'unforced_error') updated.unforcedErrors += 1;
        else if (actionType === 'forced_error') updated.forcedErrors += 1;
        return { ...prev, [playerAttributed]: updated };
      });
    }

    // 1. TIE-BREAK SCORING (First to 7 with +2 lead)
    if (isTieBreak) {
      const nextT1 = tieBreakPoints.team1 + (scoringTeam === 1 ? 1 : 0);
      const nextT2 = tieBreakPoints.team2 + (scoringTeam === 2 ? 1 : 0);
      setTieBreakPoints({ team1: nextT1, team2: nextT2 });

      // Change serve in tie-break: Point 1 has 1 serve, then alternating 2 serves each
      const totalPoints = nextT1 + nextT2;
      if (totalPoints % 2 === 1) {
        setServingTeam(prev => (prev === 1 ? 2 : 1));
      }

      if (nextT1 >= 7 && nextT1 - nextT2 >= 2) {
        // Team 1 wins tie-break (7-6)
        finalizeSet(1, 7, 6);
      } else if (nextT2 >= 7 && nextT2 - nextT1 >= 2) {
        // Team 2 wins tie-break (6-7)
        finalizeSet(2, 6, 7);
      } else {
        if (soundEnabled) playPointSound('point');
        setRecentActionText(`Tie-Break: ${nextT1} - ${nextT2}`);
      }
      return;
    }

    // 2. REGULAR GAME SCORING (0, 15, 30, 40, AD, Punto de Oro)
    const p1 = team1Points;
    const p2 = team2Points;

    if (goldenPointMode) {
      // PUNTO DE ORO (Golden Point at 40-40)
      if (p1 === '40' && p2 === '40') {
        // Sudden death point!
        finalizeGame(scoringTeam);
        return;
      }

      if (scoringTeam === 1) {
        if (p1 === '0') setTeam1Points('15');
        else if (p1 === '15') setTeam1Points('30');
        else if (p1 === '30') {
          setTeam1Points('40');
          if (p2 === '40' && soundEnabled) playPointSound('golden_point');
        } else if (p1 === '40') {
          // Team 1 wins game
          finalizeGame(1);
          return;
        }
      } else {
        if (p2 === '0') setTeam2Points('15');
        else if (p2 === '15') setTeam2Points('30');
        else if (p2 === '30') {
          setTeam2Points('40');
          if (p1 === '40' && soundEnabled) playPointSound('golden_point');
        } else if (p2 === '40') {
          // Team 2 wins game
          finalizeGame(2);
          return;
        }
      }
    } else {
      // ADVANTAGE (Ventaja tradicional)
      if (scoringTeam === 1) {
        if (p1 === '0') setTeam1Points('15');
        else if (p1 === '15') setTeam1Points('30');
        else if (p1 === '30') setTeam1Points('40');
        else if (p1 === '40') {
          if (p2 === '40') setTeam1Points('AD');
          else if (p2 === 'AD') setTeam2Points('40'); // Back to deuce
          else {
            finalizeGame(1);
            return;
          }
        } else if (p1 === 'AD') {
          finalizeGame(1);
          return;
        }
      } else {
        if (p2 === '0') setTeam2Points('15');
        else if (p2 === '15') setTeam2Points('30');
        else if (p2 === '30') setTeam2Points('40');
        else if (p2 === '40') {
          if (p1 === '40') setTeam2Points('AD');
          else if (p1 === 'AD') setTeam1Points('40'); // Back to deuce
          else {
            finalizeGame(2);
            return;
          }
        } else if (p2 === 'AD') {
          finalizeGame(2);
          return;
        }
      }
    }

    if (soundEnabled) playPointSound('point');
    setRecentActionText(actionLabel);
  }, [
    isFinished,
    isTieBreak,
    tieBreakPoints,
    team1Points,
    team2Points,
    goldenPointMode,
    soundEnabled
  ]);

  // Touch counter helper
  const addTouch = (player: string) => {
    takeSnapshot(`+1 Toque de ${player}`);
    setLiveStats(prev => {
      const cur = prev[player] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
      return { ...prev, [player]: { ...cur, touches: cur.touches + 1 } };
    });
    setRecentActionText(`🎾 +1 Toque para ${player}`);
  };

  // Reset / New match
  const handleResetMatch = () => {
    if (window.confirm('¿Seguro que deseas reiniciar el marcador a 0-0 y limpiar las estadísticas del partido actual?')) {
      takeSnapshot('Reinicio de partido');
      setTeam1Sets([0, 0, 0]);
      setTeam2Sets([0, 0, 0]);
      setTeam1Games(0);
      setTeam2Games(0);
      setTeam1Points('0');
      setTeam2Points('0');
      setCurrentSet(0);
      setIsTieBreak(false);
      setTieBreakPoints({ team1: 0, team2: 0 });
      setIsFinished(false);
      setWinnerTeam(undefined);
      setTimerSeconds(0);
      setLiveStats({
        [team1P1]: { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 },
        [team1P2]: { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 },
        [team2P1]: { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 },
        [team2P2]: { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 },
      });
      setRecentActionText('Marcador reiniciado');
    }
  };

  // Keyboard Shortcuts Listener (1-4 for player select, J-K-L-Ñ for instant actions)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key;
      const upperKey = key.toUpperCase();

      // Number keys 1, 2, 3, 4: Select active player
      if (upperKey === '1') {
        setSelectedPlayerIdx(0);
        setRecentActionText(`Jugador activo: [1] ${allPlayers[0]}`);
        if (navigator.vibrate) navigator.vibrate(30);
      } else if (upperKey === '2') {
        setSelectedPlayerIdx(1);
        setRecentActionText(`Jugador activo: [2] ${allPlayers[1]}`);
        if (navigator.vibrate) navigator.vibrate(30);
      } else if (upperKey === '3') {
        setSelectedPlayerIdx(2);
        setRecentActionText(`Jugador activo: [3] ${allPlayers[2]}`);
        if (navigator.vibrate) navigator.vibrate(30);
      } else if (upperKey === '4') {
        setSelectedPlayerIdx(3);
        setRecentActionText(`Jugador activo: [4] ${allPlayers[3]}`);
        if (navigator.vibrate) navigator.vibrate(30);
      }
      // Action keys for the currently selected player:
      // J = Toque
      else if (upperKey === 'J') {
        const p = allPlayers[selectedPlayerIdx] || team1P1;
        addTouch(p);
        if (navigator.vibrate) navigator.vibrate(40);
      }
      // K = Winner (gives point to player's team)
      else if (upperKey === 'K') {
        const p = allPlayers[selectedPlayerIdx] || team1P1;
        const scoringTeam = selectedPlayerIdx < 2 ? 1 : 2;
        scorePoint(scoringTeam, p, 'winner');
        if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
      }
      // L = Error Forzado (gives point to rival team)
      else if (upperKey === 'L') {
        const p = allPlayers[selectedPlayerIdx] || team1P1;
        const scoringTeam = selectedPlayerIdx < 2 ? 2 : 1;
        scorePoint(scoringTeam, p, 'forced_error');
        if (navigator.vibrate) navigator.vibrate(50);
      }
      // Ñ or ; or + = Error No Forzado (gives point to rival team)
      else if (upperKey === 'Ñ' || key === 'ñ' || key === 'Ñ' || key === ';' || key === '+') {
        const p = allPlayers[selectedPlayerIdx] || team1P1;
        const scoringTeam = selectedPlayerIdx < 2 ? 2 : 1;
        scorePoint(scoringTeam, p, 'unforced_error');
        if (navigator.vibrate) navigator.vibrate(50);
      }
      // Utility shortcuts
      else if (upperKey === 'S') {
        // Switch serve
        handleToggleServe();
      } else if (upperKey === 'Z') {
        e.preventDefault();
        handleUndo();
      } else if (upperKey === 'A') {
        // Quick point Pareja 1
        scorePoint(1);
      } else if (upperKey === 'D') {
        // Quick point Pareja 2
        scorePoint(2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scorePoint, selectedPlayerIdx, allPlayers, addTouch]);

  // Relaxed and smart voice recognition listener for Live Scoreboard
  const startVoiceScorer = async () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Tu navegador no soporta reconocimiento de voz continuo.');
        return;
      }
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const rawTranscript = event.results[i][0].transcript;
          const transcript = rawTranscript.toLowerCase().trim();

          if (event.results[i].isFinal) {
            setVoiceInterim('');

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
            if (transcript.includes('primer saque fuera') || transcript.includes('falla primer saque') || transcript.includes('falla el primer saque') || transcript.includes('primer servicio a la red')) {
              setRecentActionText(`🎾 Primer servicio fallado por ${servingPlayer}. Segundo saque en juego (cuenta como 1 toque).`);
              return;
            }
            if (transcript.includes('cambiar saque') || transcript.includes('cambia saque') || transcript.includes('siguiente saque')) {
              handleToggleServe();
              return;
            }

            // Parse continuous rally narration ("victor mikel victor mikel error no forzado", "mikelboque", "victortoca", etc.)
            const parseResult = parseSpeechPadel(rawTranscript, allPlayers);

            if (parseResult.actions.length > 0) {
              parseResult.actions.forEach(action => {
                const isTeam1 = action.player === team1P1 || action.player === team1P2;

                if (action.type === 'touch') {
                  for (let c = 0; c < action.count; c++) {
                    addTouch(action.player);
                  }
                } else if (action.type === 'winner') {
                  scorePoint(isTeam1 ? 1 : 2, action.player, 'winner');
                } else if (action.type === 'unforced_error') {
                  scorePoint(isTeam1 ? 2 : 1, action.player, 'unforced_error');
                } else if (action.type === 'forced_error') {
                  scorePoint(isTeam1 ? 2 : 1, action.player, 'forced_error');
                }
              });

              setRecentActionText(parseResult.summaryMessage || `🎤 ${rawTranscript}`);
            } else {
              // Direct team triggers
              if (transcript.includes('pareja 1') || transcript.includes('equipo 1') || transcript.includes('punto uno')) {
                scorePoint(1);
              } else if (transcript.includes('pareja 2') || transcript.includes('equipo 2') || transcript.includes('punto dos')) {
                scorePoint(2);
              }
            }
          } else {
            setVoiceInterim(transcript);
          }
        }
      };

      recognition.start();
      setActiveVoiceListen(true);
      setRecentActionText('🎙️ Marcador por voz activo: Narra libremente (ej. "Víctor Mikel Víctor Mikel error no forzado" o "Mikel toque")');
    } catch (e) {
      console.warn(e);
    }
  };

  const stopVoiceScorer = () => {
    setActiveVoiceListen(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    setVoiceInterim('');
  };

  // Compile and Save Match into App History
  const handleSaveToHistory = () => {
    // Build sets string e.g. "6-4, 3-6, 7-6"
    const setsStrs: string[] = [];
    for (let i = 0; i <= currentSet; i++) {
      const g1 = i === currentSet && !isFinished ? team1Games : team1Sets[i];
      const g2 = i === currentSet && !isFinished ? team2Games : team2Sets[i];
      if (g1 > 0 || g2 > 0 || isFinished) {
        setsStrs.push(`${g1}-${g2}`);
      }
    }
    const finalSetsScore = setsStrs.join(', ') || `${team1Games}-${team2Games}`;

    // Compute MVP based on highest net winners / lowest unforced errors
    let bestPlayer = team1P1;
    let maxNet = -999;
    allPlayers.forEach(p => {
      const st = liveStats[p] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
      const net = st.winners - st.unforcedErrors;
      if (net > maxNet) {
        maxNet = net;
        bestPlayer = p;
      }
    });

    const newMatch: PadelMatch = {
      id: `match-live-${Date.now()}`,
      title: matchTitle,
      date: new Date().toISOString().split('T')[0],
      court: courtName,
      team1: {
        name: `${team1P1} & ${team1P2}`,
        player1: team1P1,
        player2: team1P2,
      },
      team2: {
        name: `${team2P1} & ${team2P2}`,
        player1: team2P1,
        player2: team2P2,
      },
      setsScore: finalSetsScore,
      winnerTeam: winnerTeam || (team1Sets[0] >= team2Sets[0] ? 1 : 2),
      stats: liveStats,
      summary: `Partido disputado en ${courtName} con marcador final ${finalSetsScore} (${formatTimer(timerSeconds)} de juego). MVP: ${bestPlayer}.`,
      highlights: [
        `Marcador: ${finalSetsScore}`,
        `Duración del encuentro: ${formatTimer(timerSeconds)}`,
        `Punto de Oro activo: ${goldenPointMode ? 'Sí' : 'No'}`
      ],
      mvp: bestPlayer,
      tacticalNotes: `Partido registrado en directo con el Marcador en Vivo.`
    };

    onSaveMatch(newMatch);
    setRecentActionText('¡Partido guardado con éxito en el Historial!');
  };

  const isGoldenPoint = goldenPointMode && team1Points === '40' && team2Points === '40' && !isTieBreak;

  return (
    <div
      id="padel-live-scoreboard"
      className={`bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-100 transition-all ${
        tvViewMode ? 'fixed inset-0 z-50 rounded-none p-6 bg-slate-950 flex flex-col justify-between overflow-y-auto' : ''
      }`}
    >
      {/* TOP HEADER: TITLE, COURT, TIMER, AND QUICK TOGGLES */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {matchTitle}
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Activity className="w-3 h-3 animate-pulse text-emerald-400" />
                EN VIVO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {courtName} • Set {currentSet + 1} de 3 {isTieBreak && '• ¡TIE-BREAK!'}
            </p>
          </div>
        </div>

        {/* Stopwatch & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Match Timer */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 font-mono text-xs">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Tiempo:</span>
            <span className="font-bold text-emerald-400 text-sm">{formatTimer(timerSeconds)}</span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(r => !r)}
              className="text-slate-400 hover:text-white transition p-1"
              title={isTimerRunning ? 'Pausar cronómetro' : 'Reanudar cronómetro'}
            >
              {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-emerald-400" />}
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(s => !s)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title={soundEnabled ? 'Sonidos activados' : 'Sonidos silenciados'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* TV View Mode Toggle */}
          <button
            type="button"
            onClick={() => setTvViewMode(v => !v)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              tvViewMode
                ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Modo TV / Pantalla completa"
          >
            <Tv className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">{tvViewMode ? 'Salir TV' : 'Modo TV'}</span>
          </button>

          {/* Settings Modal Toggle */}
          <button
            type="button"
            onClick={() => setShowConfigModal(s => !s)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition cursor-pointer"
            title="Ajustar nombres de jugadores y reglas"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetMatch}
            className="p-2 bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-800 transition cursor-pointer"
            title="Reiniciar marcador"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RECENT ACTION BANNER / NOTIFICATION */}
      {recentActionText && (
        <div className="my-3 bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 px-3.5 py-2 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            {recentActionText}
          </span>
          {historyStack.length > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1"
            >
              <Undo2 className="w-3 h-3" /> Deshacer
            </button>
          )}
        </div>
      )}

      {/* GOLDEN POINT DRAMATIC BANNER */}
      {isGoldenPoint && (
        <div className="my-3 bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-amber-400 text-amber-200 px-4 py-2.5 rounded-2xl text-center shadow-lg shadow-amber-500/20 animate-pulse">
          <div className="text-xs font-black tracking-widest uppercase text-amber-300 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            ¡PUNTO DE ORO! (SUDDEN DEATH)
            <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </div>
          <p className="text-[11px] text-amber-100/90 mt-0.5">
            40-40: La pareja restadora elige el lado. El siguiente punto gana el juego.
          </p>
        </div>
      )}

      {/* MATCH WINNER BANNER IF FINISHED */}
      {isFinished && (
        <div className="my-4 p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-2 border-emerald-500 rounded-3xl text-center space-y-3 shadow-2xl">
          <div className="inline-flex p-3 bg-emerald-500/20 rounded-full text-emerald-400 mb-1">
            <Trophy className="w-8 h-8 animate-bounce" />
          </div>
          <h3 className="text-xl font-black text-white">
            ¡VICTORIA PARA {winnerTeam === 1 ? `${team1P1} & ${team1P2}` : `${team2P1} & ${team2P2}`}!
          </h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Resultado final:{' '}
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {team1Sets.filter((_, i) => i <= currentSet).join('-')} / {team2Sets.filter((_, i) => i <= currentSet).join('-')}
            </span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveToHistory}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Guardar Partido en Historial y Estadísticas
            </button>
            <button
              type="button"
              onClick={handleResetMatch}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer"
            >
              Jugar Nuevo Partido
            </button>
          </div>
        </div>
      )}

      {/* MAIN TV BROADCAST SCOREBOARD DISPLAY (LED / TV SCORE CARD) */}
      <div className="my-4 bg-slate-950 rounded-2xl border-2 border-slate-800 shadow-2xl overflow-hidden">
        {/* Table Header: Sets Columns */}
        <div className="grid grid-cols-12 bg-slate-900/80 px-4 py-2 text-[11px] font-bold text-slate-400 border-b border-slate-800 items-center">
          <div className="col-span-5 sm:col-span-6 flex items-center gap-1.5">
            <span>PAREJA / JUGADORES</span>
          </div>
          <div className="col-span-1 text-center">SET 1</div>
          <div className="col-span-1 text-center">SET 2</div>
          <div className="col-span-1 text-center">SET 3</div>
          <div className="col-span-4 sm:col-span-3 text-center text-emerald-400">
            {isTieBreak ? 'TIE-BREAK' : 'PUNTOS'}
          </div>
        </div>

        {/* ROW 1: TEAM 1 */}
        <div
          onClick={() => scorePoint(1)}
          className={`grid grid-cols-12 px-4 py-3.5 border-b border-slate-800/80 items-center transition cursor-pointer select-none ${
            servingTeam === 1 ? 'bg-slate-900/40 hover:bg-slate-900/70' : 'hover:bg-slate-900/30'
          }`}
        >
          {/* Team 1 Info */}
          <div className="col-span-5 sm:col-span-6 flex items-center gap-2.5">
            {/* Serve indicator icon */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleToggleServe(); }}
              title="Cambiar sacador"
              className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                servingTeam === 1
                  ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/40 ring-2 ring-yellow-400/50'
                  : 'bg-slate-800 text-transparent opacity-30 hover:opacity-100 hover:text-yellow-400'
              }`}
            >
              🎾
            </button>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white truncate">
                  {team1P1} & {team1P2}
                </span>
                {winnerTeam === 1 && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Pareja 1 {servingTeam === 1 && `(Saca: ${servingPlayer})`}
              </span>
            </div>
          </div>

          {/* Set 1 */}
          <div className={`col-span-1 text-center text-sm font-mono font-bold ${
            currentSet === 0 ? 'text-white bg-slate-900/80 py-1 rounded-lg border border-slate-700' : 'text-slate-400'
          }`}>
            {currentSet === 0 && !isFinished ? team1Games : team1Sets[0]}
          </div>

          {/* Set 2 */}
          <div className={`col-span-1 text-center text-sm font-mono font-bold ${
            currentSet === 1 ? 'text-white bg-slate-900/80 py-1 rounded-lg border border-slate-700' : 'text-slate-400'
          }`}>
            {currentSet === 1 && !isFinished ? team1Games : team1Sets[1]}
          </div>

          {/* Set 3 */}
          <div className={`col-span-1 text-center text-sm font-mono font-bold ${
            currentSet === 2 ? 'text-white bg-slate-900/80 py-1 rounded-lg border border-slate-700' : 'text-slate-400'
          }`}>
            {currentSet === 2 && !isFinished ? team1Games : team1Sets[2]}
          </div>

          {/* Point LED Display */}
          <div className="col-span-4 sm:col-span-3 text-center">
            <span className={`inline-block font-mono font-black text-2xl sm:text-3xl px-3 py-0.5 rounded-xl shadow-inner ${
              isGoldenPoint
                ? 'bg-amber-500/30 text-yellow-300 border border-yellow-400/50 animate-pulse'
                : team1Points === 'AD'
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400'
                : 'bg-slate-900 text-emerald-400 border border-slate-800'
            }`}>
              {isTieBreak ? tieBreakPoints.team1 : team1Points}
            </span>
          </div>
        </div>

        {/* ROW 2: TEAM 2 */}
        <div
          onClick={() => scorePoint(2)}
          className={`grid grid-cols-12 px-4 py-3.5 items-center transition cursor-pointer select-none ${
            servingTeam === 2 ? 'bg-slate-900/40 hover:bg-slate-900/70' : 'hover:bg-slate-900/30'
          }`}
        >
          {/* Team 2 Info */}
          <div className="col-span-5 sm:col-span-6 flex items-center gap-2.5">
            {/* Serve indicator icon */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleToggleServe(); }}
              title="Cambiar sacador"
              className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                servingTeam === 2
                  ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/40 ring-2 ring-yellow-400/50'
                  : 'bg-slate-800 text-transparent opacity-30 hover:opacity-100 hover:text-yellow-400'
              }`}
            >
              🎾
            </button>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white truncate">
                  {team2P1} & {team2P2}
                </span>
                {winnerTeam === 2 && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Pareja 2 {servingTeam === 2 && `(Saca: ${servingPlayer})`}
              </span>
            </div>
          </div>

          {/* Set 1 */}
          <div className={`col-span-1 text-center text-sm font-mono font-bold ${
            currentSet === 0 ? 'text-white bg-slate-900/80 py-1 rounded-lg border border-slate-700' : 'text-slate-400'
          }`}>
            {currentSet === 0 && !isFinished ? team2Games : team2Sets[0]}
          </div>

          {/* Set 2 */}
          <div className={`col-span-1 text-center text-sm font-mono font-bold ${
            currentSet === 1 ? 'text-white bg-slate-900/80 py-1 rounded-lg border border-slate-700' : 'text-slate-400'
          }`}>
            {currentSet === 1 && !isFinished ? team2Games : team2Sets[1]}
          </div>

          {/* Set 3 */}
          <div className={`col-span-1 text-center text-sm font-mono font-bold ${
            currentSet === 2 ? 'text-white bg-slate-900/80 py-1 rounded-lg border border-slate-700' : 'text-slate-400'
          }`}>
            {currentSet === 2 && !isFinished ? team2Games : team2Sets[2]}
          </div>

          {/* Point LED Display */}
          <div className="col-span-4 sm:col-span-3 text-center">
            <span className={`inline-block font-mono font-black text-2xl sm:text-3xl px-3 py-0.5 rounded-xl shadow-inner ${
              isGoldenPoint
                ? 'bg-amber-500/30 text-yellow-300 border border-yellow-400/50 animate-pulse'
                : team2Points === 'AD'
                ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400'
                : 'bg-slate-900 text-cyan-400 border border-slate-800'
            }`}>
              {isTieBreak ? tieBreakPoints.team2 : team2Points}
            </span>
          </div>
        </div>
      </div>

      {/* QUICK LARGE SCORER ACTION BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
        {/* +1 Punto Team 1 */}
        <button
          type="button"
          id="btn-score-point-team1"
          onClick={() => scorePoint(1)}
          className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/25 flex items-center justify-between transition transform active:scale-[0.98] cursor-pointer"
        >
          <div className="text-left">
            <span className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider block">
              Punto Directo [Tecla: A / 1]
            </span>
            <span className="text-base sm:text-lg">
              +1 Punto {team1P1} & {team1P2}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl font-mono">
            +1
          </div>
        </button>

        {/* +1 Punto Team 2 */}
        <button
          type="button"
          id="btn-score-point-team2"
          onClick={() => scorePoint(2)}
          className="p-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-black shadow-lg shadow-cyan-600/25 flex items-center justify-between transition transform active:scale-[0.98] cursor-pointer"
        >
          <div className="text-left">
            <span className="text-[10px] text-cyan-200 uppercase font-bold tracking-wider block">
              Punto Directo [Tecla: L / 2]
            </span>
            <span className="text-base sm:text-lg">
              +1 Punto {team2P1} & {team2P2}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl font-mono">
            +1
          </div>
        </button>
      </div>

      {/* DETAILED PLAYER STATS & ERGONOMIC ACTION HUB */}
      <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
        {/* Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h3 className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-wider">
              Anotación Rápida de Estadísticas y Toques
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Voice scorer toggle */}
            <button
              type="button"
              onClick={activeVoiceListen ? stopVoiceScorer : startVoiceScorer}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeVoiceListen
                  ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/25'
                  : 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {activeVoiceListen ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{activeVoiceListen ? 'Detener Voz' : 'Dictar por Voz'}</span>
            </button>

            {historyStack.length > 0 && (
              <button
                type="button"
                onClick={handleUndo}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                title="Deshacer última acción (Atajo: Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Deshacer [Z]</span>
              </button>
            )}
          </div>
        </div>

        {voiceInterim && (
          <div className="text-xs text-emerald-300 italic bg-slate-900/90 p-2.5 rounded-xl border border-emerald-900/50 flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 animate-pulse text-emerald-400 shrink-0" />
            <span>Escuchando: "{voiceInterim}"</span>
          </div>
        )}

        {/* 1. SELECCIÓN DE JUGADOR ACTIVO (Atajos 1, 2, 3, 4) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span>1. Selecciona Jugador Activo (Teclas 1 - 4):</span>
            <span className="text-cyan-400 font-mono">Activo: {activePlayerName}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {allPlayers.map((playerName, idx) => {
              const isSelected = selectedPlayerIdx === idx;
              const isTeam1 = idx < 2;
              const pColor = getPlayerColor(playerName);
              const pStats = liveStats[playerName] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };

              return (
                <button
                  key={`select-player-btn-${idx}-${playerName}`}
                  type="button"
                  onClick={() => {
                    setSelectedPlayerIdx(idx);
                    if (navigator.vibrate) navigator.vibrate(30);
                  }}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/70 border-cyan-500 ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-950/50'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
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
        </div>

        {/* 2. MASTER PAD TÁCTIL (Grandes botones de acción para el jugador seleccionado: J, K, L, Ñ) */}
        <div className="p-3.5 bg-slate-900/95 border border-slate-800/90 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>2. Acciones para <strong className="text-cyan-300 font-bold">{activePlayerName}</strong> (Teclas J, K, L, Ñ):</span>
            </div>
            <span className="text-[10px] text-slate-400 hidden sm:inline font-mono">
              (Pulsa tecla o haz clic en los botones)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* J: +1 TOQUE */}
            <button
              type="button"
              id="btn-master-touch"
              onClick={() => {
                addTouch(activePlayerName);
                if (navigator.vibrate) navigator.vibrate(40);
              }}
              className="min-h-[58px] p-2.5 sm:p-3 bg-gradient-to-b from-emerald-950/80 to-slate-900 hover:from-emerald-900/90 hover:to-slate-850 text-emerald-300 hover:text-white border-2 border-emerald-700/60 hover:border-emerald-500 rounded-xl transition transform active:scale-95 flex flex-col justify-center items-center gap-0.5 cursor-pointer shadow-md shadow-emerald-950/30"
              title={`Suma +1 toque a ${activePlayerName} [Atajo: J]`}
            >
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded text-[10px] font-mono font-black text-emerald-300">
                  [J]
                </span>
                <span className="text-xs sm:text-sm font-black tracking-wide">
                  🎾 +1 TOQUE
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Total: <strong className="text-emerald-400">{liveStats[activePlayerName]?.touches || 0}</strong>
              </span>
            </button>

            {/* K: WINNER */}
            <button
              type="button"
              id="btn-master-winner"
              onClick={() => {
                const scoringTeam = selectedPlayerIdx < 2 ? 1 : 2;
                scorePoint(scoringTeam, activePlayerName, 'winner');
                if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
              }}
              className="min-h-[58px] p-2.5 sm:p-3 bg-gradient-to-b from-cyan-950/80 to-slate-900 hover:from-cyan-900/90 hover:to-slate-850 text-cyan-300 hover:text-white border-2 border-cyan-700/60 hover:border-cyan-500 rounded-xl transition transform active:scale-95 flex flex-col justify-center items-center gap-0.5 cursor-pointer shadow-md shadow-cyan-950/30"
              title={`Suma Winner a ${activePlayerName} y da punto a su pareja [Atajo: K]`}
            >
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-cyan-500/20 border border-cyan-500/40 rounded text-[10px] font-mono font-black text-cyan-300">
                  [K]
                </span>
                <span className="text-xs sm:text-sm font-black tracking-wide">
                  ⚡ WINNER
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                +1 Pto Pareja {selectedPlayerIdx < 2 ? 1 : 2}
              </span>
            </button>

            {/* L: ERROR FORZADO */}
            <button
              type="button"
              id="btn-master-forced"
              onClick={() => {
                const scoringTeam = selectedPlayerIdx < 2 ? 2 : 1;
                scorePoint(scoringTeam, activePlayerName, 'forced_error');
                if (navigator.vibrate) navigator.vibrate(50);
              }}
              className="min-h-[58px] p-2.5 sm:p-3 bg-gradient-to-b from-amber-950/80 to-slate-900 hover:from-amber-900/90 hover:to-slate-850 text-amber-300 hover:text-white border-2 border-amber-700/60 hover:border-amber-500 rounded-xl transition transform active:scale-95 flex flex-col justify-center items-center gap-0.5 cursor-pointer shadow-md shadow-amber-950/30"
              title={`Suma Error Forzado a ${activePlayerName} y da punto al rival [Atajo: L]`}
            >
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded text-[10px] font-mono font-black text-amber-300">
                  [L]
                </span>
                <span className="text-xs sm:text-sm font-black tracking-wide">
                  🛡️ FORZADO
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                +1 Pto Rival (P{selectedPlayerIdx < 2 ? 2 : 1})
              </span>
            </button>

            {/* Ñ: ERROR NO FORZADO */}
            <button
              type="button"
              id="btn-master-unforced"
              onClick={() => {
                const scoringTeam = selectedPlayerIdx < 2 ? 2 : 1;
                scorePoint(scoringTeam, activePlayerName, 'unforced_error');
                if (navigator.vibrate) navigator.vibrate(50);
              }}
              className="min-h-[58px] p-2.5 sm:p-3 bg-gradient-to-b from-rose-950/80 to-slate-900 hover:from-rose-900/90 hover:to-slate-850 text-rose-300 hover:text-white border-2 border-rose-700/60 hover:border-rose-500 rounded-xl transition transform active:scale-95 flex flex-col justify-center items-center gap-0.5 cursor-pointer shadow-md shadow-rose-950/30"
              title={`Suma Error No Forzado a ${activePlayerName} y da punto al rival [Atajo: Ñ]`}
            >
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-rose-500/20 border border-rose-500/40 rounded text-[10px] font-mono font-black text-rose-300">
                  [Ñ]
                </span>
                <span className="text-xs sm:text-sm font-black tracking-wide">
                  ❌ NO FORZADO
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                +1 Pto Rival (P{selectedPlayerIdx < 2 ? 2 : 1})
              </span>
            </button>
          </div>
        </div>

        {/* 3. ATRIBUCIÓN DIRECTA POR JUGADOR (Botones ampliados de clic fácil) */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-400">
            3. O pulsa directamente en el jugador deseado:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allPlayers.map((playerName, idx) => {
              const isTeam1 = idx < 2;
              const scoringTeamForWinner = isTeam1 ? 1 : 2;
              const scoringTeamForError = isTeam1 ? 2 : 1;
              const stats = liveStats[playerName] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
              const pColor = getPlayerColor(playerName);
              const isSelected = selectedPlayerIdx === idx;

              return (
                <div
                  key={`live-player-card-${idx}-${playerName}`}
                  className={`p-3 rounded-2xl border transition flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/70 shadow-lg shadow-cyan-950/30'
                      : 'bg-slate-900/80 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pColor }} />
                      <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[130px]">
                        {playerName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                        [{idx + 1}] P{isTeam1 ? 1 : 2}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 font-mono flex items-center gap-2">
                      <span className="bg-cyan-950/60 px-1.5 py-0.5 rounded text-cyan-300 border border-cyan-800/40">W: <strong>{stats.winners}</strong></span>
                      <span className="bg-rose-950/60 px-1.5 py-0.5 rounded text-rose-300 border border-rose-800/40">ENF: <strong>{stats.unforcedErrors}</strong></span>
                      <span className="bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-300 border border-amber-800/40">EF: <strong>{stats.forcedErrors}</strong></span>
                    </div>
                  </div>

                  {/* Quick attribution clickers (Bigger, easier touch targets) */}
                  <div className="grid grid-cols-4 gap-2 text-[11px] font-bold">
                    {/* +1 Toque */}
                    <button
                      type="button"
                      onClick={() => {
                        addTouch(playerName);
                        if (navigator.vibrate) navigator.vibrate(40);
                      }}
                      className="min-h-[44px] py-2 px-1 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white border border-slate-700 hover:border-emerald-400 rounded-xl transition text-center flex flex-col items-center justify-center cursor-pointer active:scale-95"
                      title={`Suma +1 toque a ${playerName}`}
                    >
                      <span>🎾 +1 Toq</span>
                      <span className="text-[10px] text-emerald-400 font-mono">({stats.touches})</span>
                    </button>

                    {/* Winner */}
                    <button
                      type="button"
                      onClick={() => {
                        scorePoint(scoringTeamForWinner, playerName, 'winner');
                        if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
                      }}
                      className="min-h-[44px] py-2 px-1 bg-cyan-950/70 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-800/50 hover:border-cyan-400 rounded-xl transition text-center flex flex-col items-center justify-center cursor-pointer active:scale-95"
                      title={`Suma Winner a ${playerName} y da punto a Pareja ${scoringTeamForWinner}`}
                    >
                      <span>⚡ Winner</span>
                      <span className="text-[10px] text-cyan-400 font-mono">+Pto</span>
                    </button>

                    {/* Error No Forzado */}
                    <button
                      type="button"
                      onClick={() => {
                        scorePoint(scoringTeamForError, playerName, 'unforced_error');
                        if (navigator.vibrate) navigator.vibrate(50);
                      }}
                      className="min-h-[44px] py-2 px-1 bg-rose-950/70 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/50 hover:border-rose-400 rounded-xl transition text-center flex flex-col items-center justify-center cursor-pointer active:scale-95"
                      title={`Suma Error No Forzado a ${playerName} y da punto al rival`}
                    >
                      <span>❌ No Forz.</span>
                      <span className="text-[10px] text-rose-400 font-mono">+Pto Rival</span>
                    </button>

                    {/* Error Forzado */}
                    <button
                      type="button"
                      onClick={() => {
                        scorePoint(scoringTeamForError, playerName, 'forced_error');
                        if (navigator.vibrate) navigator.vibrate(50);
                      }}
                      className="min-h-[44px] py-2 px-1 bg-amber-950/70 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-800/50 hover:border-amber-400 rounded-xl transition text-center flex flex-col items-center justify-center cursor-pointer active:scale-95"
                      title={`Suma Error Forzado a ${playerName} y da punto al rival`}
                    >
                      <span>🛡️ Forzado</span>
                      <span className="text-[10px] text-amber-400 font-mono">+Pto Rival</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shortcuts & Rules Bar */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-mono text-cyan-300/90">
            <Keyboard className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Atajos: <strong>1-4</strong> (Elegir) • <strong>J</strong> (Toque) • <strong>K</strong> (Winner) • <strong>L</strong> (Forzado) • <strong>Ñ</strong> (No Forzado) • <strong>Z</strong> (Deshacer) • <strong>S</strong> (Saque)</span>
          </div>
          <div className="text-[10px] text-slate-500">
            * 1er saque fallido no suma toques adicionales; cuenta 1 solo toque al entrar el servicio válido.
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS: SAVE MATCH TO HISTORY, SERVICE TOGGLE, GOLDEN POINT TOGGLE */}
      <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Golden point toggle */}
          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={goldenPointMode}
              onChange={(e) => setGoldenPointMode(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span className="font-semibold text-amber-300">Punto de Oro (40-40)</span>
          </label>

          {/* Toggle serve button */}
          <button
            type="button"
            onClick={handleToggleServe}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <span>🎾 Cambiar Saque</span>
            <span className="text-[10px] text-yellow-400">({servingPlayer})</span>
          </button>
        </div>

        {/* Save Match Button */}
        <button
          type="button"
          onClick={handleSaveToHistory}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Guardar en Historial y Estadísticas</span>
        </button>
      </div>

      {/* CONFIGURATION MODAL (Names, Court, etc.) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-400" />
                Configurar Jugadores y Partido
              </h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Título del Encuentro</label>
                <input
                  type="text"
                  value={matchTitle}
                  onChange={(e) => setMatchTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Pista / Club</label>
                <input
                  type="text"
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-2">
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
                    setLiveStats(prev => {
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
                  title="Alineación Oficial (Perfiles)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer shadow-md shadow-emerald-500/20"
              >
                Guardar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
