import React, { useState, useMemo } from 'react';
import { 
  RotateCw, 
  RotateCcw, 
  FlipHorizontal, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Smartphone, 
  Monitor, 
  Maximize2,
  Film,
  Sliders
} from 'lucide-react';

interface RotatableYouTubePlayerProps {
  videoId: string;
  title?: string;
  startTime?: number;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  rotation?: number; // 0, 90, 180, 270
  onRotationChange?: (newRotation: number) => void;
  mirror?: boolean;
  onMirrorChange?: (newMirror: boolean) => void;
  zoom?: number;
  onZoomChange?: (newZoom: number) => void;
  allowFullscreen?: boolean;
  className?: string;
}

export const RotatableYouTubePlayer: React.FC<RotatableYouTubePlayerProps> = ({
  videoId,
  title = 'YouTube Padel Video',
  startTime = 0,
  iframeRef,
  rotation: propRotation,
  onRotationChange,
  mirror: propMirror,
  onMirrorChange,
  zoom: propZoom,
  onZoomChange,
  allowFullscreen = true,
  className = ''
}) => {
  // Internal state if uncontrolled
  const [internalRotation, setInternalRotation] = useState<number>(0);
  const [internalMirror, setInternalMirror] = useState<boolean>(false);
  const [internalZoom, setInternalZoom] = useState<number>(1);
  const [viewportMode, setViewportMode] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [showTools, setShowTools] = useState<boolean>(true);

  const rotation = propRotation !== undefined ? propRotation : internalRotation;
  const mirror = propMirror !== undefined ? propMirror : internalMirror;
  const zoom = propZoom !== undefined ? propZoom : internalZoom;

  const setRotation = (newRot: number) => {
    const normalized = ((newRot % 360) + 360) % 360;
    if (onRotationChange) onRotationChange(normalized);
    else setInternalRotation(normalized);
  };

  const setMirror = (newMirror: boolean) => {
    if (onMirrorChange) onMirrorChange(newMirror);
    else setInternalMirror(newMirror);
  };

  const setZoom = (newZoom: number) => {
    const clamped = Math.min(2.5, Math.max(0.5, Number(newZoom.toFixed(2))));
    if (onZoomChange) onZoomChange(clamped);
    else setInternalZoom(clamped);
  };

  const isRotatedQuarter = rotation === 90 || rotation === 270;

  // Determine effective aspect ratio container mode
  const effectiveIsPortrait = useMemo(() => {
    if (viewportMode === 'portrait') return true;
    if (viewportMode === 'landscape') return false;
    // auto: if rotated 90 or 270, switch to vertical container for maximum clarity
    return isRotatedQuarter;
  }, [viewportMode, isRotatedQuarter]);

  // Compute CSS transformations
  const { iframeStyle, containerClass } = useMemo(() => {
    if (isRotatedQuarter) {
      if (effectiveIsPortrait) {
        // Vertical container (9:16): iframe width is 177.78% (16/9), height is 56.25% (9/16)
        // When rotated 90deg, it fits perfectly in the vertical frame!
        return {
          containerClass: 'aspect-[9/16] max-h-[560px] w-full max-w-[340px] sm:max-w-[380px] mx-auto',
          iframeStyle: {
            width: '177.777778%',
            height: '56.25%',
            position: 'absolute' as const,
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) rotate(${rotation}deg) scaleX(${mirror ? -1 : 1}) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.25s ease-out'
          }
        };
      } else {
        // Landscape container (16:9): scale down to fit inside 16:9 or custom zoom
        const fitScale = 0.5625 * zoom;
        return {
          containerClass: 'aspect-video w-full',
          iframeStyle: {
            width: '100%',
            height: '100%',
            position: 'absolute' as const,
            top: '0',
            left: '0',
            transform: `rotate(${rotation}deg) scaleX(${mirror ? -1 : 1}) scale(${fitScale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.25s ease-out'
          }
        };
      }
    }

    // Normal (0deg) or Inverted (180deg)
    return {
      containerClass: 'aspect-video w-full',
      iframeStyle: {
        width: '100%',
        height: '100%',
        position: 'absolute' as const,
        top: '0',
        left: '0',
        transform: `${rotation === 180 ? 'rotate(180deg) ' : ''}${mirror ? 'scaleX(-1) ' : ''}${zoom !== 1 ? `scale(${zoom})` : ''}`.trim() || undefined,
        transformOrigin: 'center center',
        transition: 'transform 0.25s ease-out'
      }
    };
  }, [rotation, mirror, zoom, isRotatedQuarter, effectiveIsPortrait]);

  const handleReset = () => {
    setRotation(0);
    setMirror(false);
    setZoom(1);
    setViewportMode('auto');
  };

  const isTransformed = rotation !== 0 || mirror || zoom !== 1 || viewportMode !== 'auto';

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Video Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative flex items-center justify-center">
        {videoId ? (
          <div className={`relative overflow-hidden bg-black transition-all duration-300 ${containerClass}`}>
            <iframe
              key={`yt-rot-player-${videoId}-${startTime}`}
              ref={iframeRef}
              style={iframeStyle}
              className="border-0"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&rel=0&playsinline=1${startTime > 0 ? `&start=${startTime}` : ''}`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen={allowFullscreen}
            />

            {/* Active Transformation Watermark Badge */}
            {isTransformed && (
              <div className="absolute top-2 left-2 z-10 pointer-events-none flex items-center gap-1.5 px-2 py-1 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-lg text-[10px] font-mono text-emerald-300 shadow-md">
                <RotateCw className="w-3 h-3 text-emerald-400 animate-spin-slow" />
                <span>
                  {rotation}°{mirror ? ' • Espejo' : ''}{zoom !== 1 ? ` • ${Math.round(zoom * 100)}%` : ''}
                  {effectiveIsPortrait ? ' • 📱 9:16' : ' • 🖥️ 16:9'}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full aspect-video flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            <Film className="w-12 h-12 mb-2 text-slate-700" />
            <p className="text-xs font-semibold">Introduce un enlace de YouTube arriba para reproducir el partido.</p>
          </div>
        )}
      </div>

      {/* Video Rotation & Orientation Control Bar */}
      {videoId && (
        <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] uppercase tracking-wider">
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Orientación & Giro del Vídeo:</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowTools(prev => !prev)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-mono transition flex items-center gap-1 cursor-pointer"
                title="Mostrar u ocultar herramientas de giro"
              >
                <Sliders className="w-3 h-3" />
                <span>{showTools ? 'Ocultar ajustes' : 'Ajustes de giro'}</span>
              </button>

              {isTransformed && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-1 bg-rose-950/50 hover:bg-rose-900 text-rose-300 rounded-lg text-[10px] font-mono border border-rose-800/50 transition flex items-center gap-1 cursor-pointer"
                  title="Restablecer giro y zoom a valores por defecto"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Restablecer</span>
                </button>
              )}
            </div>
          </div>

          {showTools && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              {/* Quick Rotation Buttons */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setRotation(rotation - 90)}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Girar 90 grados a la izquierda (antihorario)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>-90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRotation(rotation + 90)}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Girar 90 grados a la derecha (horario)"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRotation(180)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer ${
                    rotation === 180
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                  }`}
                  title="Invertir 180 grados (boca abajo)"
                >
                  180°
                </button>

                <button
                  type="button"
                  onClick={() => setRotation(0)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer ${
                    rotation === 0
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                  }`}
                  title="Posición original 0°"
                >
                  0°
                </button>
              </div>

              {/* Viewport Frame Mode (Vertical vs Horizontal) */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewportMode('landscape')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    !effectiveIsPortrait
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                  }`}
                  title="Marco Horizontal 16:9"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">16:9</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewportMode('portrait')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    effectiveIsPortrait
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                  }`}
                  title="Marco Vertical 9:16 (Ideal para partidos grabados en vertical y subidos girados)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Vertical 9:16</span>
                </button>
              </div>

              {/* Mirror & Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMirror(!mirror)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    mirror
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                  }`}
                  title="Modo espejo / voltear horizontalmente"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Espejo</span>
                </button>

                <div className="h-4 w-px bg-slate-800 mx-0.5" />

                <button
                  type="button"
                  onClick={() => setZoom(zoom - 0.15)}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg transition cursor-pointer"
                  title="Reducir zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <span className="px-1.5 font-mono text-[11px] text-slate-300 font-bold min-w-[42px] text-center">
                  {Math.round(zoom * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() => setZoom(zoom + 0.15)}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg transition cursor-pointer"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
