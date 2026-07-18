import React, { useState, useEffect } from 'react';
import { usersApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, RefreshCw, AlertTriangle, CheckCircle2, UserX } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editUser, setEditUser] = useState<any>(null);
  const [newRole, setNewRole] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try { const res = await usersApi.list(); setUsers(res.data); }
    catch (err) { console.error('User load error:', err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (u: any) => { setEditUser(u); setNewRole(u.role); setNewStatus(u.status); };

  const handleSave = async () => {
    if (!editUser) return;
    setIsSaving(true);
    try {
      await usersApi.update(editUser.id, { role: newRole, status: newStatus });
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, role: newRole, status: newStatus } : u));
      setEditUser(null);
    } catch (err) { console.error('Update error:', err); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try { await usersApi.delete(deleteUser.id); setUsers(prev => prev.filter(u => u.id !== deleteUser.id)); setDeleteUser(null); }
    catch (err) { console.error('Delete error:', err); }
  };

  const roleVariant: Record<string, any> = { admin: 'danger', operator: 'warning', viewer: 'info' };
  const statusVariant: Record<string, any> = { active: 'success', suspended: 'danger' };

  const roleSummary = [
    { role: 'Admin', count: users.filter(u => u.role === 'admin').length, icon: Shield, color: '#EC4899', glow: 'rgba(236,72,153,0.3)', desc: 'Full system access' },
    { role: 'Operator', count: users.filter(u => u.role === 'operator').length, icon: Users, color: '#F59E0B', glow: 'rgba(245,158,11,0.3)', desc: 'Monitor & manage cameras' },
    { role: 'Viewer', count: users.filter(u => u.role === 'viewer').length, icon: Users, color: '#06B6D4', glow: 'rgba(6,182,212,0.3)', desc: 'Read-only access' },
  ];

  const permissions = [
    ['View live CCTV feeds', true, true, true],
    ['View alerts log', true, true, true],
    ['Update alert status', true, true, false],
    ['Add / edit cameras', true, true, false],
    ['Delete cameras', true, false, false],
    ['Upload images for AI', true, true, false],
    ['Generate reports', true, true, false],
    ['Manage users & roles', true, false, false],
    ['Modify system settings', true, false, false],
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Access Control</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage user roles, permissions, and account status</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {roleSummary.map(r => {
          const Icon = r.icon;
          return (
            <div key={r.role} className="rounded-2xl glassmorphism border border-white/8 p-5 transition-all hover:-translate-y-0.5 hover:border-white/15 duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{r.role}s</p>
                  <p className="text-3xl font-black mt-1.5" style={{ color: r.color, textShadow: `0 0 20px ${r.glow}` }}>{r.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                </div>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${r.color}15`, border: `1px solid ${r.color}30` }}>
                  <Icon className="h-5 w-5" style={{ color: r.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#A855F7] to-[#7C3AED] flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <CardTitle className="text-sm">Role Permission Matrix</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Permission</th>
                  {['Admin', 'Operator', 'Viewer'].map(r => (
                    <th key={r} className="text-center py-2 px-4 text-muted-foreground font-bold uppercase tracking-widest text-[10px]">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {permissions.map(([perm, admin, op, viewer]) => (
                  <tr key={perm as string} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2 pr-4 text-slate-300">{perm as string}</td>
                    {[admin, op, viewer].map((has, i) => (
                      <td key={i} className="text-center py-2 px-4">
                        {has ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mx-auto" /> : <span className="text-muted-foreground">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Platform Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin text-[#C084FC]" /> Loading users...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Member Since</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=A855F7&color=fff&size=64`}
                          alt={u.name} className="h-8 w-8 rounded-lg object-cover border border-[#A855F7]/20" />
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{u.name}</p>
                          {u.phone && <p className="text-[10px] text-muted-foreground">{u.phone}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs text-slate-300 font-mono">{u.email}</span></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{u.company || '—'}</span></TableCell>
                    <TableCell><Badge variant={roleVariant[u.role] || 'secondary'} className="capitalize">{u.role}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant[u.status] || 'secondary'} className="capitalize">{u.status}</Badge></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground font-mono">{new Date(u.createdAt).toLocaleDateString()}</span></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.id !== currentUser?.id ? (
                          <>
                            <Button variant="ghost" size="sm" className="text-xs h-7 hover:text-[#C084FC]" onClick={() => openEdit(u)}>Edit</Button>
                            <Button variant="ghost" size="sm" className="text-xs h-7 text-rose-400 hover:bg-rose-500/10" onClick={() => setDeleteUser(u)}>
                              <UserX className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Badge variant="purple" className="text-[9px]">You</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User Access">
        {editUser && (
          <div className="space-y-4 mt-3">
            <div className="flex items-center gap-3 p-3 rounded-xl glassmorphism border border-white/5">
              <img src={editUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(editUser.name)}&background=A855F7&color=fff&size=64`}
                alt={editUser.name} className="h-10 w-10 rounded-lg object-cover border border-[#A855F7]/20" />
              <div>
                <p className="text-sm font-bold text-slate-200">{editUser.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{editUser.email}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Role</label>
              <Select value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
                <option value="viewer">Viewer</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Account Status</label>
              <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
            {newStatus === 'suspended' && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                This user will be locked out immediately upon suspension.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={handleSave} isLoading={isSaving}>Save Changes</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Dialog */}
      <Dialog isOpen={!!deleteUser} onClose={() => setDeleteUser(null)} title="Delete User Account">
        <div className="flex items-center gap-3 my-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <UserX className="h-5 w-5 text-rose-400 flex-shrink-0" />
          <p className="text-sm text-slate-300">Permanently delete <strong className="text-white">{deleteUser?.name}</strong>'s account?</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteUser(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete Account</Button>
        </div>
      </Dialog>
    </div>
  );
};
export default UserManagement;
