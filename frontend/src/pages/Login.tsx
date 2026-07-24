import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Shield, Eye, EyeOff, Lock, Mail, Zap } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setIsLoading(true);
    setError('');
    try {
      const response = await authApi.login({ email, password });
      login(response.data.token, response.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials or connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ backgroundColor: 'hsl(var(--background))' }}>
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)' }} />
        <div className="absolute top-[30%] right-[25%] w-[30%] h-[30%] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }} />
      </div>

      {/* Left decorative panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="relative z-10 max-w-md">
          {/* Brand mark */}
          <div className="flex items-center gap-3 mb-12">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#A855F7] to-[#EC4899] flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.5)]">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-black text-xl text-slate-900 dark:text-white leading-none">VisionOps</p>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">AI Platform</p>
            </div>
          </div>

          <h2 className="text-4xl font-black text-slate-900 dark:text-white leading-tight mb-4">
            Intelligent Visual<br />
            <span className="neon-gradient-text">Operations</span><br />
            Platform
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8">
            Real-time AI-powered CCTV monitoring, object detection, and enterprise security management — all in one dashboard.
          </p>

          {/* Feature bullets */}
          {[
            { label: 'Real-time AI Detection', color: '#A855F7' },
            { label: 'Live CCTV Monitoring', color: '#06B6D4' },
            { label: 'Intelligent Alert System', color: '#EC4899' },
            { label: 'Enterprise Analytics', color: '#3B82F6' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3 mb-3">
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: f.color, boxShadow: `0 0 8px ${f.color}` }} />
              <span className="text-sm text-slate-700 dark:text-slate-300">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right login panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#A855F7] to-[#EC4899] flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.5)]">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-black text-lg text-slate-900 dark:text-white">VisionOps <span className="neon-gradient-text">AI</span></span>
          </div>

          {/* Card */}
          <div className="glass-panel-purple rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#A855F7]/60 to-transparent" />

            <div className="mb-6">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Welcome back</h3>
              <p className="text-sm text-muted-foreground">Sign in to access your visual operations portal</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">!</div>
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="operator@visionops.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Demo credentials hint */}
              <div className="p-3 rounded-xl bg-[#A855F7]/5 border border-[#A855F7]/15 text-[11px] text-muted-foreground">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Demo:</span>{' '}
                <span className="font-mono text-[#C084FC]">admin@visionops.ai</span>{' '}
                <span className="text-muted-foreground">/</span>{' '}
                <span className="font-mono text-[#C084FC]">admin123</span>
              </div>

              <Button type="submit" className="w-full h-11 text-sm" isLoading={isLoading}>
                <Zap className="h-4 w-4 mr-2" />
                Sign In to Platform
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/5 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-[#C084FC] hover:text-[#A855F7] transition-colors">
                  Create one now →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;
