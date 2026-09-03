import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Upload, Play, Square, Loader2, Sparkles, Volume2, FileAudio, RotateCcw, CheckCircle2, AlertCircle, FileText, Clipboard, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerStats } from '../types';

interface AudioRecorderProps {
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
  }) => void;
  knownPlayers?: string[];
}

const SAMPLE_AUDIOS = [
  {
    title: 'Audio 1: Remates de Álvaro y defensa de Pablo (Set 1)',
    description: 'Relato de 4 juegos intensos con varios remates x3 de Álvaro, voleas de Carlos y un par de errores de Marcos.',
    text: 'Saca Álvaro al revés de Marcos, resta cruzado hacia Carlos. Volea Carlos al centro, globo de Pablo al fondo. Salta Álvaro y remate x3 ganador, winner de Álvaro. Siguiente punto: saca Carlos, resta Pablo profunda, Carlos intenta una dejada que se queda en la red, error no forzado de Carlos. En el siguiente juego, Marcos falla dos globos largos por error no forzado, y Pablo salva tres bolas con toques increíbles pero Álvaro cierra con otra volea ganadora. Toques del set: Álvaro 45, Carlos 38, Pablo 52, Marcos 34. Errores forzados: Álvaro 2, Carlos 4, Pablo 3, Marcos 5. Errores no forzados: Álvaro 2, Carlos 3, Pablo 2, Marcos 6. Winners: Álvaro 9, Carlos 5, Pablo 4, Marcos 2. Ganaron Álvaro y Carlos 6-4.',
  },
  {
    title: 'Audio 2: Tie-break decisivo y remontada',
    description: 'Narración de un tie-break a 7 puntos con gran nivel de Lucía y consistencia defensiva de Pablo.',
    text: 'Tie-break del tercer set entre Lucía y Pablo contra Carlos y Diego. Primer mini-break: globo milimétrico de Lucía, Carlos fuerza la bajada de pared y Diego comete error forzado. Luego Pablo mete una víbora cruzada al cristal lateral, winner directo de Pablo. Carlos reacciona con dos remates de potencia ganadores, sumando 2 winners. Diego comete un error no forzado con volea a la malla. Lucía cierra el partido con una volea rasa al pie de Carlos. Estadísticas del tie-break y últimos juegos: Lucía 32 toques, 1 error forzado, 1 no forzado, 4 winners. Pablo 38 toques, 2 errores forzados, 1 no forzado, 5 winners. Carlos 28 toques, 3 errores forzados, 4 no forzados, 4 winners. Diego 22 toques, 4 errores forzados, 5 no forzados, 1 winner. Victoria para Lucía y Pablo 7-6.',
  },
  {
    title: 'Audio 3: Narración con rectificaciones ("...espera, este era forzado")',
    description: 'Ejemplo de autocorrección en directo donde el usuario rectifica fallos y autores de puntos durante la narración.',
    text: 'Relato del juego: Saca Carlos, resta Pablo al cristal. Álvaro remata al cuerpo de Marcos y Álvaro anota error no forzado... espera, rectifico, este último de Álvaro sí que era error forzado porque la bajada de pared de Marcos venía durísima a los pies. Siguiente jugada: Winner de Marcos... no, perdón, rectifico, ha sido winner de Pablo con una dejada milimétrica. Y en el punto de juego, Carlos comete error no forzado al mandar una volea franca a la reja. Total del set: Álvaro 50 toques, 3 errores forzados, 2 no forzados, 8 winners. Carlos 45 toques, 4 errores forzados, 4 no forzados, 5 winners. Pablo 60 toques, 2 errores forzados, 2 no forzados, 7 winners. Marcos 40 toques, 5 errores forzados, 5 no forzados, 3 winners. Resultado 6-3 para Álvaro y Carlos.',
  }
];

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAnalysisComplete, knownPlayers = [] }) => {
  const [activeTab, setActiveTab] = useState<'mic' | 'upload' | 'sample' | 'text'>('mic');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [customText, setCustomText] = useState<string>('');
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [matchContext, setMatchContext] = useState<string>('Partido amistoso 4 jugadores');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Timer counter
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  // Audio Visualizer waveform on canvas
  const startVisualizer = (stream: MediaStream) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!isRecording && !analyserRef.current) return;
        animationFrameRef.current = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * (canvas.height - 10);

          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#10B981'); // emerald
          gradient.addColorStop(1, '#6EE7B7');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, 3);
          ctx.fill();

          x += barWidth + 1;
        }
      };

      draw();
    } catch (e) {
      console.warn('Canvas visualizer not supported or failed:', e);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  };

  const startRecording = async () => {
    setErrorMsg(null);
    setAudioBlob(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startVisualizer(stream);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setAudioUrl(url);
        stopVisualizer();
        // Stop all media tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(250);
      setIsRecording(true);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      setErrorMsg('No se pudo acceder al micrófono. Por favor permite el acceso al micrófono en el navegador o sube un archivo de audio.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        resolve(res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleAnalyze = async () => {
    setErrorMsg(null);
    setIsAnalyzing(true);

    try {
      let payload: any = {
        players: knownPlayers,
        matchContext
      };

      if (activeTab === 'mic' || activeTab === 'upload') {
        if (!audioBlob) {
          throw new Error('Primero graba o sube un archivo de audio.');
        }
        const base64Data = await blobToBase64(audioBlob);
        payload.audioBase64 = base64Data;
        payload.mimeType = audioBlob.type || 'audio/webm';
      } else if (activeTab === 'sample') {
        if (selectedSampleIndex === null) {
          throw new Error('Selecciona uno de los audios de ejemplo.');
        }
        payload.transcriptText = SAMPLE_AUDIOS[selectedSampleIndex].text;
      } else if (activeTab === 'text') {
        if (!customText.trim()) {
          throw new Error('Escribe la transcripción o notas del partido.');
        }
        payload.transcriptText = customText.trim();
      }

      const res = await fetch('/api/analyze-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Error en el servidor: ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'No se pudo procesar el análisis.');
      }

      onAnalysisComplete({
        transcription: data.transcription,
        detectedPlayers: data.detectedPlayers,
        stats: data.stats,
        summary: data.summary,
        highlights: data.highlights,
        mvp: data.mvp,
        scoreEstimate: data.scoreEstimate,
        tacticalAdvice: data.tacticalAdvice,
        audioName: uploadedFileName || (isRecording ? `Audio en vivo (${recordingTime}s)` : 'Nota de voz de pádel')
      });

    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMsg(err.message || 'Ocurrió un error inesperado al analizar el audio.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div id="audio-recorder-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Analizador de Audio y Voz con IA
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                  Gemini 3.7 Flash
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dicta o sube audios de tus partidos para extraer toques, errores forzados, no forzados y winners de cada jugador.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
          <button
            id="tab-mic"
            type="button"
            onClick={() => { setActiveTab('mic'); setErrorMsg(null); }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'mic' ? 'bg-emerald-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Grabar Micrófono
          </button>
          <button
            id="tab-upload"
            type="button"
            onClick={() => { setActiveTab('upload'); setErrorMsg(null); }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'upload' ? 'bg-emerald-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Subir Audio
          </button>
          <button
            id="tab-text"
            type="button"
            onClick={() => { setActiveTab('text'); setErrorMsg(null); }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'text' ? 'bg-emerald-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Pegar Texto / Transcripción
          </button>
          <button
            id="tab-sample"
            type="button"
            onClick={() => { setActiveTab('sample'); setErrorMsg(null); }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'sample' ? 'bg-emerald-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ejemplos
          </button>
        </div>
      </div>

      <div className="mt-5">
        {/* Context / Players Hint */}
        <div className="mb-4 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
          {knownPlayers.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-400">
                👥 Jugadores del grupo:
                <span className="text-emerald-300 font-semibold ml-1.5">
                  {knownPlayers.join(', ')}
                </span>
              </span>
              <span className="text-slate-500 italic">
                La IA identificará a los jugadores automáticamente por su nombre.
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60 text-[11px] text-cyan-300/90">
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/50 text-cyan-300 font-bold shrink-0">
              🎾 Regla de Saque
            </span>
            <span>
              El saque en juego cuenta como <strong>1 toque</strong> de pala. Si el jugador falla el primer saque y mete el segundo, <strong>solo se contabiliza 1 toque de bola</strong> (el 1er saque fallido no suma toques extra ni cuenta como error no forzado salvo doble falta).
            </span>
          </div>
        </div>

        {/* 1. MIC TAB */}
        {activeTab === 'mic' && (
          <div className="flex flex-col items-center justify-center p-6 bg-slate-950/40 rounded-xl border border-slate-800/60">
            <canvas
              ref={canvasRef}
              width={320}
              height={50}
              className={`mb-4 rounded-lg transition-opacity ${isRecording ? 'opacity-100' : 'opacity-20'}`}
            />

            <div className="flex items-center gap-4">
              {!isRecording ? (
                <button
                  id="btn-start-record"
                  type="button"
                  onClick={startRecording}
                  disabled={isAnalyzing}
                  className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2.5 transition transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Mic className="w-5 h-5" />
                  Comenzar a Grabar Voz
                </button>
              ) : (
                <button
                  id="btn-stop-record"
                  type="button"
                  onClick={stopRecording}
                  className="px-6 py-3.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 flex items-center gap-2.5 animate-pulse cursor-pointer"
                >
                  <Square className="w-5 h-5 fill-current" />
                  Detener Grabación ({formatSeconds(recordingTime)})
                </button>
              )}
            </div>

            {audioUrl && !isRecording && (
              <div className="mt-4 w-full max-w-md bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Audio grabado ({formatSeconds(recordingTime)})
                </div>
                <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
                <button
                  type="button"
                  onClick={startRecording}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Re-grabar
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. UPLOAD TAB */}
        {activeTab === 'upload' && (
          <div className="p-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-700/80 flex flex-col items-center justify-center text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
              onChange={handleFileUpload}
              className="hidden"
              id="audio-file-input"
            />
            <div className="p-4 bg-slate-800/60 rounded-full text-emerald-400 mb-3">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">
              Selecciona o arrastra una nota de voz o archivo de audio
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Formatos soportados: MP3, WAV, M4A, WEBM, OGG grabados desde WhatsApp, Telegram o grabadora de voz.
            </p>
            <button
              id="btn-select-audio-file"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
            >
              Explorar Archivos de Audio
            </button>

            {uploadedFileName && audioUrl && (
              <div className="mt-4 w-full max-w-md bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex items-center justify-between gap-3 text-left">
                <div className="truncate text-xs font-medium text-emerald-300 flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{uploadedFileName}</span>
                </div>
                <audio src={audioUrl} controls className="h-8 max-w-[180px]" />
              </div>
            )}
          </div>
        )}

        {/* 3. SAMPLES TAB */}
        {activeTab === 'sample' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SAMPLE_AUDIOS.map((sample, idx) => (
              <div
                key={idx}
                id={`sample-audio-card-${idx}`}
                onClick={() => setSelectedSampleIndex(idx)}
                className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                  selectedSampleIndex === idx
                    ? 'bg-emerald-950/40 border-emerald-500/70 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-sm font-bold text-slate-100">{sample.title}</h4>
                  {selectedSampleIndex === idx && (
                    <span className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                      Seleccionado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-2">{sample.description}</p>
                <div className="text-[11px] text-slate-500 bg-slate-900/80 p-2.5 rounded-lg line-clamp-3 italic border border-slate-800/50">
                  "{sample.text}"
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4. TEXT NOTES TAB */}
        {activeTab === 'text' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                Pega aquí la transcripción o resumen textual de tu partido:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setCustomText(text);
                    } catch (e) {
                      // fallback
                    }
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer"
                  title="Pegar desde el portapapeles"
                >
                  <Clipboard className="w-3 h-3 text-emerald-400" />
                  Pegar portapapeles
                </button>
                {customText && (
                  <button
                    type="button"
                    onClick={() => setCustomText('')}
                    className="p-1 bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded-lg border border-slate-800 transition cursor-pointer"
                    title="Borrar texto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <textarea
              id="custom-transcript-text"
              rows={5}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Ejemplo: Partido de ayer entre Álvaro y Carlos contra Pablo y Marcos. Quedaron 6-4, 3-6 y 6-3. Álvaro hizo 12 winners y 70 toques pero cometió 4 errores no forzados. Pablo defendió muchísimo con 95 toques y solo 3 errores no forzados..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 leading-relaxed font-sans"
            />

            {/* Quick Helper Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 font-medium">Plantillas rápidas:</span>
              <button
                type="button"
                onClick={() => setCustomText((prev) => (prev ? prev + '\n' : '') + 'Partido entre Álvaro y Carlos vs Pablo y Marcos. Resultado: 6-4, 6-3. Álvaro: 75 toques, 11 winners, 3 errores no forzados, 4 forzados. Carlos: 60 toques, 8 winners, 5 errores no forzados, 6 forzados. Pablo: 80 toques, 6 winners, 4 errores no forzados, 5 forzados. Marcos: 55 toques, 4 winners, 8 errores no forzados, 7 forzados.')}
                className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-md border border-slate-800 transition cursor-pointer"
              >
                + Estructura con números
              </button>
              <button
                type="button"
                onClick={() => setCustomText((prev) => (prev ? prev + '\n' : '') + 'Álvaro anota error no forzado... espera, este último sí que era error forzado porque la bajada de pared de Pablo venía muy baja y con mucho efecto. Winner de Marcos... no, perdón, rectifico, fue winner de Carlos con un remate x3.')}
                className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-md border border-slate-800 transition cursor-pointer"
              >
                + Probar autocorrección en directo
              </button>
              <button
                type="button"
                onClick={() => setCustomText((prev) => (prev ? prev + '\n' : '') + 'Narración: Salte a rematar con Álvaro y metí 5 remates x3 ganadores en el segundo set. Carlos falló varias voleas fáciles en la red por precipitarse. Pablo estuvo impecable en el fondo de pista levantando todos los globos y Marcos arriesgó con paralelas que se fueron fuera.')}
                className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 rounded-md border border-slate-800 transition cursor-pointer"
              >
                + Narración de jugadas
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Action Button */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Soporta <strong>autocorrecciones al hablar</strong> (ej. <em>"espera, este era forzado"</em>) y extrae las 4 métricas clave.</span>
          </div>

          <button
            id="btn-analyze-audio-now"
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || isRecording || (activeTab === 'mic' && !audioBlob) || (activeTab === 'upload' && !audioBlob) || (activeTab === 'sample' && selectedSampleIndex === null) || (activeTab === 'text' && !customText.trim())}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analizando con Gemini 3.7 Flash...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generar Resumen Estadístico con IA
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
