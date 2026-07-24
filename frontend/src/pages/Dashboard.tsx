import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cameraApi, alertApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Camera, AlertTriangle, Eye, TrendingUp,
  TrendingDown, ArrowRight, Zap, CheckCircle2, Activity,
  Shield, Cpu, Radio
} from 'lucide-react';

const PIE_COLORS = ['#A855F7', '#EC4899', '#06B6D4', '#3B82F6'];

function getStatusBadge(status: string) {
  const map: Record<string, any> = {
    open: 'danger',
    investigating: 'info',
    resolved: 'success',
  };
  return map[status] || 'secondary';
}

const areaData = [
  { hour: '00:00', detections: 3, alerts: 1 },
  { hour: '02:00', detections: 2, alerts: 0 },
  { hour: '04:00', detections: 4, alerts: 1 },
  { hour: '06:00', detections: 8, alerts: 2 },
  { hour: '08:00', detections: 21, alerts: 4 },
  { hour: '10:00', detections: 35, alerts: 6 },
  { hour: '12:00', detections: 28, alerts: 3 },
  { hour: '14:00', detections: 40, alerts: 7 },
  { hour: '16:00', detections: 33, alerts: 5 },
  { hour: '18:00', detections: 18, alerts: 2 },
  { hour: '20:00', detections: 12, alerts: 3 },
  { hour: '22:00', detections: 7, alerts: 1 },
];

