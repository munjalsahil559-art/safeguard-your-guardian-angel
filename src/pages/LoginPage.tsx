import React, { useState } from 'react';
import { useAuth, UserRole } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PasswordInput from '@/components/PasswordInput';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, AlertTriangle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

const LoginPage = () => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');

  // OTP state
  const [otpStep, setOtpStep] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const success = login(email, password);
      if (success) {
        const session = JSON.parse(localStorage.getItem('safeguard_session')!);
        navigate(session.role === 'admin' ? '/admin' : '/dashboard');
        toast.success('Welcome back!');
      } else {
        toast.error('Invalid credentials');
      }
    } else {
      if (!name.trim()) { toast.error('Name is required'); return; }
      if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
      
      // Generate OTP and show verification step
      const otp = generateOTP();
      setGeneratedOtp(otp);
      setOtpStep(true);
      // In a real app this would be sent via email API
      toast.success(`📧 OTP sent to ${email}`, { description: `Demo OTP: ${otp}`, duration: 10000 });
    }
  };

  const handleVerifyOtp = () => {
    if (enteredOtp !== generatedOtp) {
      toast.error('Invalid OTP. Please try again.');
      return;
    }
    const success = signup(name, email, password, role);
    if (success) {
      navigate(role === 'admin' ? '/admin' : '/dashboard');
      toast.success('Account verified & created!');
    } else {
      toast.error('Email already exists');
      setOtpStep(false);
    }
  };

  const handleResendOtp = () => {
    const otp = generateOTP();
    setGeneratedOtp(otp);
    setEnteredOtp('');
    toast.success(`📧 New OTP sent!`, { description: `Demo OTP: ${otp}`, duration: 10000 });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl emergency-gradient emergency-glow">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Safe<span className="text-primary">Guard</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Emergency SOS System</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
          <AnimatePresence mode="wait">
            {otpStep ? (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold">Verify Your Email</h2>
                  <p className="text-sm text-muted-foreground mt-1">Enter the 6-digit OTP sent to <span className="font-medium text-foreground">{email}</span></p>
                </div>

                <div className="flex justify-center mb-6">
                  <InputOTP maxLength={6} value={enteredOtp} onChange={setEnteredOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button onClick={handleVerifyOtp} className="w-full emergency-gradient text-primary-foreground font-semibold mb-3" disabled={enteredOtp.length !== 6}>
                  Verify & Create Account
                </Button>
                <div className="flex justify-between">
                  <Button variant="ghost" size="sm" onClick={() => { setOtpStep(false); setEnteredOtp(''); }}>
                    ← Back
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleResendOtp}>
                    Resend OTP
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="mb-6 flex rounded-lg bg-secondary p-1">
                  <button
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 rounded-md py-2 text-sm font-semibold transition-all ${isLogin ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 rounded-md py-2 text-sm font-semibold transition-all ${!isLogin ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    Sign Up
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="mt-1" />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="mt-1" />
                  </div>
                  {!isLogin && (
                    <div>
                      <Label>Role</Label>
                      <div className="mt-1 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRole('user')}
                          className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${role === 'user' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                        >
                          User
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('admin')}
                          className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${role === 'admin' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                        >
                          Admin
                        </button>
                      </div>
                    </div>
                  )}
                  <Button type="submit" className="w-full emergency-gradient text-primary-foreground font-semibold">
                    {isLogin ? 'Login' : 'Send OTP & Verify'}
                  </Button>
                </form>

                {isLogin && (
                  <div className="mt-4 rounded-lg bg-muted p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Demo admin: admin@safeguard.com / admin123</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
