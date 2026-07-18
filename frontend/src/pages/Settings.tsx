import React, { useState, useEffect } from 'react';
import { settingsApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { CheckCircle2, Database, Shield, Bell, Zap, RefreshCw, Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi.get()
      .then(r => setSettings(r.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const res = await settingsApi.update(settings);
      setSettings(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Settings save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <RefreshCw className="h-5 w-5 animate-spin text-[#C084FC]" /> Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure AI thresholds, notification policies, and data retention rules</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <Badge variant="success" className="gap-1.5 animate-fade-in">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </Badge>
          )}
          <Button onClick={handleSave} isLoading={isSaving} className="gap-1.5">
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="ai">
        <TabsList>
          <TabsTrigger value="ai">AI Engine</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data Retention</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#A855F7] to-[#7C3AED] flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">AI Detection Engine</CardTitle>
                  <CardDescription>Fine-tune YOLOv11 inference parameters for your environment</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Confidence Threshold</label>
                  <Badge variant="cyan" className="font-mono">
                    {Math.round((settings?.aiConfThreshold || 0.5) * 100)}%
                  </Badge>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={settings?.aiConfThreshold || 0.5}
                  onChange={e => setSettings((s: any) => ({ ...s, aiConfThreshold: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Objects below this confidence score will be ignored. Lower values increase sensitivity, higher values reduce false positives.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">IoU Threshold (NMS)</label>
                  <Badge variant="cyan" className="font-mono">
                    {Math.round((settings?.aiIouThreshold || 0.45) * 100)}%
                  </Badge>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={settings?.aiIouThreshold || 0.45}
                  onChange={e => setSettings((s: any) => ({ ...s, aiIouThreshold: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Non-Maximum Suppression threshold to merge overlapping detection boxes.
                </p>
              </div>

              <div className="p-4 rounded-xl glassmorphism border border-white/5 space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Current Configuration Summary</p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {[
                    ['Model', 'YOLOv11n (COCO-pretrained)'],
                    ['Backend', 'Python FastAPI + OpenCV'],
                    ['Device', 'CPU / CUDA (auto-detect)'],
                    ['Format', 'MJPEG + REST API'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[10px] text-muted-foreground font-semibold">{k}</p>
                      <p className="text-xs font-mono text-slate-300 mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#D946EF] flex items-center justify-center">
                  <Bell className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">Notification Settings</CardTitle>
                  <CardDescription>Configure alert delivery methods and webhook integrations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-xl glassmorphism border border-white/5">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Email Alerts</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Send alert emails for high/critical severity events</p>
                </div>
                <button
                  onClick={() => setSettings((s: any) => ({ ...s, alertEmailEnabled: !s.alertEmailEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    settings?.alertEmailEnabled ? 'bg-[#A855F7]' : 'bg-white/10'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    settings?.alertEmailEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Webhook URL
                </label>
                <Input
                  value={settings?.alertWebhookUrl || ''}
                  onChange={e => setSettings((s: any) => ({ ...s, alertWebhookUrl: e.target.value }))}
                  placeholder="https://hooks.slack.com/services/..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  POST requests will be sent to this URL for every new alert event
                </p>
              </div>

              <div className="p-3 glassmorphism border border-white/5 rounded-xl flex items-start gap-3">
                <Bell className="h-4 w-4 text-[#C084FC] mt-0.5 flex-shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <strong className="text-slate-300">Browser notifications</strong> are always active when the dashboard is open. No configuration required.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center">
                  <Database className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">Data Retention</CardTitle>
                  <CardDescription>Control how long historical events are stored</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Alert Retention Period</label>
                  <Badge variant="cyan" className="font-mono">
                    {settings?.retentionDays || 30} days
                  </Badge>
                </div>
                <input
                  type="range"
                  min={7}
                  max={365}
                  step={1}
                  value={settings?.retentionDays || 30}
                  onChange={e => setSettings((s: any) => ({ ...s, retentionDays: parseInt(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>7 days</span>
                  <span>1 year (365 days)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Alert records older than this threshold will be automatically archived.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[7, 30, 90].map(d => (
                  <button
                    key={d}
                    onClick={() => setSettings((s: any) => ({ ...s, retentionDays: d }))}
                    className={`p-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                      settings?.retentionDays === d
                        ? 'bg-[#A855F7]/20 border-[#A855F7]/40 text-[#C084FC] shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                        : 'border-white/10 text-muted-foreground hover:border-white/20 hover:text-slate-300 hover:bg-white/[0.02]'
                    }`}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
                  <Shield className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">Database Mode</CardTitle>
                  <CardDescription>Current data storage backend status and configuration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className={`p-2 rounded-xl ${settings?.firebaseActive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                  <Database className={`h-5 w-5 ${settings?.firebaseActive ? 'text-emerald-400' : 'text-amber-400'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {settings?.firebaseActive ? 'Firebase Firestore' : 'Local JSON Database'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {settings?.firebaseActive
                      ? 'Connected to Firebase cloud database. Production-ready.'
                      : 'Using local JSON file storage at backend/database.json'}
                  </p>
                </div>
                <Badge
                  variant={settings?.firebaseActive ? 'success' : 'warning'}
                  className="ml-auto"
                >
                  {settings?.firebaseActive ? 'Cloud' : 'Local'}
                </Badge>
              </div>

              <div className="p-4 rounded-xl glassmorphism border border-white/5 space-y-3">
                <p className="text-xs font-bold text-slate-300">To enable Firebase Cloud Mode:</p>
                <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Create a Firebase project at <span className="font-mono text-purple-400">console.firebase.google.com</span></li>
                  <li>Generate a service account key JSON file</li>
                  <li>Set environment variables in <span className="font-mono text-slate-300">backend/.env</span></li>
                  <li>Restart the backend server</li>
                </ol>
                <div className="p-3 bg-black/30 border border-white/5 rounded-xl font-mono text-xs text-slate-400 space-y-1">
                  <p>FIREBASE_PROJECT_ID=your-project-id</p>
                  <p>FIREBASE_CLIENT_EMAIL=your-service-account@email</p>
                  <p>FIREBASE_PRIVATE_KEY="-----BEGIN..."</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default Settings;
