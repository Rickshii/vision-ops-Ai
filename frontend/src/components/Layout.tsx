import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import {
  Shield, Video, Camera, UploadCloud,
  AlertTriangle, BarChart3, FileText, Users, Settings, User,
  LogOut, Bell, X, Menu, ChevronLeft, ChevronRight,
  Sun, Moon, Zap
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export interface LiveNotification {
  id: string;
  cameraName: string;
  type: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  snapshotUrl?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToasts, setActiveToasts] = useState<LiveNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('visionops_theme');
    return saved !== 'light';
  });

  // Apply theme on mount and change
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('light');
    } else {
      root.classList.add('light');
    }
    localStorage.setItem('visionops_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: BarChart3, roles: ['admin', 'operator', 'viewer'] },
    { name: 'Live CCTV', path: '/cctv', icon: Video, roles: ['admin', 'operator', 'viewer'] },
    { name: 'Alerts Log', path: '/alerts', icon: AlertTriangle, roles: ['admin', 'operator', 'viewer'] },
    { name: 'AI Image Analyzer', path: '/upload', icon: UploadCloud, roles: ['admin', 'operator'] },
    { name: 'Camera Config', path: '/cameras', icon: Camera, roles: ['admin', 'operator'] },
    { name: 'Reports', path: '/reports', icon: FileText, roles: ['admin', 'operator'] },
    { name: 'Access Control', path: '/users', icon: Users, roles: ['admin'] },
    { name: 'System Settings', path: '/settings', icon: Settings, roles: ['admin'] },
    { name: 'My Profile', path: '/profile', icon: User, roles: ['admin', 'operator', 'viewer'] },
  ];

  const visibleNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  // SSE Live Alerts
  useEffect(() => {
    const token = localStorage.getItem('visionops_token');
    if (!token) return;

    const eventSource = new EventSource(`http://localhost:5000/api/alerts/events?token=${token}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.updateType === 'STATUS_UPDATE') {
          window.dispatchEvent(new CustomEvent('alert-status-updated', { detail: data }));
          return;
        }
        const newNotif: LiveNotification = {
          id: data.id,
          cameraName: data.cameraName,
          type: data.type,
          severity: data.severity,
          timestamp: data.timestamp,
          snapshotUrl: data.snapshotUrl
        };
        setNotifications(prev => [newNotif, ...prev].slice(0, 15));
        setUnreadCount(prev => prev + 1);
        setActiveToasts(prev => [...prev, newNotif]);
        setTimeout(() => {
          setActiveToasts(prev => prev.filter(t => t.id !== newNotif.id));
        }, 6000);
        if (['high', 'critical'].includes(newNotif.severity)) {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(600, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.15);
        }
        window.dispatchEvent(new CustomEvent('alert-triggered', { detail: data }));
      } catch (err) {
        console.error('Error parsing SSE event data:', err);
      }
    };

    eventSource.onerror = () => {
      console.warn('[SSE] Error or timeout. Reconnecting...');
      eventSource.close();
    };

    return () => { eventSource.close(); };
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const removeToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'border-l-4 border-l-rose-500 bg-rose-950/60 text-rose-400';
      case 'high': return 'border-l-4 border-l-orange-500 bg-orange-950/60 text-orange-400';
      case 'medium': return 'border-l-4 border-l-yellow-500 bg-yellow-950/60 text-yellow-400';
      default: return 'border-l-4 border-l-blue-500 bg-blue-950/60 text-blue-400';
    }
  };

  const currentPageName = navItems.find(item => item.path === location.pathname)?.name || 'Operations';

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'hsl(var(--background))' }}>
      
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)' }} />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)' }} />
      </div>

      {/* SIDEBAR */}
      <aside
        className={`hidden md:flex flex-col relative z-10 transition-all duration-300 ease-in-out glassmorphism border-r border-slate-200 dark:border-white/5 ${
          isCollapsed ? 'w-[70px]' : 'w-64'
        }`}
      >
        {/* Sidebar top glow line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#A855F7]/50 to-transparent" />

        {/* Logo */}
        <div className={`flex items-center h-16 border-b border-slate-200 dark:border-white/5 px-4 ${isCollapsed ? 'justify-center' : 'gap-3 px-5'}`}>
          <div className="relative flex-shrink-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#A855F7] to-[#EC4899] flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.5)]">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[hsl(var(--background))] animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-black text-sm tracking-tight leading-none text-slate-900 dark:text-white">
                Vision<span className="neon-gradient-text">Ops</span>
              </span>
              <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">AI Platform</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                  isCollapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-[#A855F7]/20 to-[#EC4899]/10 text-slate-900 dark:text-white border border-[#A855F7]/25 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                    : 'text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-y-0 left-0 w-0.5 rounded-full bg-gradient-to-b from-[#A855F7] to-[#EC4899]" />
                )}
                <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${isActive ? 'text-[#C084FC]' : 'text-muted-foreground group-hover:text-slate-200'}`} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {!isCollapsed && (
          <div className="p-3 border-t border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group">
              <div className="relative flex-shrink-0">
                <img
                  src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=A855F7&color=fff&size=80`}
                  alt="avatar"
                  className="h-8 w-8 rounded-lg object-cover border border-[#A855F7]/30"
                />
                <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-[hsl(var(--background))]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-muted-foreground hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all"
                title="Log Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(c => !c)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full glassmorphism border border-slate-300 dark:border-white/10 flex items-center justify-center text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200 hover:border-[#A855F7]/40 shadow-lg"
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        
        {/* TOP NAV */}
        <header className="h-16 border-b border-slate-200 dark:border-white/5 glassmorphism flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Page Title */}
            <div className="flex flex-col">
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none">{currentPageName}</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">VisionOps AI Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Engine status */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Zap className="h-3 w-3" />
              <span className="font-semibold text-[10px] uppercase tracking-wide">AI Live</span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(d => !d)}
              className="p-2 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-slate-300 dark:hover:border-white/10"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[#C084FC]" />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => { setIsNotifOpen(o => !o); setUnreadCount(0); }}
                className="p-2 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl relative transition-all border border-transparent hover:border-slate-300 dark:hover:border-white/10"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)] animate-pulse" />
                )}
              </button>

              {isNotifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-panel-purple z-50 shadow-[0_25px_50px_rgba(0,0,0,0.4)] animate-fade-in-up border border-[#A855F7]/20">
                    <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Live AI Detections</span>
                        <Badge variant="danger" className="text-[9px] px-1.5 py-0">{notifications.length}</Badge>
                      </div>
                      <button onClick={() => setIsNotifOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-muted-foreground transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-200 dark:divide-white/5">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                          <p className="text-xs text-muted-foreground">No notifications this session</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="p-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{n.cameraName}</span>
                              <span className="text-[9px] text-muted-foreground font-mono">{new Date(n.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{n.type}</p>
                            <Badge
                              variant={n.severity === 'critical' || n.severity === 'high' ? 'danger' : 'warning'}
                              className="mt-1.5 text-[9px] px-1 py-0"
                            >
                              {n.severity}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Role Badge */}
            <Badge variant="purple" className="text-[10px] font-mono px-2.5 py-1 hidden sm:flex">
              {user?.role?.toUpperCase()}
            </Badge>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto relative" style={{ backgroundColor: 'hsl(var(--background))' }}>
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>

      {/* MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-72 glass-panel-purple p-4 z-10 h-full overflow-y-auto">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#A855F7]/60 to-transparent" />

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#A855F7] to-[#EC4899] flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="font-black text-slate-900 dark:text-white text-sm">Vision<span className="neon-gradient-text">Ops</span> AI</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {visibleNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#A855F7]/20 to-[#EC4899]/10 text-slate-900 dark:text-white border border-[#A855F7]/25'
                        : 'text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#C084FC]' : ''}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-200 dark:border-white/5 pt-4 mt-4 space-y-2">
              <button
                onClick={() => setIsDark(d => !d)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-all w-full"
              >
                {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[#C084FC]" />}
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all w-full"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80 max-w-full">
        {activeToasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex flex-col p-4 rounded-2xl glassmorphism shadow-2xl animate-fade-in-up ${getSeverityColor(toast.severity)}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">AI Alert: {toast.type}</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{toast.cameraName}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">{new Date(toast.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
              <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {toast.snapshotUrl && (
              <div className="mt-3 rounded-xl overflow-hidden aspect-video border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-black/40">
                <img src={toast.snapshotUrl} alt="Snapshot" className="object-cover w-full h-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                  <span className="text-[9px] bg-rose-600 text-white font-mono px-1.5 py-0.5 rounded">LIVE</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default Layout;
