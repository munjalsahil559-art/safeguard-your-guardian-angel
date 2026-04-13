import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import AppHeader from '@/components/AppHeader';
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
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="basalt-slab p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <h2 className="mb-6 font-bold text-lg uppercase tracking-tight flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            Profile Information
          </h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Full Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="bg-muted border-none font-mono text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-muted border-none font-mono text-sm" />
            </div>
            <button onClick={handleUpdateProfile} className="px-6 py-3 bg-foreground text-background font-mono text-xs uppercase tracking-widest font-bold monolithic-btn">
              <Save className="mr-2 h-4 w-4 inline" /> Save Changes
            </button>
          </div>
        </motion.div>

        {/* Password */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="basalt-slab p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
          <h2 className="mb-6 font-bold text-lg uppercase tracking-tight flex items-center gap-3">
            <Lock className="h-5 w-5 text-accent" />
            Change Password
          </h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">New Password</Label>
              <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-muted border-none font-mono text-sm" placeholder="••••••••" />
            </div>
            <div className="space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Confirm Password</Label>
              <PasswordInput value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="bg-muted border-none font-mono text-sm" placeholder="••••••••" />
            </div>
            <button onClick={handleChangePassword} className="px-6 py-3 border border-border text-muted-foreground font-mono text-xs uppercase tracking-widest hover:text-foreground hover:border-foreground transition-colors">
              <Lock className="mr-2 h-4 w-4 inline" /> Update Password
            </button>
          </div>
        </motion.div>

        {/* Upgrade */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="basalt-slab p-6">
          <h2 className="mb-4 font-bold text-lg uppercase tracking-tight flex items-center gap-3">
            <Crown className="h-5 w-5 text-primary" />
            Upgrade Account
          </h2>
          <p className="font-mono text-xs text-muted-foreground mb-4">
            Current role: <span className="text-foreground font-bold uppercase">{user?.role}</span>
          </p>
          <div className="bg-muted p-4 border border-border">
            <p className="font-bold text-primary text-sm uppercase mb-3">Premium Features</p>
            <ul className="space-y-1.5 font-mono text-xs text-muted-foreground mb-4">
              <li>✓ Priority SOS response</li>
              <li>✓ Extended incident history</li>
              <li>✓ Advanced evidence storage</li>
              <li>✓ 24/7 dedicated support</li>
            </ul>
            <button className="px-4 py-2.5 border border-primary text-primary font-mono text-[10px] uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors">
              <Crown className="mr-2 h-3 w-3 inline" /> Upgrade to Premium
            </button>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="basalt-slab p-6 border-primary/30">
          <h2 className="mb-4 font-bold text-lg uppercase tracking-tight text-primary">Danger Zone</h2>
          <div className="space-y-3">
            <button onClick={handleLogout} className="w-full py-3 border border-border text-muted-foreground font-mono text-xs uppercase tracking-widest hover:text-foreground hover:border-foreground transition-colors text-left px-4">
              <LogOut className="mr-2 h-4 w-4 inline" /> Logout
            </button>
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 bg-primary/10 border border-primary/30 text-primary font-mono text-xs uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors text-left px-4">
                <Trash2 className="mr-2 h-4 w-4 inline" /> Delete Account
              </button>
            ) : (
              <div className="border border-primary p-4 space-y-3">
                <p className="font-mono text-xs text-primary font-bold uppercase">Are you sure? This action cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={handleDeleteAccount} className="px-4 py-2 bg-primary text-primary-foreground font-mono text-[10px] uppercase font-bold">Yes, Delete</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border border-border text-muted-foreground font-mono text-[10px] uppercase">Cancel</button>
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
