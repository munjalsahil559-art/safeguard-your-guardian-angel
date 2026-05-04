import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PasswordInput from '@/components/PasswordInput';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { User, Mail, Lock, LogOut, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AccountPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleUpdateProfile = async () => {
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), email: email.trim() })
      .eq('user_id', user!.id);
    
    if (error) { toast.error('Failed to update profile'); return; }

    // Update email in auth if changed
    if (email !== user?.email) {
      const { error: authError } = await supabase.auth.updateUser({ email: email.trim() });
      if (authError) { toast.error(authError.message); return; }
      toast.success('Verification email sent to new address');
    } else {
      toast.success('Profile updated!');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast.error(error.message); return; }
    setNewPassword(''); setConfirmPassword('');
    toast.success('Password changed successfully');
  };

  const handleDeleteAccount = async () => {
    // Delete profile data — the cascade on auth.users will clean up
    await supabase.from('trusted_contacts').delete().eq('user_id', user!.id);
    await supabase.from('profiles').delete().eq('user_id', user!.id);
    await logout();
    toast.success('Account data deleted. Contact support for full removal.');
  };

  const handleLogout = async () => {
    await logout();
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
              <Label>New Password</Label>
              <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1" placeholder="••••••••" />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <PasswordInput value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1" placeholder="••••••••" />
            </div>
            <Button onClick={handleChangePassword} variant="secondary">
              <Lock className="mr-2 h-4 w-4" /> Update Password
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
