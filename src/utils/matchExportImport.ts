import { PadelMatch, PlayerStats } from '../types';

/**
 * Generates a clean, filename-safe slug from match details
 */
export function getMatchSlug(match: PadelMatch): string {
  const dateStr = match.date ? match.date.replace(/[^0-9-]/g, '') : 'partido';
  const t1 = (match.team1?.player1 || 'T1').replace(/[^a-zA-Z0-9]/g, '');
  const t2 = (match.team2?.player1 || 'T2').replace(/[^a-zA-Z0-9]/g, '');
  return `partido-${dateStr}-${t1}-vs-${t2}`.toLowerCase();
}

/**
 * Downloads a single match as a structured JSON file
 */
export function downloadSingleMatchJSON(match: PadelMatch): void {
  try {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(match, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${getMatchSlug(match)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error('Error exporting match JSON:', err);
    alert('No se pudo descargar el archivo JSON del partido.');
  }
}

/**
 * Downloads a single match formatted as a CSV spreadsheet
 */
export function downloadSingleMatchCSV(match: PadelMatch): void {
  try {
    const headers = ['Jugador', 'Equipo', 'Toques', 'Errores Forzados', 'Errores No Forzados', 'Winners', 'Puntos Perdidos Totales', 'Rendimiento'];
    
    const rows: string[][] = [];
    
    // Add match metadata rows
    rows.push(['# PARTIDO DE PADEL', `"${match.title}"`]);
    rows.push(['# FECHA', `"${match.date}"`]);
    rows.push(['# RESULTADO SETS', `"${match.setsScore}"`]);
    if (match.court) rows.push(['# PISTA', `"${match.court}"`]);
    if (match.mvp) rows.push(['# MVP', `"${match.mvp}"`]);
    rows.push([]);
    rows.push(headers);

    const team1Players = [match.team1?.player1, match.team1?.player2].filter(Boolean) as string[];
    const team2Players = [match.team2?.player1, match.team2?.player2].filter(Boolean) as string[];
    const allPlayers = Array.from(new Set([...team1Players, ...team2Players, ...Object.keys(match.stats || {})]));

    allPlayers.forEach(pName => {
      const stats = match.stats?.[pName] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
      const team = team1Players.includes(pName) ? 'Equipo 1' : team2Players.includes(pName) ? 'Equipo 2' : 'Otro';
      const totalErrors = stats.forcedErrors + stats.unforcedErrors;
      const net = stats.winners - totalErrors;
      const perf = net >= 0 ? `+${net}` : `${net}`;

      rows.push([
        `"${pName}"`,
        `"${team}"`,
        `${stats.touches}`,
        `${stats.forcedErrors}`,
        `${stats.unforcedErrors}`,
        `${stats.winners}`,
        `${totalErrors}`,
        `"${perf}"`
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.join(';')).join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', `${getMatchSlug(match)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error('Error exporting match CSV:', err);
    alert('No se pudo descargar el archivo CSV del partido.');
  }
}

/**
 * Validates and normalizes raw JSON data into a valid PadelMatch object
 */
export function validateAndParseMatchData(data: any): { match?: PadelMatch; error?: string } {
  if (!data || typeof data !== 'object') {
    return { error: 'El archivo o texto no contiene un objeto JSON válido.' };
  }

  // Check if it's an array of matches instead of a single match
  if (Array.isArray(data)) {
    if (data.length === 1 && typeof data[0] === 'object') {
      data = data[0];
    } else if (data.length > 1) {
      return { error: `Has seleccionado un archivo con ${data.length} partidos juntos. Esta opción es para importar 1 partido individual. Puedes seleccionar uno o usar la copia de seguridad global.` };
    } else {
      return { error: 'El archivo contiene una lista vacía.' };
    }
  }

  if (!data.title && !data.team1 && !data.team2 && !data.stats) {
    return { error: 'El objeto JSON no parece ser un partido de pádel válido (faltan equipos o estadísticas).' };
  }

  // Create sanitized match
  const matchId = data.id && typeof data.id === 'string' ? data.id : `match-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const title = data.title && typeof data.title === 'string' ? data.title.trim() : 'Partido Importado';
  const date = data.date && typeof data.date === 'string' ? data.date : new Date().toISOString().split('T')[0];
  const setsScore = data.setsScore && typeof data.setsScore === 'string' ? data.setsScore : '6-0, 6-0';

  const team1 = {
    player1: data.team1?.player1 || 'Jugador 1',
    player2: data.team1?.player2 || 'Jugador 2',
    name: data.team1?.name || undefined
  };

  const team2 = {
    player1: data.team2?.player1 || 'Jugador 3',
    player2: data.team2?.player2 || 'Jugador 4',
    name: data.team2?.name || undefined
  };

  const stats: Record<string, PlayerStats> = {};
  if (data.stats && typeof data.stats === 'object') {
    Object.keys(data.stats).forEach(pName => {
      const s = data.stats[pName];
      if (s && typeof s === 'object') {
        stats[pName] = {
          touches: Number(s.touches) || 0,
          forcedErrors: Number(s.forcedErrors) || 0,
          unforcedErrors: Number(s.unforcedErrors) || 0,
          winners: Number(s.winners) || 0
        };
      }
    });
  }

  const cleanMatch: PadelMatch = {
    id: matchId,
    title,
    date,
    team1: {
      name: team1.name || `${team1.player1} & ${team1.player2}`,
      player1: team1.player1,
      player2: team1.player2
    },
    team2: {
      name: team2.name || `${team2.player1} & ${team2.player2}`,
      player1: team2.player1,
      player2: team2.player2
    },
    setsScore,
    stats,
    court: data.court || undefined,
    summary: data.summary || `Partido disputado el ${date} entre ${team1.player1}/${team1.player2} y ${team2.player1}/${team2.player2}.`,
    highlights: Array.isArray(data.highlights) ? data.highlights : [],
    mvp: data.mvp || '',
    tacticalNotes: data.tacticalNotes || undefined,
    pointEvents: Array.isArray(data.pointEvents) ? data.pointEvents : undefined,
    pointRallies: Array.isArray(data.pointRallies) ? data.pointRallies : undefined,
    audioNotes: Array.isArray(data.audioNotes) ? data.audioNotes : undefined,
    youtubeUrl: data.youtubeUrl || undefined,
    youtubeTimestamp: typeof data.youtubeTimestamp === 'number' ? data.youtubeTimestamp : undefined,
    youtubeRotation: typeof data.youtubeRotation === 'number' ? data.youtubeRotation : undefined,
    youtubeMirror: typeof data.youtubeMirror === 'boolean' ? data.youtubeMirror : undefined,
    youtubeZoom: typeof data.youtubeZoom === 'number' ? data.youtubeZoom : undefined,
    isCompleted: data.isCompleted !== false,
    winnerTeam: data.winnerTeam === 1 || data.winnerTeam === 2 ? data.winnerTeam : undefined
  };

  return { match: cleanMatch };
}

/**
 * Reads a File and parses single match JSON
 */
export async function readSingleMatchFromFile(file: File): Promise<{ match?: PadelMatch; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        resolve(validateAndParseMatchData(parsed));
      } catch (err: any) {
        resolve({ error: `Error de sintaxis JSON: ${err.message}` });
      }
    };
    reader.onerror = () => {
      resolve({ error: 'No se pudo leer el archivo seleccionado.' });
    };
    reader.readAsText(file);
  });
}
