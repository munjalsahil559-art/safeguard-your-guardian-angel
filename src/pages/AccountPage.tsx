import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PasswordInput from '@/components/PasswordInput';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { User, Mail, Lock, LogOut, Trash2, Crown, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AccountPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleUpdateProfile = () => {
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    if (!email.trim()) { toast.error('Email cannot be empty'); return; }

    const users = JSON.parse(localStorage.getItem('safeguard_users') || '[]');
    const idx = users.findIndex((u: any) => u.email === user?.email);
    if (idx === -1) { toast.error('User not found'); return; }

    // Check if new email is taken by another user
    if (email !== user?.email && users.find((u: any, i: number) => i !== idx && u.email === email)) {
      toast.error('Email already taken'); return;
    }

    users[idx].name = name.trim();
    users[idx].email = email.trim();
    localStorage.setItem('safeguard_users', JSON.stringify(users));

    // Update session
    const session = { email: email.trim(), role: user!.role, name: name.trim() };
    localStorage.setItem('safeguard_session', JSON.stringify(session));
    
    toast.success('Profile updated! Please re-login for changes to take effect.');
  };

  const handleChangePassword = () => {
    if (!currentPassword) { toast.error('Enter current password'); return; }
    if (!newPassword || newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }

    const users = JSON.parse(localStorage.getItem('safeguard_users') || '[]');
    const idx = users.findIndex((u: any) => u.email === user?.email);
    if (idx === -1 || users[idx].password !== currentPassword) {
      toast.error('Current password is incorrect'); return;
    }

    users[idx].password = newPassword;
    localStorage.setItem('safeguard_users', JSON.stringify(users));
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    toast.success('Password changed successfully');
  };

  const handleDeleteAccount = () => {
    const users = JSON.parse(localStorage.getItem('safeguard_users') || '[]');
    const filtered = users.filter((u: any) => u.email !== user?.email);
    localStorage.setItem('safeguard_users', JSON.stringify(filtered));
    localStorage.removeItem(`safeguard_contacts_${user?.email}`);
    logout();
    toast.success('Account deleted');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Profile Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <User className="h-5 w-5 text-primary" />
            Profile Information
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="accName">Full Name</Label>
              <Input id="accName" value={name} onChange={e => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="accEmail">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="accEmail" type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-9" />
              </div>
            </div>
            <Button onClick={handleUpdateProfile} className="emergency-gradient text-primary-foreground">
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </div>
        </motion.div>

        {/* Change Password */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Lock className="h-5 w-5 text-primary" />
            Change Password
          </h2>
          <div className="space-y-4">
            <div>
              <Label>Current Password</Label>
              <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-1" placeholder="••••••••" />
            </div>
            <div>
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1" placeholder="••••••••" />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1" placeholder="••••••••" />
            </div>
            <Button onClick={handleChangePassword} variant="secondary">
              <Lock className="mr-2 h-4 w-4" /> Update Password
            </Button>
          </div>
        </motion.div>

        {/* Upgrade Account */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Crown className="h-5 w-5 text-yellow-500" />
            Upgrade Account
          </h2>
          <p className="text-sm text-muted-foreground mb-4">Current role: <span className="font-semibold text-foreground capitalize">{user?.role}</span></p>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h3 className="font-semibold text-primary mb-2">Premium Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>✓ Priority SOS response</li>
              <li>✓ Extended incident history</li>
              <li>✓ Advanced evidence storage</li>
              <li>✓ 24/7 dedicated support</li>
            </ul>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
              <Crown className="mr-2 h-4 w-4" /> Upgrade to Premium
            </Button>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-destructive/30 bg-card p-6">
          <h2 className="mb-4 text-lg font-bold text-destructive">Danger Zone</h2>
          <div className="space-y-3">
            <Button onClick={handleLogout} variant="outline" className="w-full justify-start">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
            {!showDeleteConfirm ? (
              <Button onClick={() => setShowDeleteConfirm(true)} variant="destructive" className="w-full justify-start">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
              </Button>
            ) : (
              <div className="rounded-lg border border-destructive p-4 space-y-3">
                <p className="text-sm text-destructive font-medium">Are you sure? This action cannot be undone.</p>
                <div className="flex gap-2">
                  <Button onClick={handleDeleteAccount} variant="destructive" size="sm">Yes, Delete</Button>
                  <Button onClick={() => setShowDeleteConfirm(false)} variant="outline" size="sm">Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AccountPage;