const weeklyData = [
  { day: 'Mon', alerts: 12 },
  { day: 'Tue', alerts: 19 },
  { day: 'Wed', alerts: 7 },
  { day: 'Thu', alerts: 24 },
  { day: 'Fri', alerts: 16 },
  { day: 'Sat', alerts: 4 },
  { day: 'Sun', alerts: 3 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel-purple rounded-xl p-3 text-xs border border-[#A855F7]/20 shadow-2xl">
        <p className="text-muted-foreground font-mono mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="font-semibold">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC = () => {
  const [cameras, setCameras] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [camRes, alertRes] = await Promise.all([cameraApi.list(), alertApi.list()]);
        setCameras(camRes.data);
        setAlerts(alertRes.data);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
    const handler = (e: any) => { setAlerts(prev => [e.detail, ...prev].slice(0, 50)); };
    window.addEventListener('alert-triggered', handler);
    return () => window.removeEventListener('alert-triggered', handler);
  }, []);

  const activeCams = cameras.filter(c => c.status === 'active').length;
  const openAlerts = alerts.filter(a => a.status === 'open').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;
  const resolvedToday = alerts.filter(a => a.status === 'resolved').length;

  const alertTypeDist = [
    { name: 'Intrusion', value: alerts.filter(a => a.type?.toLowerCase().includes('intru') || a.type?.toLowerCase().includes('breach')).length || 3 },
    { name: 'Crowd', value: alerts.filter(a => a.type?.toLowerCase().includes('crowd')).length || 2 },
    { name: 'Vehicle', value: alerts.filter(a => a.type?.toLowerCase().includes('vehicle') || a.type?.toLowerCase().includes('car')).length || 2 },
    { name: 'Other', value: Math.max(1, alerts.length - 7) },
  ];

  const kpiCards = [
    {
      title: 'Active Cameras',
      value: activeCams,
      total: cameras.length,
      icon: Camera,
      gradient: 'from-[#A855F7] to-[#7C3AED]',
      glow: 'rgba(168,85,247,0.4)',
      glowHover: 'rgba(168,85,247,0.6)',
      trend: '+1 this week',
      trendUp: true,
      detail: 'Live streaming feeds',
    },
    {
      title: 'Open Alerts',
      value: openAlerts,
      icon: AlertTriangle,
      gradient: 'from-[#EC4899] to-[#BE185D]',
      glow: 'rgba(236,72,153,0.4)',
      glowHover: 'rgba(236,72,153,0.6)',
      trend: 'Requires action',
      trendUp: false,
      detail: 'Pending investigation',
    },
    {
      title: 'Critical Events',
      value: criticalAlerts,
      icon: Zap,
      gradient: 'from-[#F97316] to-[#EA580C]',
      glow: 'rgba(249,115,22,0.4)',
      glowHover: 'rgba(249,115,22,0.6)',
      trend: 'High priority',
      trendUp: false,
      detail: 'Immediate attention',
    },
    {
      title: 'Resolved Today',
      value: resolvedToday,
      icon: CheckCircle2,
      gradient: 'from-[#10B981] to-[#059669]',
      glow: 'rgba(16,185,129,0.4)',
      glowHover: 'rgba(16,185,129,0.6)',
      trend: 'Cases closed',
      trendUp: true,
      detail: 'Security resolved',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time overview of your visual security infrastructure</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
            <Radio className="h-3 w-3 animate-pulse" />
            <span className="font-semibold uppercase tracking-wide text-[10px]">Live</span>
          </div>
          <Link to="/cctv">
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="h-3.5 w-3.5" /> Live CCTV
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-2xl glassmorphism border border-slate-200 dark:border-white/10 p-5 hover:border-slate-300 dark:hover:border-white/15 transition-all duration-300 hover:-translate-y-1 cursor-default group"
              style={{ ['--glow' as any]: card.glow }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}
                  style={{ boxShadow: `0 4px 20px ${card.glow}` }}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                {card.trendUp
                  ? <TrendingUp className="h-4 w-4 text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                  : <TrendingDown className="h-4 w-4 text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                }
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{card.value}</span>
                  {card.total !== undefined && (
                    <span className="text-sm text-muted-foreground font-mono">/ {card.total}</span>
                  )}
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{card.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{card.detail}</p>
              </div>
              <div className={`mt-3 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center gap-1 text-xs ${card.trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {card.trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {card.trend}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Detection Timeline (24h)</CardTitle>
                <CardDescription>AI object detections and alerts per 2-hour window</CardDescription>
              </div>
              <Badge variant="cyan" className="text-[9px] uppercase tracking-wide">LIVE</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={areaData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="detGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="alrtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EC4899" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="hour" tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="detections" stroke="#A855F7" strokeWidth={2} fill="url(#detGrad)" name="Detections" />
                <Area type="monotone" dataKey="alerts" stroke="#EC4899" strokeWidth={2} fill="url(#alrtGrad)" name="Alerts" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alert Distribution</CardTitle>
            <CardDescription>By incident type (all time)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={alertTypeDist} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {alertTypeDist.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]}
                      style={{ filter: `drop-shadow(0 0 6px ${PIE_COLORS[index % PIE_COLORS.length]}60)` }} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '10px', color: '#94A3B8' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Weekly Alert Volume</CardTitle>
            <CardDescription>Alerts triggered per weekday</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="alerts" radius={[5, 5, 0, 0]}>
                  {weeklyData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${271 - i * 10}, 91%, ${55 + i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Camera Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Camera Status</CardTitle>
              <Link to="/cameras">
                <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-[#C084FC] hover:text-[#A855F7]">
                  Manage <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-8 rounded-lg bg-slate-200 dark:bg-white/5 animate-pulse" />)}
              </div>
            ) : cameras.slice(0, 5).map(cam => (
              <div key={cam.id} className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/5 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    cam.status === 'active' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' :
                    cam.status === 'error' ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]' : 'bg-slate-600'
                  } ${cam.status === 'active' ? 'animate-pulse' : ''}`} />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">{cam.name}</p>
                    <p className="text-[10px] text-muted-foreground">{cam.zone}</p>
                  </div>
                </div>
                <Badge variant={cam.status === 'active' ? 'success' : cam.status === 'error' ? 'danger' : 'secondary'} className="text-[9px]">
                  {cam.status}
                </Badge>
              </div>
            ))}
            {!isLoading && cameras.length === 0 && (
              <div className="text-center py-4">
                <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-xs text-muted-foreground">No cameras configured</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent Alerts</CardTitle>
              <Link to="/alerts">
                <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-[#C084FC] hover:text-[#A855F7]">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-slate-200 dark:bg-white/5 animate-pulse" />)}
              </div>
            ) : alerts.slice(0, 4).map(alert => (
              <div key={alert.id} className="flex items-start gap-3 py-2 border-b border-slate-200 dark:border-white/5 last:border-0">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 mt-1.5 ${
                  alert.severity === 'critical' ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]' :
                  alert.severity === 'high' ? 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.7)]' :
                  alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{alert.type}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{alert.cameraName}</p>
                </div>
                <Badge variant={getStatusBadge(alert.status)} className="text-[9px] flex-shrink-0">{alert.status}</Badge>
              </div>
            ))}
            {!isLoading && alerts.length === 0 && (
              <div className="text-center py-4">
                <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-xs text-muted-foreground">No alerts logged</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Footer */}
      <div className="rounded-2xl glass-panel-cyan border border-[#06B6D4]/15 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.35)]">
            <Cpu className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">AI Intelligence Summary</p>
            <p className="text-[10px] text-muted-foreground">Generated by VisionOps Neural Engine</p>
          </div>
          <Badge variant="cyan" className="ml-auto text-[9px]">BETA</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Peak Detection Hour', value: '14:00 – 16:00', icon: Activity },
            { label: 'Most Common Event', value: 'Unauthorized Access', icon: AlertTriangle },
            { label: 'System Uptime', value: '99.7% this week', icon: CheckCircle2 },
          ].map(insight => {
            const Icon = insight.icon;
            return (
              <div key={insight.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                <Icon className="h-4 w-4 text-[#22D3EE] flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{insight.label}</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{insight.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
