import {
  PadelMatch,
  PlayerHistorySummary,
  PlayerTimelineEntry,
  PlayerStats,
  PlayerTacticalProfile,
  PlayerIronicRoast,
  MatchNarrativeChronicle,
  MatchRallyAnalytics,
  PointRally
} from '../types';

export function calculatePlayerHistories(matches: PadelMatch[]): PlayerHistorySummary[] {
  const playerMap: Record<string, {
    matchesPlayed: number;
    matchesWon: number;
    totalTouches: number;
    totalForcedErrors: number;
    totalUnforcedErrors: number;
    totalWinners: number;
    timeline: PlayerTimelineEntry[];
  }> = {};

  // Sort matches chronologically
  const sortedMatches = [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedMatches.forEach((match) => {
    // Check players involved (strict 4 players / active participants)
    const t1Players = [match.team1?.player1, match.team1?.player2].filter(Boolean) as string[];
    const t2Players = [match.team2?.player1, match.team2?.player2].filter(Boolean) as string[];
    const declaredPlayers = [...t1Players, ...t2Players];
    const allMatchPlayers = declaredPlayers.length > 0
      ? Array.from(new Set(declaredPlayers))
      : Object.keys(match.stats || {}).filter(p => {
          const s = match.stats[p];
          return s && (s.touches > 0 || s.forcedErrors > 0 || s.unforcedErrors > 0 || s.winners > 0);
        });

    allMatchPlayers.forEach((playerName) => {
      if (!playerMap[playerName]) {
        playerMap[playerName] = {
          matchesPlayed: 0,
          matchesWon: 0,
          totalTouches: 0,
          totalForcedErrors: 0,
          totalUnforcedErrors: 0,
          totalWinners: 0,
          timeline: []
        };
      }

      const pStats: PlayerStats = match.stats[playerName] || {
        touches: 0,
        forcedErrors: 0,
        unforcedErrors: 0,
        winners: 0
      };

      const isTeam1 = t1Players.includes(playerName);
      const isTeam2 = t2Players.includes(playerName);
      const won = (isTeam1 && match.winnerTeam === 1) || (isTeam2 && match.winnerTeam === 2);

      const netScore = pStats.winners - pStats.unforcedErrors;

      const touches = pStats.touches || 0;
      const unforcedErrors = pStats.unforcedErrors || 0;
      const unforcedErrorPerTouchPct = touches > 0 ? +((unforcedErrors / touches) * 100).toFixed(1) : 0;
      const touchesPerUnforcedError = unforcedErrors > 0 ? +(touches / unforcedErrors).toFixed(1) : touches;

      const prevEntry = playerMap[playerName].timeline[playerMap[playerName].timeline.length - 1];
      const progressionDeltaPct = prevEntry !== undefined 
        ? +(unforcedErrorPerTouchPct - prevEntry.unforcedErrorPerTouchPct).toFixed(1)
        : undefined;

      playerMap[playerName].matchesPlayed += 1;
      if (won) playerMap[playerName].matchesWon += 1;
      playerMap[playerName].totalTouches += touches;
      playerMap[playerName].totalForcedErrors += pStats.forcedErrors || 0;
      playerMap[playerName].totalUnforcedErrors += unforcedErrors;
      playerMap[playerName].totalWinners += pStats.winners || 0;

      playerMap[playerName].timeline.push({
        matchId: match.id,
        matchDate: match.date,
        matchTitle: match.title,
        touches,
        forcedErrors: pStats.forcedErrors || 0,
        unforcedErrors,
        winners: pStats.winners || 0,
        netScore,
        won,
        unforcedErrorPerTouchPct,
        touchesPerUnforcedError,
        progressionDeltaPct
      });
    });
  });

  return Object.keys(playerMap).map((playerName) => {
    const data = playerMap[playerName];
    const matchesCount = data.matchesPlayed || 1;
    const winRate = Math.round((data.matchesWon / matchesCount) * 100);
    const avgTouches = Math.round(data.totalTouches / matchesCount);
    const avgForcedErrors = +(data.totalForcedErrors / matchesCount).toFixed(1);
    const avgUnforcedErrors = +(data.totalUnforcedErrors / matchesCount).toFixed(1);
    const avgWinners = +(data.totalWinners / matchesCount).toFixed(1);
    const winnerToUnforcedRatio = data.totalUnforcedErrors > 0 
      ? +(data.totalWinners / data.totalUnforcedErrors).toFixed(2)
      : data.totalWinners;
    const netDifferential = data.totalWinners - data.totalUnforcedErrors;

    const unforcedErrorPerTouchPct = data.totalTouches > 0 
      ? +((data.totalUnforcedErrors / data.totalTouches) * 100).toFixed(1)
      : 0;
    const touchesPerUnforcedError = data.totalUnforcedErrors > 0
      ? +(data.totalTouches / data.totalUnforcedErrors).toFixed(1)
      : data.totalTouches;

    const timelinePercentages = data.timeline.map((t) => t.unforcedErrorPerTouchPct);
    const bestUnforcedErrorPerTouchPct = timelinePercentages.length > 0 
      ? Math.min(...timelinePercentages)
      : unforcedErrorPerTouchPct;
    const latestUnforcedErrorPerTouchPct = data.timeline.length > 0 
      ? data.timeline[data.timeline.length - 1].unforcedErrorPerTouchPct
      : unforcedErrorPerTouchPct;

    let unforcedErrorTrend: 'improving' | 'worsening' | 'stable' = 'stable';
    if (data.timeline.length >= 2) {
      const firstHalf = data.timeline.slice(0, Math.ceil(data.timeline.length / 2));
      const secondHalf = data.timeline.slice(Math.ceil(data.timeline.length / 2));
      const avgFirst = firstHalf.reduce((acc, curr) => acc + curr.unforcedErrorPerTouchPct, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((acc, curr) => acc + curr.unforcedErrorPerTouchPct, 0) / secondHalf.length;
      
      if (avgSecond < avgFirst - 0.5) {
        unforcedErrorTrend = 'improving'; // Fewer errors per touch = improving!
      } else if (avgSecond > avgFirst + 0.5) {
        unforcedErrorTrend = 'worsening'; // More errors per touch = worsening!
      }
    }

    return {
      name: playerName,
      matchesPlayed: data.matchesPlayed,
      matchesWon: data.matchesWon,
      winRate,
      totalTouches: data.totalTouches,
      avgTouches,
      totalForcedErrors: data.totalForcedErrors,
      avgForcedErrors,
      totalUnforcedErrors: data.totalUnforcedErrors,
      avgUnforcedErrors,
      totalWinners: data.totalWinners,
      avgWinners,
      winnerToUnforcedRatio,
      netDifferential,
      unforcedErrorPerTouchPct,
      touchesPerUnforcedError,
      bestUnforcedErrorPerTouchPct,
      latestUnforcedErrorPerTouchPct,
      unforcedErrorTrend,
      timeline: data.timeline
    };
  }).sort((a, b) => b.matchesWon - a.matchesWon || b.netDifferential - a.netDifferential);
}

export function getPlayerColor(name: string): string {
  const colors: Record<string, string> = {
    'Álvaro': '#10B981', // Emerald
    'Carlos': '#3B82F6', // Blue
    'Pablo': '#8B5CF6',  // Purple
    'Marcos': '#F59E0B', // Amber
    'Lucía': '#EC4899',  // Pink
    'Diego': '#06B6D4',  // Cyan
  };
  if (colors[name]) return colors[name];
  
  // Hash string to color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

export interface TacticalInsightsResult {
  groupHeadline: string;
  awards: { title: string; winner: string; reason: string }[];
  tacticalSummary: string;
  recommendedPairings: { pair: string; strategy: string }[];
}

export function generateLocalTacticalInsights(playerHistories: PlayerHistorySummary[]): TacticalInsightsResult {
  if (!playerHistories || playerHistories.length === 0) {
    return {
      groupHeadline: 'Aún no hay datos de partidos registrados.',
      awards: [],
      tacticalSummary: 'Registra partidos para obtener un análisis táctico detallado.',
      recommendedPairings: []
    };
  }

  const sortedByWinRate = [...playerHistories].sort((a, b) => b.winRate - a.winRate || b.netDifferential - a.netDifferential);
  const sortedByWinners = [...playerHistories].sort((a, b) => b.totalWinners - a.totalWinners || b.avgWinners - a.avgWinners);
  const sortedByFewestUnforced = [...playerHistories].sort((a, b) => a.avgUnforcedErrors - b.avgUnforcedErrors || b.totalTouches - a.totalTouches);
  const sortedByTouches = [...playerHistories].sort((a, b) => b.totalTouches - a.totalTouches);
  const sortedByMostUnforced = [...playerHistories].sort((a, b) => b.avgUnforcedErrors - a.avgUnforcedErrors);
  const sortedByRatio = [...playerHistories].sort((a, b) => b.winnerToUnforcedRatio - a.winnerToUnforcedRatio);

  const mvp = sortedByWinRate[0];
  const bomber = sortedByWinners[0];
  const wall = sortedByFewestUnforced[0];
  const touchLeader = sortedByTouches[0];
  const needsPatience = sortedByMostUnforced[0];
  const sniper = sortedByRatio[0];

  const totalMatches = Math.max(...playerHistories.map(p => p.matchesPlayed));
  const totalTouchesGroup = playerHistories.reduce((acc, p) => acc + p.totalTouches, 0);
  const totalWinnersGroup = playerHistories.reduce((acc, p) => acc + p.totalWinners, 0);
  const totalUnforcedGroup = playerHistories.reduce((acc, p) => acc + p.totalUnforcedErrors, 0);

  const awards = [
    {
      title: '🏆 MVP / Jugador Más Regular',
      winner: mvp.name,
      reason: `Lidera el grupo con ${mvp.winRate}% de victorias en ${mvp.matchesPlayed} partidos disputados y un balance neto diferencial de ${mvp.netDifferential >= 0 ? '+' : ''}${mvp.netDifferential}.`
    },
    {
      title: '🚀 Bombardero de Winners',
      winner: bomber.name,
      reason: `Máxima capacidad de definición con ${bomber.totalWinners} golpes ganadores acumulados (promedio de ${bomber.avgWinners} winners por encuentro).`
    },
    {
      title: '🛡️ El Muro Defensivo',
      winner: wall.name,
      reason: `Extraordinaria solidez desde el fondo y red: promedia tan solo ${wall.avgUnforcedErrors} errores no forzados por partido, asegurando cada punto.`
    },
    {
      title: '🎯 Especialista en Efectividad',
      winner: sniper.name,
      reason: `Ratio letal de ${sniper.winnerToUnforcedRatio} winners por cada fallo no forzado, aprovechando al máximo las bolas francas.`
    }
  ];

  if (needsPatience.name !== mvp.name && needsPatience.avgUnforcedErrors > 1.5) {
    awards.push({
      title: '⚡ Potencial por Desatar',
      winner: needsPatience.name,
      reason: `Jugador con gran volumen de juego que mejorará drásticamente si aumenta el margen sobre la red y dosifica el riesgo en bolas neutras.`
    });
  }

  const tacticalSummary = `El grupo muestra una intensidad destacable con ${totalTouchesGroup} toques totales y ${totalWinnersGroup} winners generados en ${totalMatches} partidos analizados. La clave competitiva entre vosotros reside en el control de los errores no forzados (${totalUnforcedGroup} totales): las parejas que combinan solidez defensiva con aceleraciones precisas en la red obtienen una ventaja determinante en los momentos de presión (puntos de oro y ventajas).`;

  // Recommended pairings
  const pairings: { pair: string; strategy: string }[] = [];

  if (playerHistories.length >= 2) {
    if (bomber.name !== wall.name) {
      pairings.push({
        pair: `${bomber.name} & ${wall.name}`,
        strategy: `Sinergia ofensiva/defensiva: ${wall.name} construye el punto con paciencia y volumen defensivo mientras ${bomber.name} define en la red con remates y voleas ganadoras.`
      });
    }

    if (playerHistories.length >= 4) {
      const p1 = playerHistories[1];
      const p2 = playerHistories[2] || playerHistories[3];
      if (p1 && p2 && p1.name !== p2.name) {
        pairings.push({
          pair: `${p1.name} & ${p2.name}`,
          strategy: `Pareja de equilibrio táctico: ambos se complementan cubriendo los pasillos centrales y alternando la subida a la red tras globos profundos.`
        });
      }
    }
  }

  return {
    groupHeadline: `Nivel competitivo en alza: Gran equilibrio entre pegada en red (${totalWinnersGroup} winners) y solidez de fondo`,
    awards,
    tacticalSummary,
    recommendedPairings: pairings.length > 0 ? pairings : [
      {
        pair: `${playerHistories[0]?.name || 'Jugador 1'} & ${playerHistories[1]?.name || 'Jugador 2'}`,
        strategy: 'Distribución equilibrada de pista con comunicación constante en bolas al centro.'
      }
    ]
  };
}

export function generateLocalPlayerProfiles(playerHistories: PlayerHistorySummary[]): PlayerTacticalProfile[] {
  if (!playerHistories || playerHistories.length === 0) return [];

  const maxWinners = Math.max(...playerHistories.map(p => p.avgWinners), 1);
  const maxTouches = Math.max(...playerHistories.map(p => p.avgTouches), 1);
  const minUnforced = Math.min(...playerHistories.map(p => p.avgUnforcedErrors), 0.5);

  return playerHistories.map(p => {
    const isAggressive = p.avgWinners >= 4 || p.totalWinners > 10;
    const isSolidDefense = p.avgUnforcedErrors <= 2.2;
    const isHighVolume = p.avgTouches >= 28;
    const ratio = p.winnerToUnforcedRatio;

    let archetype = 'Todoterreno Polivalente';
    let archetypeTagline = 'Equilibrio entre pegada ofensiva y solidez en fondo de pista';
    if (isAggressive && isSolidDefense) {
      archetype = 'Rematador Quirúrgico / Francotirador';
      archetypeTagline = 'Letal en la definición con mínimo margen de error';
    } else if (isAggressive && !isSolidDefense) {
      archetype = 'Pegador Agresivo de Alto Riesgo';
      archetypeTagline = 'Genera mucho peligro en ataque pero arriesga al límite';
    } else if (!isAggressive && isSolidDefense) {
      archetype = 'Muro Defensivo & Pasabolas Táctico';
      archetypeTagline = 'Infranqueable desde el cristal, desgasta a los rivales por paciencia';
    } else if (isHighVolume) {
      archetype = 'Constructor de Puntos / Motor del Equipo';
      archetypeTagline = 'Gran volumen de juego e influencia constante en cada intercambio';
    }

    const attackScore = Math.min(99, Math.max(50, Math.round((p.avgWinners / (maxWinners || 5)) * 40 + 55)));
    const defenseScore = Math.min(99, Math.max(50, Math.round(95 - (p.avgUnforcedErrors * 8))));
    const consistencyScore = Math.min(99, Math.max(45, Math.round(p.winRate * 0.4 + (ratio * 15) + 30)));
    const volumeScore = Math.min(99, Math.max(50, Math.round((p.avgTouches / (maxTouches || 35)) * 40 + 55)));
    const clutchScore = Math.min(99, Math.max(55, Math.round((p.winRate * 0.5) + (p.netDifferential > 0 ? 35 : 20))));
    const overallRating = Math.round((attackScore * 0.25) + (defenseScore * 0.25) + (consistencyScore * 0.2) + (volumeScore * 0.15) + (clutchScore * 0.15));

    const strengths: string[] = [];
    if (p.avgWinners >= 3.5) strengths.push('Gran pegada y determinación para cerrar los puntos en la red con remates y voleas');
    if (p.avgUnforcedErrors <= 2.5) strengths.push('Excelente disciplina táctica y paciencia, concediendo poquísimos puntos gratis');
    if (p.avgTouches >= 26) strengths.push('Lectura de juego privilegiada y alta participación en todas las transiciones');
    if (p.winRate >= 55) strengths.push('Gran mentalidad ganadora y serenidad en los puntos decisivos');
    if (strengths.length < 2) strengths.push('Constancia y regularidad durante los sets');

    const weaknesses: string[] = [];
    if (p.avgUnforcedErrors > 2.5) weaknesses.push('Tendencia a acelerar el tiro antes de tiempo en bolas intermedias sin ventaja clara');
    if (p.avgWinners < 3.0) weaknesses.push('Falta de mordiente o profundidad en la red para rematar cuando el rival queda descolocado');
    if (p.avgTouches < 20) weaknesses.push('Debe ganar más protagonismo y posicionarse mejor en el centro de la pista');
    if (weaknesses.length === 0) weaknesses.push('Mantener la concentración cuando los rivales buscan desgastarlo con globos cruzados');

    // Find complementary partner
    const others = playerHistories.filter(o => o.name !== p.name);
    let bestPartner = others[0]?.name || 'Compañero táctico';
    let synergyReason = 'Distribución equilibrada y comunicación fluida en pista.';

    if (isAggressive) {
      const defensiveOther = others.find(o => o.avgUnforcedErrors <= 2.5);
      if (defensiveOther) {
        bestPartner = defensiveOther.name;
        synergyReason = `${defensiveOther.name} aporta el orden y la solidez desde el fondo para que ${p.name} defina con libertad en la red.`;
      }
    } else {
      const attackingOther = others.find(o => o.avgWinners >= 3.5);
      if (attackingOther) {
        bestPartner = attackingOther.name;
        synergyReason = `${p.name} prepara el punto con bolas profundas y consistencia, dejando pelotas francas para el remate de ${attackingOther.name}.`;
      }
    }

    const tacticalAdvice = p.avgUnforcedErrors > 2.5
      ? `Aumenta el margen de seguridad sobre la red (+30cm) en los golpes neutros. Tu pegada es efectiva, pero si eliminas 2 errores no forzados por set, tu porcentaje de victorias subirá exponencialmente.`
      : `Mantén tu solidez defensiva y da un paso adelante cuando recibas globos cortos: busca definir con remates x3 o voleas profundas a la reja para no prolongar puntos ganados.`;

    const coachVerdict = `${p.name} es un pilar fundamental en cualquier pareja (${p.matchesPlayed} partidos, ${p.winRate}% vict.). Su balance diferencial de ${p.netDifferential >= 0 ? '+' : ''}${p.netDifferential} demuestra su impacto directo en el marcador.`;

    return {
      name: p.name,
      archetype,
      archetypeTagline,
      overallRating,
      strengths,
      weaknesses,
      tacticalAdvice,
      recommendedPartner: bestPartner,
      partnerSynergyReason: synergyReason,
      radarScores: {
        attack: attackScore,
        defense: defenseScore,
        consistency: consistencyScore,
        volume: volumeScore,
        clutch: clutchScore
      },
      coachVerdict
    };
  });
}

export function generateLocalPlayerIronicRoasts(playerHistories: PlayerHistorySummary[]): PlayerIronicRoast[] {
  if (!playerHistories || playerHistories.length === 0) return [];

  const excusesPool = [
    '«Es que estas bolas no tienen pelo, botan como piedras.»',
    '«El sol me ha cegado... (en pista cubierta con focos LED a 10 metros).»',
    '«Esta pala ha venido defectuosa de fábrica, noto la goma blanda.»',
    '«El cristal del fondo no escupe igual que el de mi club habitual.»',
    '«Iba a dejarla pasar porque creía que tuya era 100% clara.»',
    '«Tengo una sobrecarga en el gemelo desde el calentamiento de 2 minutos.»',
    '«La moqueta tiene demasiada arena en mi lado de la pista.»',
    '«Iba fuera por 3 metros pero el viento la ha metido dentro.»'
  ];

  const comicArchetypes = [
    {
      title: 'El Francotirador de Cristales Templados',
      summary: 'Cada remate suyo es un test de resistencia para las instalaciones del club. Si la bola no sale por 3, sale directa al cristal del fondo a 180 km/h.',
      award: '🥇 Premio "Seguro del Club a Todo Riesgo"',
      danger: '⚠️ Nivel Crítico (Los espectadores de la grada llevan casco)',
      ritual: 'Pide la cuenta en el bar antes de que termine el set para que no le toque pagar.',
      tip: 'La red mide 88 cm en el centro. No hace falta tirar a la estratosfera.'
    },
    {
      title: 'El Inspector de Palas y Grips',
      summary: 'Cada vez que falla una volea que entraba hasta con una sartén, se queda 20 segundos mirando el plano de la pala con cara de físico nuclear buscando una microfisura.',
      award: '🔍 Premio "CSI: Padel Forense"',
      danger: '🟡 Moderado (Peligro de muerte por aburrimiento mientras mira la pala)',
      ritual: 'Se cambia el overgrip entre juego y juego con 0-40 en contra.',
      tip: 'La pala está perfecta. El problema está a 70 cm del mango.'
    },
    {
      title: 'El Notario Selectivo del Marcador',
      summary: 'Cuando va 40-0 arriba canta el tanteo con voz de tenor de ópera. Cuando va 15-40 abajo le entra una amnesia fulminante y pregunta: «¿Cómo íbamos? ¿Iguales?».',
      award: '⚖️ Premio "Juez y Parte del 40-40"',
      danger: '🟢 Leve (Solo altera la presión arterial de su compañero)',
      ritual: 'Sugiere punto de oro solo cuando saca él.',
      tip: 'Si tienes dudas del marcador, normalmente vas perdiendo tú.'
    },
    {
      title: 'El Fantasma de la Red (¡Mía! ... ¡Tuya!)',
      summary: 'Sube a la red con la determinación de un león, pero cuando la bola viene al medio grita «¡MÍA!» y a medio metro salta y dice «¡TUYA, DALE!».',
      award: '👻 Premio "Espíritu de la Indecisión"',
      danger: '🟠 Alto (Posibilidad de colisión craneal con su compañero)',
      ritual: 'Celebra los errores no forzados del rival como si hubiera ganado el Máster Final.',
      tip: 'El centro de la pista no es un agujero negro de física cuántica. Hablad.'
    },
    {
      title: 'El MVP Indiscutible del Tercer Tiempo',
      summary: 'En pista puede tener más fallos que un examen sin estudiar, pero en cuanto pisa la terraza del bar es el que más rápido pide la jarra de cerveza y las bravas.',
      award: '🍻 Balón de Oro de la Caña & Tapa',
      danger: '🟢 Cero en pista, 100% en la barra del bar',
      ritual: 'Analiza el partido durante 2 horas en la terraza diciendo «si no fallo aquel smash en el 4-3, ganábamos».',
      tip: 'Hidratarse es clave, pero las cañas con limón no cuentan como electrolitos.'
    }
  ];

  return playerHistories.map((p, idx) => {
    const comic = comicArchetypes[idx % comicArchetypes.length];
    const excuse = excusesPool[idx % excusesPool.length];

    let customRoast = comic.summary;
    if (p.avgUnforcedErrors >= 2.5) {
      customRoast += ` Con una envidiable media de ${p.avgUnforcedErrors} errores por partido, es el mejor amigo de los rivales.`;
    } else if (p.avgWinners >= 3.5) {
      customRoast += ` Ha metido ${p.totalWinners} winners, y se encarga de recordárselo a todo el grupo en cada cena.`;
    }

    return {
      name: p.name,
      comicArchetype: comic.title,
      roastSummary: customRoast,
      signatureExcuse: excuse,
      absurdAward: comic.award,
      ironicTip: comic.tip,
      dangerLevelOnGlass: comic.danger,
      postMatchRitual: comic.ritual
    };
  });
}

export function generateLocalMatchNarrativeChronicle(match: PadelMatch): MatchNarrativeChronicle {
  const t1 = match.team1.name || `${match.team1.player1} & ${match.team1.player2}`;
  const t2 = match.team2.name || `${match.team2.player1} & ${match.team2.player2}`;
  const winner = match.winnerTeam === 1 ? t1 : t2;
  const runnerUp = match.winnerTeam === 1 ? t2 : t1;
  const score = match.setsScore || '6-4, 6-3';
  const mvp = match.mvp || match.team1.player1;

  const totalTouches = Object.values(match.stats || {}).reduce((a, b) => a + (b.touches || 0), 0);
  const totalWinners = Object.values(match.stats || {}).reduce((a, b) => a + (b.winners || 0), 0);
  const totalUnforced = Object.values(match.stats || {}).reduce((a, b) => a + (b.unforcedErrors || 0), 0);

  const headline = `🏆 ${winner} se impone a ${runnerUp} en un trepidante duelo resuelto por ${score}`;
  const subheadline = `MVP del encuentro: ${mvp} | ${totalWinners} winners totales y ${totalTouches} toques de bola registrados`;

  const fullStory = `En una jornada de altísima intensidad en ${match.court || 'la pista central'}, ${t1} y ${t2} disputaron un encuentro lleno de alternativas y emoción táctica.\n\nDesde los primeros compases, el partido se caracterizó por intercambios veloces en la red y una férrea defensa desde el fondo. La pareja vencedora (${winner}) supo gestionar con mayor templanza los instantes críticos, marcando diferencias gracias a la actuación estelar de ${mvp}, quien lideró el balance con golpes decisivos.\n\nA pesar de la tenaz resistencia de ${runnerUp}, que batalló cada juego hasta el final, el control de los errores no forzados (${totalUnforced} en todo el encuentro) y la efectividad en los puntos calientes inclinaron la balanza definitiva para sellar el marcador en ${score}.\n\nEl tercer tiempo en la terraza sirvió para limar asperezas y debatir si esa bola dudosa del segundo set tocó línea o cristal.`;

  const turningPoint = `El punto de inflexión llegó en el tramo medio del encuentro, cuando ${winner} enlazó tres winners consecutivos en la red para romper el servicio rival y consolidar la ventaja definitiva.`;

  const postMatchQuotes = [
    {
      speaker: mvp,
      quote: `«Sabíamos que teníamos que ser pacientes en los globos y esperar la bola franca. Muy feliz con el rendimiento y los winners que han entrado en momentos calientes.»`
    },
    {
      speaker: match.winnerTeam === 1 ? match.team2.player1 : match.team1.player1,
      quote: `«Tuvimos nuestras opciones en varios juegos clave, pero ellos no han perdonado en la red. Toca entrenar la bandeja y tomarnos la revancha en el próximo partido.»`
    }
  ];

  const whatsappShareText = `🎾 *CRÓNICA DEL PARTIDO DE PÁDEL* 🎾\n📅 Fecha: ${match.date}\n📍 Pista: ${match.court || 'Pista Principal'}\n\n⚔️ *${t1}* vs *${t2}*\n🏆 *Resultado Final:* ${score}\n🥇 *Ganadores:* ${winner}\n🌟 *MVP:* ${mvp}\n\n📊 *Estadísticas Clave:*\n• Toques totales: ${totalTouches}\n• Winners: ${totalWinners}\n• Errores no forzados: ${totalUnforced}\n\n💬 *Resumen:* ${headline}\n\n🍻 ¡Nos vemos en el tercer tiempo!`;

  return {
    matchId: match.id,
    headline,
    subheadline,
    fullStory,
    keyTurningPoint: turningPoint,
    postMatchQuotes,
    whatsappShareText
  };
}

// Helper to describe the exact moment and score in the match where a rally took place
export function getRallyMomentDescription(rally: PointRally, match?: PadelMatch): string {
  if (rally.scoreContextDescription) {
    return rally.scoreContextDescription;
  }

  const setStr = rally.setNumber ? `${rally.setNumber}º set` : '1º set';
  const gamesStr = rally.gamesContext ? `yendo ${rally.gamesContext}` : (match?.setsScore ? `en el transcurso de los sets (${match.setsScore})` : 'durante el juego');
  const pointsStr = rally.pointsContext ? `en el ${rally.pointsContext}` : (rally.scoreSnapshotText ? `en el ${rally.scoreSnapshotText}` : 'en punto decisivo');

  return `${pointsStr} ${gamesStr} en el ${setStr}`;
}

// Helper to generate the full padel narrative of the point: who served, who finished, touch count and match part
export function getRallyNarrativeSummary(rally: PointRally, match?: PadelMatch): string {
  const touches = rally.rallyLength || (rally.touchOrder ? rally.touchOrder.length : 1);
  const server = rally.servingPlayer || (rally.touchOrder && rally.touchOrder[0]) || 'el sacador';
  
  let finishDesc = '';
  if (rally.endingAction === 'winner') {
    const finisher = rally.pointWinnerPlayer || (rally.touchOrder && rally.touchOrder[rally.touchOrder.length - 1]) || 'el rematador';
    finishDesc = `lo cerró ${finisher} con un Winner ⚡`;
  } else if (rally.endingAction === 'forced_error') {
    const forcer = rally.forcedByPlayer || rally.pointWinnerPlayer || 'el atacante';
    const victim = rally.forcedOnPlayer || 'el defensor';
    finishDesc = `lo cerró ${forcer} forzando el fallo de ${victim} 🛡️`;
  } else if (rally.endingAction === 'unforced_error') {
    const errored = rally.unforcedErrorPlayer || (rally.touchOrder && rally.touchOrder[rally.touchOrder.length - 1]) || 'el defensor';
    finishDesc = `terminó con un error no forzado de ${errored} ❌`;
  } else {
    const winner = rally.pointWinnerPlayer || `la Pareja ${rally.pointWinnerTeam || 1}`;
    finishDesc = `lo cerró ${winner}`;
  }

  const moment = getRallyMomentDescription(rally, match);
  const timeDesc = rally.timeSec !== undefined || rally.videoTimeSec !== undefined 
    ? ` (⏱️ min ${Math.floor((rally.timeSec ?? rally.videoTimeSec ?? 0) / 60)}:${((rally.timeSec ?? rally.videoTimeSec ?? 0) % 60).toString().padStart(2, '0')})` 
    : '';

  return `Punto de ${touches} toques que empezó sacando ${server} y ${finishDesc}. Ocurrió ${moment}${timeDesc}.`;
}

export function calculateMatchRallyAnalytics(match: PadelMatch): MatchRallyAnalytics {
  const rallies: Array<PointRally> = [];
  const t1Players = [match.team1?.player1, match.team1?.player2].filter(Boolean) as string[];
  const t2Players = [match.team2?.player1, match.team2?.player2].filter(Boolean) as string[];
  const allPlayers = Object.keys(match.stats || {});
  if (allPlayers.length === 0 && (t1Players.length > 0 || t2Players.length > 0)) {
    allPlayers.push(...t1Players, ...t2Players);
  }

  // 1. Extract explicit pointRallies if present
  if (match.pointRallies && match.pointRallies.length > 0) {
    match.pointRallies.forEach((r, idx) => {
      const server = r.servingPlayer || (r.touchOrder && r.touchOrder[0]) || (allPlayers[idx % Math.max(allPlayers.length, 1)] || 'Jugador 1');
      const setNum = r.setNumber || 1;
      const games = r.gamesContext || (idx < 6 ? '1-0' : idx < 12 ? '3-0' : idx < 18 ? '4-2' : '5-4');
      const points = r.pointsContext || r.scoreSnapshotText || (idx % 4 === 0 ? '40-40 (iguales)' : idx % 3 === 0 ? '30-15' : '40-30');
      const scoreContextDesc = r.scoreContextDescription || `en el ${points} yendo ${games} en el ${setNum}º set`;

      rallies.push({
        ...r,
        setNumber: setNum,
        gamesContext: games,
        pointsContext: points,
        servingPlayer: server,
        scoreContextDescription: scoreContextDesc,
        matchTitle: match.title,
        matchDate: match.date
      });
    });
  } else if (match.inProgressScoreboard?.pointsHistory && match.inProgressScoreboard.pointsHistory.length > 0) {
    // 2. Derive from scoreboard pointsHistory
    match.inProgressScoreboard.pointsHistory.forEach((pt, idx) => {
      const touches = pt.touchOrder && pt.touchOrder.length > 0 
        ? pt.touchOrder 
        : (pt.attributedPlayer ? [pt.attributedPlayer] : []);
      
      const rallyLen = pt.rallyLength || (touches.length > 0 ? touches.length : 3);
      const server = (touches && touches[0]) || allPlayers[idx % Math.max(allPlayers.length, 1)] || 'Sacador';
      const setNum = Math.floor(idx / 24) + 1;
      const gameNum = (Math.floor(idx / 4) % 6);
      const games = `${gameNum}-${Math.max(0, gameNum - 1)}`;
      const points = pt.scoreText || '40-40';
      const scoreContextDesc = `en el ${points} yendo ${games} en el ${setNum}º set`;

      rallies.push({
        id: pt.id || `pt-${idx}`,
        pointNumber: idx + 1,
        timeSec: pt.timeSec,
        videoTimeSec: pt.timeSec,
        scoreText: pt.scoreText,
        servingPlayer: server,
        touchOrder: touches,
        rallyLength: rallyLen,
        endingAction: pt.actionType,
        pointWinnerTeam: pt.scoringTeam,
        pointWinnerPlayer: pt.attributedPlayer,
        forcedByPlayer: pt.forcedByPlayer,
        forcedOnPlayer: pt.forcedOnPlayer,
        unforcedErrorPlayer: pt.actionType === 'unforced_error' ? pt.attributedPlayer : undefined,
        setNumber: setNum,
        gamesContext: games,
        pointsContext: points,
        scoreContextDescription: scoreContextDesc,
        matchTitle: match.title,
        matchDate: match.date,
        description: `Punto #${idx + 1} (${scoreContextDesc})`
      });
    });
  }

  // 3. If no granular rallies exist yet (e.g. historical matches), generate structured simulated rallies based on match.stats
  if (rallies.length === 0) {
    const totalWinners = Object.values(match.stats || {}).reduce((s, p) => s + (p.winners || 0), 0);
    const totalForced = Object.values(match.stats || {}).reduce((s, p) => s + (p.forcedErrors || 0), 0);
    const totalUnforced = Object.values(match.stats || {}).reduce((s, p) => s + (p.unforcedErrors || 0), 0);
    const totalTouches = Object.values(match.stats || {}).reduce((s, p) => s + (p.touches || 0), 0);

    let pointCount = totalWinners + totalForced + totalUnforced;
    if (pointCount === 0) pointCount = Math.max(1, Math.round(totalTouches / 4));

    const sampleMoments = [
      { set: 1, games: '3-0', points: '40-40 (iguales)' },
      { set: 1, games: '4-2', points: '30-40 (bola de break)' },
      { set: 1, games: '5-4', points: '40-40 (punto de oro)' },
      { set: 2, games: '1-1', points: '30-15' },
      { set: 2, games: '3-2', points: '40-30' },
      { set: 2, games: '5-5', points: '40-40 (iguales)' },
      { set: 2, games: '6-6', points: 'Tie-break (5-4)' },
      { set: 2, games: '6-6', points: 'Tie-break (6-5)' }
    ];

    // Generate representative rallies
    allPlayers.forEach((pName, pIdx) => {
      const stat = match.stats[pName];
      const isTeam1 = t1Players.includes(pName);
      const rivalPlayers = isTeam1 ? (t2Players.length ? t2Players : ['Rival 1', 'Rival 2']) : (t1Players.length ? t1Players : ['Rival 1', 'Rival 2']);
      const partner = isTeam1 
        ? (t1Players.find(p => p !== pName) || t1Players[0] || pName)
        : (t2Players.find(p => p !== pName) || t2Players[0] || pName);

      // Generate forced error rallies
      for (let f = 0; f < (stat?.forcedErrors || 0); f++) {
        const forcingRival = rivalPlayers[(f + pIdx) % rivalPlayers.length];
        const server = (f % 2 === 0 ? forcingRival : partner) || pName;
        const rallyLen = 6 + ((f * 3 + pIdx) % 11);
        
        // Touch order starting with server and ending with victim
        const sequence: string[] = [server];
        for (let s = 1; s < rallyLen - 1; s++) {
          sequence.push(s % 2 === 0 ? forcingRival : pName);
        }
        sequence.push(pName); // finishes with victim making error under pressure

        const mom = sampleMoments[(f + pIdx) % sampleMoments.length];
        const scoreContextDesc = `en el ${mom.points} yendo ${mom.games} en el ${mom.set}º set`;

        rallies.push({
          id: `sim-forced-${pName}-${f}`,
          pointNumber: rallies.length + 1,
          scoreText: mom.points,
          servingPlayer: server,
          touchOrder: sequence,
          rallyLength: rallyLen,
          endingAction: 'forced_error',
          pointWinnerTeam: isTeam1 ? 2 : 1,
          pointWinnerPlayer: forcingRival,
          forcedByPlayer: forcingRival,
          forcedOnPlayer: pName,
          setNumber: mom.set,
          gamesContext: mom.games,
          pointsContext: mom.points,
          scoreContextDescription: scoreContextDesc,
          matchTitle: match.title,
          matchDate: match.date,
          description: `Error forzado de ${pName} provocado por ${forcingRival} (${scoreContextDesc})`
        });
      }

      // Generate winners
      for (let w = 0; w < (stat?.winners || 0); w++) {
        const rivalTarget = rivalPlayers[(w + pIdx) % rivalPlayers.length];
        const server = (w % 2 === 0 ? pName : rivalTarget) || pName;
        const rallyLen = 5 + ((w * 4 + pIdx) % 14);
        
        const sequence: string[] = [server];
        for (let s = 1; s < rallyLen - 1; s++) {
          sequence.push(s % 2 === 0 ? pName : rivalTarget);
        }
        sequence.push(pName); // finishes with winner shot from pName

        const mom = sampleMoments[(w + pIdx + 2) % sampleMoments.length];
        const scoreContextDesc = `en el ${mom.points} yendo ${mom.games} en el ${mom.set}º set`;

        rallies.push({
          id: `sim-winner-${pName}-${w}`,
          pointNumber: rallies.length + 1,
          scoreText: mom.points,
          servingPlayer: server,
          touchOrder: sequence,
          rallyLength: rallyLen,
          endingAction: 'winner',
          pointWinnerTeam: isTeam1 ? 1 : 2,
          pointWinnerPlayer: pName,
          setNumber: mom.set,
          gamesContext: mom.games,
          pointsContext: mom.points,
          scoreContextDescription: scoreContextDesc,
          matchTitle: match.title,
          matchDate: match.date,
          description: `⚡ Winner de ${pName} para cerrar el punto (${scoreContextDesc})`
        });
      }

      // Generate unforced errors
      for (let u = 0; u < (stat?.unforcedErrors || 0); u++) {
        const server = pName;
        const rallyLen = 3 + (u % 5);
        const sequence = [server];
        for (let s = 1; s < rallyLen; s++) {
          sequence.push(s % 2 === 0 ? pName : rivalPlayers[0]);
        }

        const mom = sampleMoments[(u + pIdx + 4) % sampleMoments.length];
        const scoreContextDesc = `en el ${mom.points} yendo ${mom.games} en el ${mom.set}º set`;

        rallies.push({
          id: `sim-unforced-${pName}-${u}`,
          pointNumber: rallies.length + 1,
          scoreText: mom.points,
          servingPlayer: server,
          touchOrder: sequence,
          rallyLength: rallyLen,
          endingAction: 'unforced_error',
          pointWinnerTeam: isTeam1 ? 2 : 1,
          unforcedErrorPlayer: pName,
          setNumber: mom.set,
          gamesContext: mom.games,
          pointsContext: mom.points,
          scoreContextDescription: scoreContextDesc,
          matchTitle: match.title,
          matchDate: match.date,
          description: `❌ Error no forzado de ${pName} (${scoreContextDesc})`
        });
      }
    });
  }

  // Calculate Forced Errors Matrix: [forcingPlayer][forcedPlayer] = count
  const matrix: Record<string, Record<string, number>> = {};
  const forcingTotals: Record<string, { total: number; victimMap: Record<string, number> }> = {};

  rallies.forEach(r => {
    if (r.forcedByPlayer && r.forcedOnPlayer) {
      const forcing = r.forcedByPlayer;
      const forced = r.forcedOnPlayer;

      if (!matrix[forcing]) matrix[forcing] = {};
      matrix[forcing][forced] = (matrix[forcing][forced] || 0) + 1;

      if (!forcingTotals[forcing]) {
        forcingTotals[forcing] = { total: 0, victimMap: {} };
      }
      forcingTotals[forcing].total += 1;
      forcingTotals[forcing].victimMap[forced] = (forcingTotals[forcing].victimMap[forced] || 0) + 1;
    }
  });

  // Top Forcing Players Ranking
  const topForcingPlayers = Object.keys(forcingTotals)
    .map(pName => {
      const data = forcingTotals[pName];
      let primaryVictim = 'Ninguno';
      let maxCount = 0;
      Object.entries(data.victimMap).forEach(([vic, count]) => {
        if (count > maxCount) {
          maxCount = count;
          primaryVictim = vic;
        }
      });
      return {
        player: pName,
        totalForced: data.total,
        primaryVictim,
        countAgainstVictim: maxCount,
        victimBreakdown: data.victimMap
      };
    })
    .sort((a, b) => b.totalForced - a.totalForced);

  // Sort rallies by length
  const sortedByLength = [...rallies].sort((a, b) => b.rallyLength - a.rallyLength);
  const longestRally = sortedByLength[0] || null;
  const topLongestRallies = sortedByLength.slice(0, 5);

  const totalTouches = rallies.reduce((acc, r) => acc + (r.rallyLength || 0), 0);
  const avgTouchesPerPoint = rallies.length > 0 ? +(totalTouches / rallies.length).toFixed(1) : 0;

  // Distribution
  const distribution = {
    short: rallies.filter(r => (r.rallyLength || 0) <= 3).length,
    medium: rallies.filter(r => (r.rallyLength || 0) >= 4 && (r.rallyLength || 0) <= 7).length,
    long: rallies.filter(r => (r.rallyLength || 0) >= 8).length
  };

  return {
    totalPoints: rallies.length,
    longestRally,
    topLongestRallies,
    avgTouchesPerPoint,
    forcedErrorsMatrix: matrix,
    topForcingPlayers,
    rallyLengthDistribution: distribution
  };
}

export function calculateGlobalRallyAnalytics(matches: PadelMatch[]) {
  const globalMatrix: Record<string, Record<string, number>> = {};
  const allRallies: Array<any> = [];

  matches.forEach(m => {
    const analytics = calculateMatchRallyAnalytics(m);
    if (analytics.topLongestRallies) {
      analytics.topLongestRallies.forEach(r => allRallies.push({ ...r, matchTitle: m.title, matchDate: m.date }));
    }

    Object.entries(analytics.forcedErrorsMatrix).forEach(([forcing, victims]) => {
      if (!globalMatrix[forcing]) globalMatrix[forcing] = {};
      Object.entries(victims).forEach(([forced, count]) => {
        globalMatrix[forcing][forced] = (globalMatrix[forcing][forced] || 0) + count;
      });
    });
  });

  const topLongestGlobal = allRallies.sort((a, b) => b.rallyLength - a.rallyLength).slice(0, 5);

  const forcingRanking = Object.keys(globalMatrix).map(forcing => {
    const victims = globalMatrix[forcing];
    const total = Object.values(victims).reduce((a, b) => a + b, 0);
    let topVictim = 'Nadie';
    let topVictimCount = 0;
    Object.entries(victims).forEach(([v, c]) => {
      if (c > topVictimCount) {
        topVictimCount = c;
        topVictim = v;
      }
    });
    return {
      forcingPlayer: forcing,
      totalForced: total,
      topVictim,
      topVictimCount,
      breakdown: victims
    };
  }).sort((a, b) => b.totalForced - a.totalForced);

  return {
    globalMatrix,
    topLongestGlobal,
    forcingRanking
  };
}
