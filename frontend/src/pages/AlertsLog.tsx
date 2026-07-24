import React, { useState, useEffect } from 'react';
import { alertApi, cameraApi } from '../api';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import {
  AlertTriangle, RefreshCw, CheckCircle2, Clock, Search,
  ChevronDown, ChevronUp, Shield, Filter, Download, FileText
} from 'lucide-react';

const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

function getSeverityBadge(sev: string): any {
  return { critical: 'danger', high: 'warning', medium: 'warning', low: 'info', info: 'secondary' }[sev] || 'secondary';
}
function getStatusBadge(status: string): any {
  return { open: 'danger', investigating: 'info', resolved: 'success' }[status] || 'secondary';
}

export const AlertsLog: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCamera, setFilterCamera] = useState('all');
  const [sortField, setSortField] = useState<'timestamp' | 'severity'>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [alertRes, camRes] = await Promise.all([alertApi.list(), cameraApi.list()]);
      setAlerts(alertRes.data);
      setCameras(camRes.data);
    } catch (err) {
      console.error('Alert load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    const newHandler = (e: any) => { setAlerts(prev => [e.detail, ...prev]); };
    const updateHandler = (e: any) => {
      setAlerts(prev => prev.map(a => a.id === e.detail.id ? { ...a, ...e.detail } : a));
    };
    window.addEventListener('alert-triggered', newHandler);
    window.addEventListener('alert-status-updated', updateHandler);
    return () => {
      window.removeEventListener('alert-triggered', newHandler);
      window.removeEventListener('alert-status-updated', updateHandler);
    };
  }, []);

  const handleSaveStatus = async () => {
    if (!selectedAlert || !updateStatus) return;
    setIsSaving(true);
    try {
      await alertApi.updateStatus(selectedAlert.id, { status: updateStatus, notes });
      setAlerts(prev => prev.map(a => a.id === selectedAlert.id ? { ...a, status: updateStatus, notes } : a));
      setSelectedAlert(null);
    } catch (err) {
      console.error('Status update error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSort = (field: 'timestamp' | 'severity') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  /** Download filtered alerts as a CSV log file */
  const handleExportLog = () => {
    const headers = ['Alert ID', 'Timestamp', 'Camera', 'Type', 'Severity', 'Status', 'Detected Objects', 'Notes'];
    const rows = filtered.map(a => [
      a.id,
      new Date(a.timestamp).toLocaleString(),
      a.cameraName,
      a.type,
      a.severity.toUpperCase(),
      a.status.toUpperCase(),
      (a.objects || []).join('; '),
      (a.notes || '').replace(/"/g, '""'),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `visionops_alert_log_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  /** Download filtered alerts as a structured AI Incident Report (JSON) */
  const handleExportIncidentReport = () => {
    const report = {
      reportTitle: 'VisionOps AI – Incident Report',
      generatedAt: new Date().toISOString(),
      generatedBy: 'VisionOps AI Platform',
      filters: { severity: filterSeverity, status: filterStatus, camera: filterCamera, search: searchQuery },
      summary: {
        total: filtered.length,
        critical: filtered.filter(a => a.severity === 'critical').length,
        high: filtered.filter(a => a.severity === 'high').length,
        medium: filtered.filter(a => a.severity === 'medium').length,
        low: filtered.filter(a => a.severity === 'low').length,
        open: filtered.filter(a => a.status === 'open').length,
        investigating: filtered.filter(a => a.status === 'investigating').length,
        resolved: filtered.filter(a => a.status === 'resolved').length,
      },
      incidents: filtered.map(a => ({
        id: a.id,
        timestamp: a.timestamp,
        camera: { id: a.cameraId, name: a.cameraName },
        type: a.type,
        severity: a.severity,
        status: a.status,
        detectedObjects: a.objects || [],
        snapshotUrl: a.snapshotUrl || null,
        notes: a.notes || null,
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `visionops_incident_report_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const filtered = alerts
    .filter(a => filterSeverity === 'all' || a.severity === filterSeverity)
    .filter(a => filterStatus === 'all' || a.status === filterStatus)
    .filter(a => filterCamera === 'all' || a.cameraId === filterCamera)
    .filter(a => !searchQuery || a.type?.toLowerCase().includes(searchQuery.toLowerCase()) || a.cameraName?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortField === 'timestamp') {
        const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        return sortDir === 'desc' ? diff : -diff;
      } else {
        const diff = severityOrder[a.severity] - severityOrder[b.severity];
        return sortDir === 'desc' ? diff : -diff;
      }
    });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 inline ml-1 opacity-30" />;
    return sortDir === 'desc' ? <ChevronDown className="h-3 w-3 inline ml-1 text-[#C084FC]" /> : <ChevronUp className="h-3 w-3 inline ml-1 text-[#C084FC]" />;
  };

  const summaryCards = [
    { label: 'Total', value: alerts.length, variant: 'secondary' as const, color: '#A855F7' },
    { label: 'Open', value: alerts.filter(a => a.status === 'open').length, variant: 'danger' as const, color: '#EC4899' },
    { label: 'Investigating', value: alerts.filter(a => a.status === 'investigating').length, variant: 'info' as const, color: '#3B82F6' },
    { label: 'Resolved', value: alerts.filter(a => a.status === 'resolved').length, variant: 'success' as const, color: '#10B981' },
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Alerts Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All AI-detected security events with real-time updates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportLog} className="gap-1.5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">
            <Download className="h-3.5 w-3.5" /> Export Log
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportIncidentReport} className="gap-1.5 border-[#A855F7]/20 text-[#C084FC] hover:bg-[#A855F7]/10">
            <FileText className="h-3.5 w-3.5" /> AI Report
          </Button>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map(s => (
          <div key={s.label} className="rounded-2xl glassmorphism border border-slate-200 dark:border-white/10 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-white/15">
            <Badge variant={s.variant} className="mb-2 text-[9px]">{s.label}</Badge>
            <p className="text-3xl font-black text-slate-900 dark:text-white" style={{ textShadow: `0 0 20px ${s.color}40` }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Filters</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by type or camera..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="w-36">
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-36">
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </Select>
            <Select value={filterCamera} onChange={e => setFilterCamera(e.target.value)} className="w-44">
              <option value="all">All Cameras</option>
              {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-[#C084FC]" /> Loading alerts...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button onClick={() => toggleSort('severity')} className="flex items-center hover:text-slate-700 dark:hover:text-slate-200 transition-colors font-bold">
                      Severity <SortIcon field="severity" />
                    </button>
                  </TableHead>
                  <TableHead>Incident Type</TableHead>
                  <TableHead>Camera</TableHead>
                  <TableHead>Objects Detected</TableHead>
                  <TableHead>
                    <button onClick={() => toggleSort('timestamp')} className="flex items-center hover:text-slate-700 dark:hover:text-slate-200 transition-colors font-bold">
                      Time <SortIcon field="timestamp" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(alert => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Badge variant={getSeverityBadge(alert.severity)}>{alert.severity}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{alert.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{alert.cameraName}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(alert.objects || []).slice(0, 3).map((obj: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[9px] px-1">{obj}</Badge>
                        ))}
                        {alert.objects?.length > 3 && (
                          <Badge variant="secondary" className="text-[9px] px-1">+{alert.objects.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="font-mono">{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(alert.status)}>{alert.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-[#C084FC] hover:text-[#A855F7]"
                        onClick={() => { setSelectedAlert(alert); setUpdateStatus(alert.status); setNotes(alert.notes || ''); }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <Shield className="h-10 w-10 opacity-15 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No alerts match your current filters</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Alert Review Dialog */}
      <Dialog isOpen={!!selectedAlert} onClose={() => setSelectedAlert(null)} title="Alert Review" className="max-w-xl">
        {selectedAlert && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Type', value: selectedAlert.type },
                { label: 'Camera', value: selectedAlert.cameraName },
              ].map(f => (
                <div key={f.label} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px] mb-1">{f.label}</p>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold">{f.value}</p>
                </div>
              ))}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px] mb-1">Severity</p>
                <Badge variant={getSeverityBadge(selectedAlert.severity)} className="text-[10px]">{selectedAlert.severity}</Badge>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[9px] mb-1">Time</p>
                <p className="text-slate-800 dark:text-slate-200 font-mono text-[10px]">{new Date(selectedAlert.timestamp).toLocaleString()}</p>
              </div>
            </div>

            {(selectedAlert.objects || []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Detected Objects</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAlert.objects.map((obj: string, i: number) => (
                    <Badge key={i} variant="cyan" className="text-xs">{obj}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedAlert.snapshotUrl && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Snapshot</p>
                  <a
                    href={selectedAlert.snapshotUrl}
                    download={`incident_snapshot_${selectedAlert.id}.jpg`}
                    className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <Download className="h-3 w-3" /> Download
                  </a>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-300 dark:border-white/10">
                  <img src={selectedAlert.snapshotUrl} alt="Incident snapshot" className="w-full max-h-48 object-cover" />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Update Status</label>
              <Select value={updateStatus} onChange={e => setUpdateStatus(e.target.value)}>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Resolution Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add investigation notes or resolution details…"
                rows={3}
                className="w-full rounded-xl border border-border/40 bg-slate-100 dark:bg-white/5 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 resize-none transition-all"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSelectedAlert(null)}>Cancel</Button>
              <Button onClick={handleSaveStatus} isLoading={isSaving} className="gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Save Update
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
export default AlertsLog;
