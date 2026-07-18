import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { Dialog } from '../components/ui/Dialog';
import {
  CheckCircle2, Shield, Key, Copy, Save, Lock,
  Camera, Upload, Trash2
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [company, setCompany] = useState(user?.company || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Avatar states
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || '');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const presets = [
    { name: 'Initial Seed', url: `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=A855F7&color=fff&size=128` },
    { name: 'Security Bot', url: `https://api.dicebear.com/7.x/bottts/svg?seed=security` },
    { name: 'Cyber Analyst', url: `https://api.dicebear.com/7.x/bottts/svg?seed=cypher` },
    { name: 'Matrix Node', url: `https://api.dicebear.com/7.x/identicon/svg?seed=matrix` },
    { name: 'Vector Hub', url: `https://api.dicebear.com/7.x/identicon/svg?seed=analyst` },
    { name: 'Quantum Core', url: `https://api.dicebear.com/7.x/bottts/svg?seed=quantum` },
  ];

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await authApi.updateProfile({ name, phone, company });
      updateUser(res.data);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.error('Profile save error:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError('');
    setIsSavingPassword(true);
    try {
      await authApi.updateProfile({ password: newPassword });
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err) {
      console.error('Password save error:', err);
      setPasswordError('Failed to update password. Please try again.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleCopyApiKey = () => {
    if (user?.apiKey) {
      navigator.clipboard.writeText(user.apiKey);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image file is too large. Please select a file smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 150;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;
          ctx.drawImage(img, x, y, size, size, 0, 0, 150, 150);
          const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedAvatar(resizedBase64);
          setAvatarError('');
        }
      };
      img.onerror = () => {
        setAvatarError('Invalid image file.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    setIsSavingAvatar(true);
    try {
      const res = await authApi.updateProfile({ avatarUrl: selectedAvatar });
      updateUser(res.data);
      setIsAvatarModalOpen(false);
    } catch (err) {
      console.error('Failed to update avatar:', err);
      setAvatarError('Failed to save profile picture. Please try again.');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const roleColors: Record<string, any> = { admin: 'danger', operator: 'warning', viewer: 'info' };

  return (
    <div className="space-y-5 animate-fade-in-up max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your personal information, password, and API credentials</p>
      </div>

      {/* Profile Header Card */}
      <div className="rounded-2xl glassmorphism border border-white/8 p-6 transition-all hover:border-white/12 duration-300">
        <div className="flex items-center gap-5">
          <div
            className="relative group cursor-pointer overflow-hidden rounded-2xl border border-white/10"
            onClick={() => {
              setSelectedAvatar(user?.avatarUrl || '');
              setIsAvatarModalOpen(true);
            }}
            title="Click to change profile picture"
          >
            <img
              src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=A855F7&color=fff&size=128`}
              alt="Avatar"
              className="h-20 w-20 rounded-2xl object-cover border border-[#A855F7]/20 group-hover:scale-105 transition-all duration-300"
            />
            <div className="absolute inset-0 bg-[#A855F7]/30 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Camera className="h-5 w-5 text-white" />
              <span className="text-[9px] text-white font-bold mt-0.5 uppercase tracking-wider">Change</span>
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-950" title="Online" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-white leading-tight">{user?.name}</h2>
              <Badge variant={roleColors[user?.role || 'viewer']} className="capitalize">
                {user?.role}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{user?.email}</p>
            {user?.company && <p className="text-xs text-slate-300 font-semibold mt-1">{user.company}</p>}
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">Member since {new Date(user?.createdAt || '').toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Personal Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="api">API Access</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Personal Information</CardTitle>
              <CardDescription>Update your name, phone number, and company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Full Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email Address</label>
                <Input value={user?.email || ''} disabled className="opacity-50 cursor-not-allowed" />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed after registration</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phone</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 012-3456" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Company</label>
                  <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                {profileSaved && (
                  <Badge variant="success" className="gap-1.5 animate-fade-in">
                    <CheckCircle2 className="h-3 w-3" /> Profile saved
                  </Badge>
                )}
                <div className="ml-auto">
                  <Button onClick={handleSaveProfile} isLoading={isSavingProfile} className="gap-1.5">
                    <Save className="h-4 w-4" /> Save Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#D946EF] flex items-center justify-center">
                  <Lock className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">Change Password</CardTitle>
                  <CardDescription>Update your account password. Minimum 6 characters.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {passwordError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                  {passwordError}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                {passwordSaved && (
                  <Badge variant="success" className="gap-1.5 animate-fade-in">
                    <CheckCircle2 className="h-3 w-3" /> Password updated
                  </Badge>
                )}
                <div className="ml-auto">
                  <Button onClick={handleSavePassword} isLoading={isSavingPassword} className="gap-1.5">
                    <Shield className="h-4 w-4" /> Update Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center">
                  <Key className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">API Credentials</CardTitle>
                  <CardDescription>Use this key to authenticate external integrations with the VisionOps API</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your API Key</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-black/30 border border-white/5 rounded-xl px-3 py-2.5 font-mono text-xs text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap">
                    {user?.apiKey || 'No API key assigned'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyApiKey}
                    className="gap-1.5 flex-shrink-0"
                  >
                    {apiKeyCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {apiKeyCopied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-xl glassmorphism border border-white/5 space-y-2">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Example API Usage</p>
                <div className="font-mono text-xs text-slate-400 space-y-1.5 pt-1">
                  <p className="text-slate-500">// Authenticate requests with your API key</p>
                  <p><span className="text-emerald-400">GET</span> http://localhost:5000/api/cameras</p>
                  <p><span className="text-amber-400">Header:</span> Authorization: Bearer {'{'}your-jwt-token{'}'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                Keep your API key private. Never expose it in client-side code or public repositories.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Avatar Change Dialog */}
      <Dialog
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        title="Edit Profile Picture"
        className="max-w-md"
      >
        <div className="space-y-6 mt-4">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="relative">
              <img
                src={selectedAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=A855F7&color=fff&size=128`}
                alt="Selected Avatar"
                className="h-24 w-24 rounded-2xl object-cover border border-[#A855F7]/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              />
              {selectedAvatar && (
                <button
                  type="button"
                  onClick={() => setSelectedAvatar('')}
                  className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full p-1 border border-slate-950 transition-colors"
                  title="Remove Avatar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Preview</p>
          </div>

          <div className="space-y-3 border-t border-white/5 pt-4">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Option 1: Upload custom image</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-[#A855F7]/40 rounded-xl p-4 cursor-pointer transition-all bg-white/[0.01]">
                <Upload className="h-5 w-5 text-muted-foreground mb-1.5" />
                <span className="text-xs font-semibold text-slate-200">Choose Image File</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, GIF (Max 5MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            {avatarError && (
              <p className="text-xs text-rose-400 font-medium">{avatarError}</p>
            )}
          </div>

          <div className="space-y-3 border-t border-white/5 pt-4">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Option 2: Select AI Preset Avatar</label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedAvatar(preset.url)}
                  className={`relative p-2 rounded-xl border bg-white/[0.01] hover:bg-white/[0.03] transition-all flex items-center justify-center ${
                    selectedAvatar === preset.url
                      ? 'border-[#A855F7] bg-[#A855F7]/10 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                      : 'border-white/5 hover:border-white/10'
                  }`}
                  title={preset.name}
                >
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="h-10 w-10 rounded-xl object-cover"
                  />
                  {selectedAvatar === preset.url && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#A855F7] text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-white/5 pt-4">
            <Button variant="secondary" onClick={() => setIsAvatarModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAvatar} isLoading={isSavingAvatar} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Save Picture
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default Profile;
