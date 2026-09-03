// Utility for lenient and intelligent voice interpretation in padel rallies

export interface ParsedPadelAction {
  player: string;
  type: 'touch' | 'winner' | 'unforced_error' | 'forced_error';
  count: number;
  description: string;
  isCorrection?: boolean;
}

export interface ParseResult {
  actions: ParsedPadelAction[];
  corrections: string[];
  summaryMessage: string;
}

// Normalize accents and punctuation for robust matching
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if word contains variations of "toque" or hits
const TOUCH_VARIATIONS = [
  'toque', 'toques', 'toca', 'toce', 'toke', 'toq',
  'boque', 'boques', 'bloque', 'bloques',
  'golpe', 'golpes', 'pala', 'palazo', 'le da', 'pega', 'pego',
  'devuelve', 'pasa', 'mete', 'resta', 'resto', 'salva', 'saco', 'saque', 'servicio'
];

const WINNER_VARIATIONS = [
  'winner', 'winer', 'winers', 'guiner', 'wina', 'ganador', 'ganadora', 'punto ganador',
  'remate', 'x3', 'x4', 'por tres', 'por cuatro', 'dejada ganadora', 'dejada',
  'vibora ganadora', 'vibora', 'volea ganadora', 'rulo ganador', 'definio',
  'ventaja', 'ventajas', 'ad', 'punto de juego', 'bola de juego'
];

const UNFORCED_VARIATIONS = [
  'error no forzado', 'no forzado', 'noforzado', 'no forzada', 'fallo no forzado',
  'doble falta', 'doblefalta', 'malla', 'reja', 'a la red', 'red', 'al cristal',
  'cristal directo', 'fuera', 'se le va', 'se fue', 'fallo facil', 'regalo'
];

const FORCED_VARIATIONS = [
  'error forzado', 'forzado', 'forzada', 'fallo forzado', 'apretado', 'apretada',
  'no llega', 'bola dificil', 'al cuerpo', 'forzo el rival', 'defensa fallida'
];

/**
 * Parses natural conversational speech, fast rally sequences, merged words like "mikelboque"
 * and sequential player calls e.g. "victor mikel victor mikel error no forzado"
 */
