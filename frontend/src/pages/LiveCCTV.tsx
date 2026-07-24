import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cameraApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Maximize2, Camera, WifiOff, RefreshCw,
  ZoomIn, ZoomOut, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  RotateCcw, Download, Grid, LayoutGrid, Radio, Cpu, Video, Square, AlertTriangle
} from 'lucide-react';

// Stream goes through the Node.js backend proxy to avoid CORS blocks
const STREAM_PROXY_BASE = 'http://localhost:5000/api/stream';

interface CameraItem {
  id: string;
  name: string;
  url: string;
  location: string;
  zone: string;
  status: string;
  aiModels: string[];
}

// ────────────────────────────────────────────────────────────────────
// CameraFeed — individual feed tile
// ────────────────────────────────────────────────────────────────────
const CameraFeed: React.FC<{
  camera: CameraItem;
  isFullscreen: boolean;
  aiOnline: boolean;
}> = ({ camera, isFullscreen, aiOnline }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamOk, setStreamOk] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const streamUrl = `${STREAM_PROXY_BASE}/${camera.id}?_k=${retryKey}`;

  // Auto-retry when stream errors
  const handleError = useCallback(() => {
    setStreamOk(false);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      setRetryKey(k => k + 1);
    }, 5000);
  }, []);

  const handleLoad = useCallback(() => {
    setStreamOk(true);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, []);

  useEffect(() => () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, []);

  /** Save a JPEG snapshot with timestamp watermark */
  const handleSnapshot = () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = img.clientWidth || 640;
    canvas.height = img.clientHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); } catch { /* tainted */ }
    const ts = new Date().toLocaleString();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
    ctx.fillStyle = '#22D3EE';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${camera.name}  •  ${ts}`, 10, canvas.height - 9);
    const link = document.createElement('a');
    link.download = `snapshot_${camera.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.93);
    link.click();
  };

  /** Start recording via MediaRecorder + captureStream */
  const startRecording = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.clientWidth || 640;
    canvas.height = img.clientHeight || 480;
    const ctx = canvas.getContext('2d')!;
    const draw = () => {
      try { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); } catch { /* tainted */ }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    const stream = canvas.captureStream(15);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      cancelAnimationFrame(rafRef.current);
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `clip_${camera.name.replace(/\s+/g, '_')}_${Date.now()}.webm`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    };
    recorder.start(200);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const isOnline = aiOnline && streamOk;

  return (
    <div className={`relative overflow-hidden bg-black rounded-2xl border border-slate-200 dark:border-white/10 group transition-all duration-300 ${isFullscreen ? 'h-full' : 'aspect-video'}`}>
      {/* Hidden canvas for recording */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Scanlines */}
      <div className="absolute inset-0 scanlines pointer-events-none z-10 opacity-20" />

      {/* Stream img — always mounted so it keeps trying */}
      <img
        ref={imgRef}
        src={aiOnline ? streamUrl : ''}
        alt={camera.name}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isOnline ? 'opacity-100' : 'opacity-0'}`}
        onError={handleError}
        onLoad={handleLoad}
      />

      {/* Offline overlay */}
      {!isOnline && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-muted-foreground gap-3 z-10">
          {!aiOnline ? (
            <>
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              </div>
              <div className="text-center px-4">
                <p className="text-xs font-bold text-amber-400 mb-1">AI Service Offline</p>
                <p className="text-[10px] text-slate-500 font-mono">Run: <span className="text-slate-800 dark:text-slate-300">python main.py</span> in /ai-service</p>
              </div>
            </>
          ) : (
            <>
              <WifiOff className="h-8 w-8 opacity-30" />
              <p className="text-xs font-mono">Connecting to stream…</p>
              <div className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="h-1.5 w-1.5 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* HUD overlays */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#06B6D4]/60 rounded-tl" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#06B6D4]/60 rounded-tr" />
        <div className="absolute bottom-8 left-2 w-4 h-4 border-b-2 border-l-2 border-[#06B6D4]/60 rounded-bl" />
        <div className="absolute bottom-8 right-2 w-4 h-4 border-b-2 border-r-2 border-[#06B6D4]/60 rounded-br" />

        {/* Camera label */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <div className="glassmorphism rounded-lg px-2 py-1 flex items-center gap-1.5 border border-white/10">
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[10px] text-slate-800 dark:text-slate-200 font-mono font-medium truncate max-w-[130px]">{camera.name}</span>
          </div>
          <div className="glassmorphism rounded-lg px-2 py-0.5 border border-white/5">
            <span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono">{camera.zone} · {camera.location}</span>
          </div>
        </div>

        {/* AI model tags */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          {camera.aiModels?.slice(0, 2).map(model => (
            <span key={model} className="glassmorphism rounded-lg px-1.5 py-0.5 text-[9px] text-[#22D3EE] font-mono uppercase border border-[#06B6D4]/20">
              {model}
            </span>
          ))}
        </div>

        {/* REC indicator */}
        {isOnline && (
          <div className={`absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 glassmorphism rounded-lg px-2 py-0.5 border ${isRecording ? 'border-rose-500/60' : 'border-rose-500/20'}`}>
            <span className={`h-1.5 w-1.5 rounded-full bg-rose-500 ${isRecording ? 'animate-pulse shadow-[0_0_8px_rgba(244,63,94,1)]' : ''}`} />
            <span className="text-[9px] font-bold text-rose-400 font-mono">{isRecording ? 'RECORDING' : 'REC'}</span>
          </div>
        )}

        {/* Action bar on hover */}
        <div className="absolute bottom-0 left-0 right-0 glassmorphism px-3 py-1.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <Radio className={`h-3 w-3 ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span className="text-[10px] text-slate-700 dark:text-slate-300 font-mono font-bold">{isOnline ? 'LIVE' : 'OFFLINE'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleSnapshot} disabled={!isOnline}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-emerald-400 disabled:opacity-30"
              title="Save Snapshot">
              <Download className="h-3 w-3" />
            </button>
            {isOnline && (
              isRecording ? (
                <button onClick={stopRecording}
                  className="p-1.5 hover:bg-rose-500/20 rounded-lg transition-colors text-rose-400 hover:text-rose-300"
                  title="Stop Recording">
                  <Square className="h-3 w-3 fill-current" />
                </button>
              ) : (
                <button onClick={startRecording}
                  className="p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors text-slate-400 hover:text-rose-400"
                  title="Record Video Clip">
                  <Video className="h-3 w-3" />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────
// Main LiveCCTV page
// ────────────────────────────────────────────────────────────────────
export const LiveCCTV: React.FC = () => {
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<CameraItem | null>(null);
  const [gridLayout, setGridLayout] = useState<'2x2' | '3x3' | '1x1'>('2x2');
  const [zoom, setZoom] = useState(100);
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);

  const checkAiStatus = useCallback(async () => {
    try {
      const r = await fetch('http://localhost:5000/api/ai-status');
      const d = await r.json();
      setAiOnline(d.online === true);
    } catch {
      setAiOnline(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await cameraApi.list();
        const activeCams = res.data.filter((c: CameraItem) => c.status === 'active');
        setCameras(activeCams);
        if (activeCams.length > 0) setSelectedCamera(activeCams[0]);
      } catch (err) {
        console.error('Failed to load cameras:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
    checkAiStatus();
    // Poll AI status every 8 seconds
    const interval = setInterval(checkAiStatus, 8000);
    return () => clearInterval(interval);
  }, [checkAiStatus]);

  const gridClass = {
    '1x1': 'grid-cols-1',
    '2x2': 'grid-cols-1 md:grid-cols-2',
    '3x3': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[gridLayout];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#06B6D4] to-[#3B82F6] flex items-center justify-center animate-pulse">
          <Camera className="h-5 w-5 text-white" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading camera feeds…
        </div>
      </div>
    );
  }

  const PTZButton: React.FC<{ children: React.ReactNode; title?: string; active?: boolean }> = ({ children, title, active }) => (
    <button title={title}
      className={`p-2.5 rounded-xl border transition-all duration-200 active:scale-90 ${
        active
          ? 'bg-gradient-to-br from-[#A855F7] to-[#EC4899] border-[#A855F7]/30 shadow-[0_0_12px_rgba(168,85,247,0.3)] text-white'
          : 'glassmorphism border-slate-200 dark:border-white/10 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-white/15'
      }`}>
      {children}
    </button>
  );

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Live CCTV Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {cameras.length} active camera{cameras.length !== 1 ? 's' : ''} · Hover feed for snapshot &amp; recording controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Grid Layout Toggle */}
          <div className="flex items-center gap-1 glassmorphism border border-slate-200 dark:border-white/10 rounded-xl p-1">
            {[
              { key: '1x1' as const, icon: <Maximize2 className="h-3.5 w-3.5" />, label: 'Single' },
              { key: '2x2' as const, icon: <LayoutGrid className="h-3.5 w-3.5" />, label: '2×2' },
              { key: '3x3' as const, icon: <Grid className="h-3.5 w-3.5" />, label: '3×3' },
            ].map(opt => (
              <button key={opt.key} onClick={() => setGridLayout(opt.key)} title={opt.label}
                className={`p-2 rounded-lg transition-all duration-200 text-xs ${
                  gridLayout === opt.key
                    ? 'bg-gradient-to-r from-[#A855F7] to-[#EC4899] text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                    : 'text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200'
                }`}>
                {opt.icon}
              </button>
            ))}
          </div>

          {/* AI Status badge */}
          {aiOnline === null ? (
            <Badge variant="secondary" className="gap-1.5">
              <Radio className="h-3 w-3 animate-pulse" /> Checking AI…
            </Badge>
          ) : aiOnline ? (
            <Badge variant="success" className="gap-1.5">
              <Radio className="h-3 w-3 animate-pulse" /> AI Engine Live
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1.5 cursor-pointer" onClick={checkAiStatus}>
              <AlertTriangle className="h-3 w-3" /> AI Offline — click to retry
            </Badge>
          )}
        </div>
      </div>

      {/* AI Offline banner */}
      {aiOnline === false && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-300">AI Service is not running</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Start the AI service to enable live feeds. Open a terminal and run:
              <code className="ml-2 px-2 py-0.5 rounded bg-slate-200 dark:bg-black/30 font-mono text-slate-800 dark:text-slate-200 text-[11px]">
                cd ai-service &amp;&amp; python main.py
              </code>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Camera Grid */}
        <div className="lg:col-span-3">
          <div className={`grid ${gridClass} gap-3`}>
            {cameras.map(cam => (
              <div key={cam.id}
                onClick={() => setSelectedCamera(cam)}
                className={`cursor-pointer transition-all duration-300 rounded-2xl ${
                  selectedCamera?.id === cam.id
                    ? 'ring-2 ring-[#A855F7] ring-offset-2 ring-offset-[hsl(var(--background))] shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                    : 'opacity-85 hover:opacity-100'
                }`}>
                <CameraFeed camera={cam} isFullscreen={gridLayout === '1x1'} aiOnline={aiOnline === true} />
              </div>
            ))}
            {cameras.length === 0 && (
              <div className="col-span-full flex items-center justify-center h-64 rounded-2xl glassmorphism border border-dashed border-slate-300 dark:border-white/15">
                <div className="text-center">
                  <Camera className="h-12 w-12 opacity-20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-semibold">No active cameras found</p>
                  <p className="text-xs text-slate-600 mt-1">Configure cameras in Camera Management</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-3">
          {/* Selected Camera Info */}
          {selectedCamera && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#3B82F6] flex items-center justify-center">
                    <Camera className="h-3.5 w-3.5 text-white" />
                  </div>
                  <CardTitle className="text-sm">Selected Feed</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedCamera.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedCamera.location}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedCamera.aiModels?.map(m => (
                    <Badge key={m} variant="cyan" className="text-[9px]">{m}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-white/5">
                  <span className={`h-2 w-2 rounded-full ${selectedCamera.status === 'active' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] animate-pulse' : 'bg-slate-600'}`} />
                  <span className="text-xs text-muted-foreground capitalize font-semibold">{selectedCamera.status}</span>
                </div>
                <div className="text-[9px] text-muted-foreground pt-1 border-t border-slate-200 dark:border-white/5">
                  Hover feed → <span className="text-emerald-400">📷 Snapshot</span> &amp; <span className="text-rose-400">🎥 Record</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PTZ Controls */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#A855F7] to-[#7C3AED] flex items-center justify-center">
                  <Cpu className="h-3.5 w-3.5 text-white" />
                </div>
                <CardTitle className="text-sm">PTZ Controls</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-1.5 w-fit mx-auto">
                <div /><PTZButton title="Tilt Up"><ChevronUp className="h-4 w-4 mx-auto" /></PTZButton><div />
                <PTZButton title="Pan Left"><ChevronLeft className="h-4 w-4 mx-auto" /></PTZButton>
                <PTZButton title="Reset" active><RotateCcw className="h-4 w-4 mx-auto" /></PTZButton>
                <PTZButton title="Pan Right"><ChevronRight className="h-4 w-4 mx-auto" /></PTZButton>
                <div /><PTZButton title="Tilt Down"><ChevronDown className="h-4 w-4 mx-auto" /></PTZButton><div />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Zoom</p>
                  <span className="text-xs font-mono text-[#C084FC]">{zoom}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setZoom(z => Math.max(50, z - 10))}
                    className="p-1.5 glassmorphism border border-slate-200 dark:border-white/10 rounded-lg transition-colors hover:border-slate-300 dark:hover:border-white/15">
                    <ZoomOut className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                  </button>
                  <div className="flex-1 bg-slate-200 dark:bg-white/5 rounded-full h-2 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#A855F7] to-[#EC4899] transition-all shadow-[0_0_6px_rgba(168,85,247,0.5)]"
                      style={{ width: `${((zoom - 50) / 150) * 100}%` }} />
                  </div>
                  <button onClick={() => setZoom(z => Math.min(200, z + 10))}
                    className="p-1.5 glassmorphism border border-slate-200 dark:border-white/10 rounded-lg transition-colors hover:border-slate-300 dark:hover:border-white/15">
                    <ZoomIn className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Camera Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Switch Camera</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {cameras.map(cam => (
                <button key={cam.id} onClick={() => setSelectedCamera(cam)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all duration-200 ${
                    selectedCamera?.id === cam.id
                      ? 'bg-gradient-to-r from-[#A855F7]/15 to-[#EC4899]/10 border border-[#A855F7]/25 text-slate-900 dark:text-white font-semibold'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="truncate">{cam.name}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ml-2 flex-shrink-0 ${cam.status === 'active' ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]' : 'bg-slate-600'}`} />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default LiveCCTV;
