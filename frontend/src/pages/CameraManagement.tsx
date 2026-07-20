import React, { useState, useEffect } from 'react';
import { cameraApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { useAuth } from '../context/AuthContext';
import { Plus, Pencil, Trash2, RefreshCw, Camera } from 'lucide-react';

const AI_MODELS = ['object', 'face', 'license_plate', 'crowd', 'weapon'];
const defaultForm = { name: '', url: '', location: '', zone: '', status: 'active', aiModels: ['object'] as string[], sensitivity: 0.75 };

export const CameraManagement: React.FC = () => {
  const { user } = useAuth();
  const [cameras, setCameras] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editCamera, setEditCamera] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const canEdit = user?.role === 'admin' || user?.role === 'operator';
  const canDelete = user?.role === 'admin';

  const load = async () => {
    setIsLoading(true);
    try { const res = await cameraApi.list(); setCameras(res.data); }
    catch (err) { console.error('Camera load error:', err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditCamera(null); setForm(defaultForm); setError(''); setShowDialog(true); };
  const openEdit = (cam: any) => {
    setEditCamera(cam);
    setForm({ name: cam.name, url: cam.url, location: cam.location, zone: cam.zone, status: cam.status, aiModels: cam.aiModels || ['object'], sensitivity: cam.sensitivity ?? 0.75 });
    setError(''); setShowDialog(true);
  };

  const toggleModel = (model: string) => {
    setForm(prev => ({ ...prev, aiModels: prev.aiModels.includes(model) ? prev.aiModels.filter(m => m !== model) : [...prev.aiModels, model] }));
  };

  const handleSave = async () => {
    if (!form.name || !form.url || !form.location || !form.zone) { setError('Name, Stream URL, Location, and Zone are required.'); return; }
    setIsSaving(true); setError('');
    try {
      if (editCamera) await cameraApi.update(editCamera.id, form);
      else await cameraApi.create(form);
      setShowDialog(false); await load();
    } catch (err: any) { setError(err.response?.data?.error || 'Save failed.'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await cameraApi.delete(deleteId); setDeleteId(null); await load(); }
    catch (err) { console.error('Delete error:', err); }
  };

  const stats = [
    { label: 'Total', value: cameras.length, color: '#A855F7', glow: 'rgba(168,85,247,0.3)' },
    { label: 'Active', value: cameras.filter(c => c.status === 'active').length, color: '#10B981', glow: 'rgba(16,185,129,0.3)' },
    { label: 'Inactive', value: cameras.filter(c => c.status === 'inactive').length, color: '#64748B', glow: 'transparent' },
    { label: 'Error', value: cameras.filter(c => c.status === 'error').length, color: '#EC4899', glow: 'rgba(236,72,153,0.3)' },
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Camera Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure CCTV streams and AI detection models</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          {canEdit && (
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Camera
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl glassmorphism border border-white/8 p-4 transition-all hover:-translate-y-0.5 hover:border-white/15 duration-300">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-3xl font-black" style={{ color: s.color, textShadow: `0 0 20px ${s.glow}` }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#3B82F6] flex items-center justify-center">
              <Camera className="h-3.5 w-3.5 text-white" />
            </div>
            <CardTitle className="text-sm">Camera Registry</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-[#C084FC]" /> Loading...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camera</TableHead>
                  <TableHead>Location / Zone</TableHead>
                  <TableHead>Stream URL</TableHead>
                  <TableHead>AI Models</TableHead>
                  <TableHead>Sensitivity</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {cameras.map(cam => (
                  <TableRow key={cam.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cam.status === 'active' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] animate-pulse' : cam.status === 'error' ? 'bg-rose-500' : 'bg-slate-600'}`} />
                        <span className="font-semibold text-slate-200 text-sm">{cam.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-slate-300 font-medium">{cam.location}</p>
                      <p className="text-[10px] text-muted-foreground">{cam.zone}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[140px] block">{cam.url}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(cam.aiModels || []).map((m: string) => (
                          <Badge key={m} variant="cyan" className="text-[9px] px-1.5">{m}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-white/5 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#A855F7] to-[#06B6D4]" style={{ width: `${(cam.sensitivity || 0.7) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{Math.round((cam.sensitivity || 0.7) * 100)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cam.status === 'active' ? 'success' : cam.status === 'error' ? 'danger' : 'secondary'}>{cam.status}</Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(cam)} className="h-7 w-7 hover:text-[#C084FC]">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(cam.id)} className="h-7 w-7 text-rose-400 hover:bg-rose-500/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {cameras.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Camera className="h-10 w-10 opacity-15 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No cameras registered. Click "Add Camera" to get started.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog isOpen={showDialog} onClose={() => setShowDialog(false)} title={editCamera ? 'Edit Camera' : 'Add New Camera'} className="max-w-xl">
        <div className="space-y-4 mt-4">
          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Camera Name *</label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Main Entrance" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Zone *</label>
              <Input value={form.zone} onChange={e => setForm(p => ({ ...p, zone: e.target.value }))} placeholder="Lobby, Server Room…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stream URL *</label>
            <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="rtsp://192.168.1.10/stream1" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Location *</label>
            <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Building A, Floor 2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</label>
              <Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="error">Error / Maintenance</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Sensitivity: {Math.round(form.sensitivity * 100)}%</label>
              <input type="range" min={0.1} max={1.0} step={0.05} value={form.sensitivity}
                onChange={e => setForm(p => ({ ...p, sensitivity: parseFloat(e.target.value) }))}
                className="w-full mt-2 accent-purple-500 cursor-pointer" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Detection Models</label>
            <div className="flex flex-wrap gap-2">
              {AI_MODELS.map(model => (
                <button key={model} type="button" onClick={() => toggleModel(model)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                    form.aiModels.includes(model)
                      ? 'bg-[#A855F7]/20 text-[#C084FC] border-[#A855F7]/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                      : 'bg-transparent text-muted-foreground border-white/10 hover:border-white/20 hover:text-slate-300'
                  }`}
                >{model}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={isSaving}>{editCamera ? 'Save Changes' : 'Add Camera'}</Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Deletion">
        <div className="flex items-center gap-3 my-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <Trash2 className="h-5 w-5 text-rose-400 flex-shrink-0" />
          <p className="text-sm text-slate-300">Permanently delete this camera? This action cannot be undone.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete Camera</Button>
        </div>
      </Dialog>
    </div>
  );
};
export default CameraManagement;