export function parseSpeechPadel(
  rawTranscript: string,
  players: string[]
): ParseResult {
  const norm = normalizeText(rawTranscript);
  const actions: ParsedPadelAction[] = [];
  const corrections: string[] = [];

  if (!norm || players.length === 0) {
    return { actions: [], corrections: [], summaryMessage: '' };
  }

  // Create normalized player mapping
  const playerNormMap = players.map(p => ({
    original: p,
    norm: normalizeText(p)
  }));

  // Handle corrections like "espera rectifico...", "no, perdon..."
  const isCorrection = norm.includes('rectifico') || norm.includes('espera') || norm.includes('perdon') || norm.includes('me he equivocado') || norm.includes('corrige') || norm.includes('era forzado');

  // Split transcript into words/segments
  const words = norm.split(' ');

  // Identify sequence of player mentions and interleaved actions
  interface TokenMatch {
    player: string;
    wordIndex: number;
    hasAttachedTouch?: boolean;
  }

  const tokenMatches: TokenMatch[] = [];

  // Pass 1: Find all occurrences of player names (or joined words like "mikelboque", "victortoca")
  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Check direct or substring match
    for (const p of playerNormMap) {
      if (word === p.norm) {
        tokenMatches.push({ player: p.original, wordIndex: i });
        break;
      } else if (word.startsWith(p.norm)) {
        // e.g. "mikelboque", "mikeltoca", "alvarotoque"
        const suffix = word.substring(p.norm.length);
        const isTouchSuffix = TOUCH_VARIATIONS.some(tv => suffix.includes(tv) || suffix.startsWith('b') || suffix.startsWith('t'));
        tokenMatches.push({
          player: p.original,
          wordIndex: i,
          hasAttachedTouch: isTouchSuffix
        });
        break;
      }
    }
  }

  // If no player matches found, check if transcript just has general actions
  if (tokenMatches.length === 0) {
    return { actions: [], corrections: [], summaryMessage: '' };
  }

  // Pass 2: Iterate through detected player occurrences and evaluate the context up to the next player
  for (let idx = 0; idx < tokenMatches.length; idx++) {
    const current = tokenMatches[idx];
    const next = tokenMatches[idx + 1];
    
    // Segment between current player word and next player word
    const startIdx = current.wordIndex;
    const endIdx = next ? next.wordIndex : words.length;
    const segmentWords = words.slice(startIdx, endIdx);
    const segmentText = segmentWords.join(' ');

    let actionAssigned = false;

    // Check for unforced error in segment
    if (UNFORCED_VARIATIONS.some(v => segmentText.includes(v))) {
      // If double fault
      const isDoubleFault = segmentText.includes('doble falta') || segmentText.includes('doblefalta');
      actions.push({
        player: current.player,
        type: 'unforced_error',
        count: 1,
        description: isDoubleFault ? `Doble Falta de ${current.player}` : `Error No Forzado de ${current.player}`,
        isCorrection
      });
      actionAssigned = true;
    }
    // Check for forced error in segment
    else if (FORCED_VARIATIONS.some(v => segmentText.includes(v))) {
      actions.push({
        player: current.player,
        type: 'forced_error',
        count: 1,
        description: `Error Forzado de ${current.player}`,
        isCorrection
      });
      actionAssigned = true;
    }
    // Check for winner in segment
    else if (WINNER_VARIATIONS.some(v => segmentText.includes(v))) {
      // Winner counts as touch + winner
      actions.push({
        player: current.player,
        type: 'touch',
        count: 1,
        description: `Toque de ${current.player}`
      });
      actions.push({
        player: current.player,
        type: 'winner',
        count: 1,
        description: `⚡ Winner de ${current.player}`,
        isCorrection
      });
      actionAssigned = true;
    }

    // If no winner/error in segment, or if it has attached touch ("mikelboque"), it counts as a TOQUE (touch)!
    // Example: "victor mikel victor mikel error no forzado" -> 1st victor (toque), 1st mikel (toque), 2nd victor (toque), 2nd mikel (toque + error no forzado)
    if (!actionAssigned || segmentText.includes('toque') || segmentText.includes('toca') || current.hasAttachedTouch) {
      // Check if multi-touch mentioned e.g. "3 toques"
      const numMatch = segmentText.match(/(\d+)\s*toques?/);
      const count = numMatch ? parseInt(numMatch[1], 10) : 1;
      
      // Add touch if not already duplicated by winner
      if (!actions.some(a => a.player === current.player && a.type === 'winner' && a.description.includes(current.player))) {
        actions.push({
          player: current.player,
          type: 'touch',
          count: count,
          description: `🎾 +${count} Toque${count > 1 ? 's' : ''} de ${current.player}`
        });
      }
    }
  }

  // Generate readable summary message
  let summaryParts: string[] = [];
  const touchesCount = actions.filter(a => a.type === 'touch').length;
  const winnersCount = actions.filter(a => a.type === 'winner').length;
  const unforcedCount = actions.filter(a => a.type === 'unforced_error').length;
  const forcedCount = actions.filter(a => a.type === 'forced_error').length;

  if (touchesCount > 0) summaryParts.push(`${touchesCount} toque(s)`);
  if (winnersCount > 0) summaryParts.push(`${winnersCount} winner(s)`);
  if (unforcedCount > 0) summaryParts.push(`${unforcedCount} no forzado(s)`);
  if (forcedCount > 0) summaryParts.push(`${forcedCount} forzado(s)`);

  const summaryMessage = summaryParts.length > 0 
    ? `Interpretado: ${summaryParts.join(', ')}`
    : `Escuchado: "${rawTranscript}"`;

  return {
    actions,
    corrections,
    summaryMessage
  };
}
