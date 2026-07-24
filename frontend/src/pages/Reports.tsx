import React, { useState, useEffect } from 'react';
import { reportsApi, cameraApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { FileText, Download, FileSpreadsheet, Calendar, Filter, Info, CheckCircle2 } from 'lucide-react';

export const Reports: React.FC = () => {
  const [cameras, setCameras] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    cameraId: 'all',
    severity: 'all',
  });
  const [isGenerating, setIsGenerating] = useState<'pdf' | 'csv' | 'excel' | null>(null);
  const [lastGenerated, setLastGenerated] = useState<{ type: string; time: string } | null>(null);

  useEffect(() => {
    cameraApi.list().then(r => setCameras(r.data)).catch(console.error);
  }, []);

  const handleGenerate = async (type: 'pdf' | 'csv' | 'excel') => {
    setIsGenerating(type);
    try {
      let url = '';
      if (type === 'pdf') {
        url = reportsApi.getPdfUrl(filters);
      } else if (type === 'csv') {
        url = reportsApi.getCsvUrl(filters);
      } else {
        url = reportsApi.getExcelUrl(filters);
      }
      const link = document.createElement('a');
      link.href = url;
      link.download = `visionops_report_${type}_${Date.now()}.${type === 'excel' ? 'xls' : type}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setLastGenerated({ type: type.toUpperCase(), time: new Date().toLocaleTimeString() });
    } catch (err) {
      console.error(`${type.toUpperCase()} generation error:`, err);
    } finally {
      setTimeout(() => setIsGenerating(null), 1500);
    }
  };

  const presets = [
    { label: 'Today', days: 0 },
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 },
  ];

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    if (days > 0) start.setDate(start.getDate() - days);
    setFilters(prev => ({ ...prev, startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] }));
  };

  const pdfFeatures = ['Branded header with logo', 'Summary statistics cards', 'Full alert incident table', 'Severity color-coding', 'Paginated output'];
  const csvFeatures = ['Alert ID and timestamps', 'Camera & zone data', 'Severity and status', 'Detected object labels', 'Resolution notes'];
  const excelFeatures = ['Compatible with MS Excel & Sheets', 'Formatted colors & columns', 'Gridlines enabled', 'Automatic column widths', 'Full event attributes list'];

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Reports Center</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Generate professional PDF, CSV, and Excel incident reports with date-range filtering</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Filter Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#A855F7] to-[#7C3AED] flex items-center justify-center">
                  <Filter className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">Report Filters</CardTitle>
                  <CardDescription>Configure the scope and parameters of your report</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Date Presets */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Quick Date Presets</label>
                <div className="flex flex-wrap gap-2">
                  {presets.map(p => (
                    <button key={p.label} onClick={() => applyPreset(p.days)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-white/10 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200 hover:border-[#A855F7]/40 hover:bg-[#A855F7]/5 transition-all duration-200">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Start Date', key: 'startDate' as const },
                  { label: 'End Date', key: 'endDate' as const },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {label}
                    </label>
                    <Input type="date" value={filters[key]} onChange={e => setFilters(p => ({ ...p, [key]: e.target.value }))} className="font-mono text-sm" />
                  </div>
                ))}
              </div>

              {/* Camera & Severity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Camera Filter</label>
                  <Select value={filters.cameraId} onChange={e => setFilters(p => ({ ...p, cameraId: e.target.value }))}>
                    <option value="all">All Cameras</option>
                    {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Severity Filter</label>
                  <Select value={filters.severity} onChange={e => setFilters(p => ({ ...p, severity: e.target.value }))}>
                    <option value="all">All Severities</option>
                    <option value="critical">Critical Only</option>
                    <option value="high">High Only</option>
                    <option value="medium">Medium Only</option>
                    <option value="low">Low Only</option>
                  </Select>
                </div>
              </div>

              {/* Scope Preview */}
              <div className="p-3 rounded-xl glassmorphism border border-slate-200 dark:border-white/5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Report Scope Preview</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="purple" className="text-[10px]">📅 {filters.startDate} → {filters.endDate}</Badge>
                  <Badge variant="secondary" className="text-[10px]">📷 {filters.cameraId === 'all' ? 'All Cameras' : cameras.find(c => c.id === filters.cameraId)?.name || filters.cameraId}</Badge>
                  <Badge variant="secondary" className="text-[10px]">⚠️ {filters.severity === 'all' ? 'All Severities' : filters.severity}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Panel */}
        <div className="space-y-4">
          {/* PDF */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">PDF Report</CardTitle>
                  <CardDescription>Professional styled document</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1.5">
                {pdfFeatures.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full gap-2" onClick={() => handleGenerate('pdf')} isLoading={isGenerating === 'pdf'}>
                <Download className="h-4 w-4" /> {isGenerating === 'pdf' ? 'Generating...' : 'Download PDF'}
              </Button>
            </CardContent>
          </Card>

          {/* Excel */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <FileSpreadsheet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">Excel Spreadsheet</CardTitle>
                  <CardDescription>Styled .xls format for Excel/Sheets</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1.5">
                {excelFeatures.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full gap-2 border-blue-500/30 text-[#3B82F6] hover:bg-blue-500/10" onClick={() => handleGenerate('excel')} isLoading={isGenerating === 'excel'}>
                <Download className="h-4 w-4" /> {isGenerating === 'excel' ? 'Exporting...' : 'Export Excel'}
              </Button>
            </CardContent>
          </Card>

          {/* CSV */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <FileSpreadsheet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">CSV Export</CardTitle>
                  <CardDescription>Raw data for custom workflows</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1.5">
                {csvFeatures.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full gap-2" onClick={() => handleGenerate('csv')} isLoading={isGenerating === 'csv'}>
                <Download className="h-4 w-4" /> {isGenerating === 'csv' ? 'Exporting...' : 'Export CSV'}
              </Button>
            </CardContent>
          </Card>

          {lastGenerated && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {lastGenerated.type} report downloaded at {lastGenerated.time}
            </div>
          )}

          <div className="flex items-start gap-2 p-3 glassmorphism border border-slate-200 dark:border-white/5 rounded-xl text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[#C084FC]" />
            Reports require the backend running on port 5000. All data is filtered server-side.
          </div>
        </div>
      </div>
    </div>
  );
};
export default Reports;
