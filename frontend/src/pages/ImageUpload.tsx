import React, { useState, useRef, useCallback } from 'react';
import { uploadApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { UploadCloud, X, ImageIcon, Zap, CheckCircle2, AlertCircle, Info, Cpu, Download } from 'lucide-react';

interface Detection { box: [number, number, number, number]; confidence: number; className: string; }
interface DetectionResult { success: boolean; detections: Detection[]; image: string; fallbackMode: boolean; message: string; }

const LABEL_COLORS = ['#A855F7', '#06B6D4', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const ImageUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processFile = (f: File) => {
    if (!f.type.startsWith('image/')) { setError('Please upload a valid image file.'); return; }
    if (f.size > 15 * 1024 * 1024) { setError('File size must be under 15MB'); return; }
    setError(''); setResult(null); setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) processFile(f);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) processFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsProcessing(true); setError(''); setResult(null);
    try {
      const response = await uploadApi.uploadFile(file);
      const data: DetectionResult = response.data;
      setResult(data);
      if (canvasRef.current && data.image) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width; canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          data.detections.forEach((det, idx) => {
            const color = LABEL_COLORS[idx % LABEL_COLORS.length];
            const [x1, y1, x2, y2] = det.box;
            const w = x2 - x1; const h = y2 - y1;
            ctx.shadowColor = color; ctx.shadowBlur = 12;
            ctx.strokeStyle = color; ctx.lineWidth = 2.5;
            ctx.strokeRect(x1, y1, w, h);
            ctx.shadowBlur = 0;
            const label = `${det.className} ${Math.round(det.confidence * 100)}%`;
            ctx.font = 'bold 12px monospace';
            const tw = ctx.measureText(label).width;
            ctx.fillStyle = color + 'CC'; ctx.fillRect(x1, y1 - 22, tw + 12, 22);
            ctx.fillStyle = '#fff'; ctx.fillText(label, x1 + 6, y1 - 6);
          });
        };
        img.src = data.image;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Analysis failed. Ensure the backend is running.');
    } finally { setIsProcessing(false); }
  };

  const handleClear = () => {
    setFile(null); setPreview(null); setResult(null); setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadAnnotated = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `annotated_${file ? file.name.substring(0, file.name.lastIndexOf('.')) : 'image'}_${Date.now()}.jpg`;
    link.href = canvasRef.current.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">AI Image Analyzer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Upload images for real-time YOLOv11 object detection and bounding box annotation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Upload Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#A855F7] to-[#EC4899] flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                  <UploadCloud className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">Upload Image</CardTitle>
                  <CardDescription>JPG, PNG, WebP · Max 15MB</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 overflow-hidden ${
                  isDragging ? 'border-[#A855F7] bg-[#A855F7]/10 shadow-[0_0_20px_rgba(168,85,247,0.2)] scale-[1.01]'
                  : 'border-slate-300 dark:border-white/10 hover:border-[#A855F7]/40 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                }`}
              >
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                {/* Grid decoration */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
                  style={{ backgroundImage: 'linear-gradient(rgba(168,85,247,1) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,1) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                {preview ? (
                  <div className="relative z-10">
                    <img src={preview} alt="Preview" className="max-h-44 mx-auto rounded-xl object-contain border border-slate-300 dark:border-white/10" />
                    <p className="mt-2 text-xs text-muted-foreground truncate">{file?.name}</p>
                  </div>
                ) : (
                  <div className="relative z-10 flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#A855F7]/20 to-[#EC4899]/10 border border-[#A855F7]/20 flex items-center justify-center">
                      <UploadCloud className="h-7 w-7 text-[#C084FC]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-300">Drop image here or click to browse</p>
                      <p className="text-xs mt-1">JPG, PNG, WebP • Max 15MB</p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                {file && (
                  <Button variant="secondary" size="sm" onClick={handleClear} className="gap-1.5">
                    <X className="h-3.5 w-3.5" /> Clear
                  </Button>
                )}
                <Button className="flex-1 gap-2" onClick={handleAnalyze} disabled={!file || isProcessing} isLoading={isProcessing}>
                  <Zap className="h-4 w-4" />
                  {isProcessing ? 'Analyzing...' : 'Run AI Analysis'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Detections List */}
          {result && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Detections</CardTitle>
                  <Badge variant={result.fallbackMode ? 'warning' : 'success'} className="text-[9px] gap-1">
                    {result.fallbackMode ? <Info className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                    {result.fallbackMode ? 'Fallback' : 'YOLOv11'}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{result.message}</p>
              </CardHeader>
              <CardContent>
                {result.detections.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No objects detected.</p>
                ) : (
                  <div className="space-y-2">
                    {result.detections.map((det, idx) => {
                      const color = LABEL_COLORS[idx % LABEL_COLORS.length];
                      return (
                        <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                          <div className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }} />
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex-1 capitalize">{det.className}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${det.confidence * 100}%`, backgroundColor: color }} />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground w-10 text-right">{Math.round(det.confidence * 100)}%</span>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-muted-foreground pt-2 text-center">{result.detections.length} object{result.detections.length !== 1 ? 's' : ''} detected</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Canvas Output */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                    <Cpu className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Annotated Output</CardTitle>
                    <CardDescription>Neon bounding boxes drawn by AI engine</CardDescription>
                  </div>
                </div>
                {result && (
                  <Button variant="outline" size="sm" onClick={handleDownloadAnnotated} className="gap-1.5 border-emerald-500/20 text-[#10B981] hover:bg-emerald-500/10">
                    <Download className="h-3.5 w-3.5" /> Download Image
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[400px] rounded-b-2xl bg-slate-100 dark:bg-black/20 border-t border-slate-200 dark:border-white/5">
              {result ? (
                <canvas ref={canvasRef} className="max-w-full max-h-[500px] rounded-xl border border-slate-300 dark:border-white/10 object-contain" />
              ) : preview ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={preview} alt="Preview" className="max-h-80 max-w-full rounded-xl border border-slate-300 dark:border-white/10" />
                  <p className="text-xs text-muted-foreground">Click "Run AI Analysis" to annotate</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5 text-muted-foreground">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#A855F7]/10 to-[#06B6D4]/10 border border-slate-200 dark:border-white/8 flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-400">No Image Loaded</p>
                    <p className="text-xs mt-1">Upload an image to start AI detection</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ label: 'Person Detection', color: '#A855F7' }, { label: 'Vehicle Tracking', color: '#06B6D4' }, { label: 'Object Recognition', color: '#EC4899' }].map(cap => (
                      <div key={cap.label} className="text-center p-3 rounded-xl glassmorphism border border-slate-200 dark:border-white/5">
                        <div className="h-6 w-6 rounded-lg mx-auto mb-1.5 flex items-center justify-center" style={{ backgroundColor: `${cap.color}20`, border: `1px solid ${cap.color}30` }}>
                          <Zap className="h-3 w-3" style={{ color: cap.color }} />
                        </div>
                        <p className="text-[10px] text-slate-400">{cap.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default ImageUpload;
