import React, { useState, useEffect } from 'react';
import { alertApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { TrendingUp, Activity, BarChart3, Zap, Download } from 'lucide-react';

const hourlyBase = [
  { hour: '00:00', detections: 12, persons: 4, vehicles: 2, anomalies: 1 },
  { hour: '02:00', detections: 7, persons: 2, vehicles: 1, anomalies: 0 },
  { hour: '04:00', detections: 9, persons: 3, vehicles: 2, anomalies: 1 },
  { hour: '06:00', detections: 25, persons: 12, vehicles: 8, anomalies: 2 },
  { hour: '08:00', detections: 68, persons: 35, vehicles: 22, anomalies: 5 },
  { hour: '10:00', detections: 94, persons: 48, vehicles: 30, anomalies: 8 },
  { hour: '12:00', detections: 78, persons: 40, vehicles: 25, anomalies: 5 },
  { hour: '14:00', detections: 102, persons: 55, vehicles: 32, anomalies: 9 },
  { hour: '16:00', detections: 88, persons: 45, vehicles: 28, anomalies: 7 },
  { hour: '18:00', detections: 55, persons: 28, vehicles: 18, anomalies: 4 },
  { hour: '20:00', detections: 30, persons: 15, vehicles: 8, anomalies: 3 },
  { hour: '22:00', detections: 18, persons: 8, vehicles: 4, anomalies: 2 },
];

const weeklyTrend = [
  { week: 'W1', critical: 8, high: 15, medium: 22, low: 10 },
  { week: 'W2', critical: 5, high: 12, medium: 18, low: 8 },
  { week: 'W3', critical: 12, high: 20, medium: 28, low: 14 },
  { week: 'W4', critical: 6, high: 10, medium: 15, low: 7 },
];

const cameraPerformance = [
  { cam: 'Lobby', detections: 320, accuracy: 97, uptime: 99.9 },
  { cam: 'Loading Dock', detections: 210, accuracy: 94, uptime: 98.5 },
  { cam: 'Server Room', detections: 88, accuracy: 99, uptime: 100 },
  { cam: 'Fence East', detections: 145, accuracy: 91, uptime: 97.2 },
];

const radarData = [
  { subject: 'Detection Rate', A: 92 },
  { subject: 'Accuracy', A: 96 },
  { subject: 'Response Time', A: 87 },
  { subject: 'Coverage', A: 79 },
  { subject: 'False Positive', A: 95 },
  { subject: 'Uptime', A: 99 },
];

export const Analytics: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    alertApi.list().then(r => setAlerts(r.data)).catch(console.error);
  }, []);

  const totalDetections = hourlyBase.reduce((s, h) => s + h.detections, 0);
  const peakHour = hourlyBase.reduce((p, h) => h.detections > p.detections ? h : p, hourlyBase[0]);
  const avgAccuracy = Math.round(cameraPerformance.reduce((s, c) => s + c.accuracy, 0) / cameraPerformance.length);

  const kpis = [
    { label: 'Total Detections (24h)', value: totalDetections.toLocaleString(), sub: 'Across all cameras', icon: Zap, color: '#A855F7', glow: 'rgba(168,85,247,0.3)' },
    { label: 'Peak Detection Hour', value: peakHour.hour, sub: `${peakHour.detections} detections`, icon: TrendingUp, color: '#10B981', glow: 'rgba(16,185,129,0.3)' },
    { label: 'Model Accuracy', value: `${avgAccuracy}%`, sub: 'Avg. across cameras', icon: BarChart3, color: '#06B6D4', glow: 'rgba(6,182,212,0.3)' },
    { label: 'Active Alerts', value: alerts.filter(a => a.status === 'open').length, sub: 'Unresolved incidents', icon: Activity, color: '#EC4899', glow: 'rgba(236,72,153,0.3)' },
  ];

  const handleExportAnalytics = () => {
    const sections: string[] = [];
    const ts = new Date().toLocaleString();

    sections.push(`"VisionOps AI - Analytics Report"`);
    sections.push(`"Generated","${ts}"`);
    sections.push('');

    sections.push('"=== HOURLY DETECTION SUMMARY ==="');
    sections.push('"Hour","Total Detections","Persons","Vehicles","Anomalies"');
    hourlyBase.forEach(h =>
      sections.push(`"${h.hour}","${h.detections}","${h.persons}","${h.vehicles}","${h.anomalies}"`)
    );
    sections.push('');

    sections.push('"=== WEEKLY ALERT TREND ==="');
    sections.push('"Week","Critical","High","Medium","Low"');
    weeklyTrend.forEach(w =>
      sections.push(`"${w.week}","${w.critical}","${w.high}","${w.medium}","${w.low}"`)
    );
    sections.push('');

    sections.push('"=== CAMERA PERFORMANCE ==="');
    sections.push('"Camera","Detections","Accuracy (%)","Uptime (%)"');
    cameraPerformance.forEach(c =>
      sections.push(`"${c.cam}","${c.detections}","${c.accuracy}","${c.uptime}"`)
    );
    sections.push('');

    sections.push('"=== AI SYSTEM RADAR METRICS ==="');
    sections.push('"Metric","Score"');
    radarData.forEach(r => sections.push(`"${r.subject}","${r.A}"`));

    const csv = sections.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `visionops_analytics_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Analytics & Insights</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI detection performance metrics and operational trends</p>
        </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleExportAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#A855F7]/20 text-[#C084FC] hover:bg-[#A855F7]/10 transition-all duration-200"
        >
          <Download className="h-3.5 w-3.5" /> Export Analytics CSV
        </button>
        <Badge variant="cyan" className="gap-1 text-xs">
          <Activity className="h-3 w-3 animate-pulse" /> Live Data Stream
        </Badge>
      </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-2xl glassmorphism border border-slate-200 dark:border-white/10 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-white/15">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
                  <p className="text-2xl font-black mt-1.5" style={{ color: kpi.color, textShadow: `0 0 20px ${kpi.glow}` }}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                </div>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <Icon className="h-4.5 w-4.5" style={{ color: kpi.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Tabs defaultValue="detections">
        <TabsList>
          <TabsTrigger value="detections">Detection Timeline</TabsTrigger>
          <TabsTrigger value="severity">Alert Severity</TabsTrigger>
          <TabsTrigger value="cameras">Camera Performance</TabsTrigger>
          <TabsTrigger value="radar">AI Quality Radar</TabsTrigger>
        </TabsList>

        <TabsContent value="detections">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">24-Hour Detection Breakdown</CardTitle>
              <CardDescription>Persons, vehicles, and anomalies detected by hour</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={hourlyBase} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    {[['persons', '#A855F7'], ['vehicles', '#06B6D4'], ['anomalies', '#EC4899']].map(([key, color]) => (
                      <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="hour" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px', color: '#f1f5f9' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="persons" stroke="#A855F7" strokeWidth={2} fill="url(#grad-persons)" name="Persons" />
                  <Area type="monotone" dataKey="vehicles" stroke="#06B6D4" strokeWidth={2} fill="url(#grad-vehicles)" name="Vehicles" />
                  <Area type="monotone" dataKey="anomalies" stroke="#EC4899" strokeWidth={2} fill="url(#grad-anomalies)" name="Anomalies" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="severity">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Weekly Alert Severity Breakdown</CardTitle>
              <CardDescription>Alert counts by severity level per week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={weeklyTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px', color: '#f1f5f9' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8', paddingTop: '10px' }} />
                  <Bar dataKey="critical" fill="#EC4899" radius={[4, 4, 0, 0]} name="Critical" />
                  <Bar dataKey="high" fill="#EF4444" radius={[4, 4, 0, 0]} name="High" />
                  <Bar dataKey="medium" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Medium" />
                  <Bar dataKey="low" fill="#06B6D4" radius={[4, 4, 0, 0]} name="Low" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cameras">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Per-Camera Performance Comparison</CardTitle>
              <CardDescription>Detections, model accuracy, and uptime per camera</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={cameraPerformance} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis type="number" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="cam" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px', color: '#f1f5f9' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8', paddingTop: '10px' }} />
                  <Bar dataKey="detections" fill="#A855F7" radius={[0, 4, 4, 0]} name="Total Detections" />
                  <Bar dataKey="accuracy" fill="#10B981" radius={[0, 4, 4, 0]} name="Accuracy %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">AI Engine Quality Radar</CardTitle>
                <CardDescription>Multi-dimensional model performance score</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 8 }} />
                    <Radar name="AI Performance" dataKey="A" stroke="#A855F7" fill="#A855F7" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip contentStyle={{ backgroundColor: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px', color: '#f1f5f9' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detection Confidence Trend</CardTitle>
                <CardDescription>Average AI confidence score over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={hourlyBase.map((h, i) => ({ ...h, confidence: 0.82 + (i % 3) * 0.05 }))}
                    margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="hour" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0.7, 1.0]} tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v * 100)}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px', color: '#f1f5f9' }}
                      formatter={(v: any) => [`${Math.round(v * 100)}%`, 'Confidence']}
                    />
                    <Line type="monotone" dataKey="confidence" stroke="#10B981" strokeWidth={2} dot={false} name="Confidence" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default Analytics;
