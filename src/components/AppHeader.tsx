import React from 'react';
import { useAuth } from '@/lib/auth';
import { LogOut, History, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

const AppHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="h-14 border-b border-border bg-card shrink-0">
      <div className="container mx-auto flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary" />
            <span className="font-mono text-sm font-semibold tracking-tighter uppercase">
              SafeGuard
            </span>
          </div>

          {user && user.role === 'user' && (
            <>
              <div className="h-4 w-px bg-border" />
              <nav className="flex gap-6">
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`font-mono text-xs uppercase tracking-widest transition-colors ${location.pathname === '/dashboard' ? 'text-foreground border-b border-primary py-4' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  SOS
                </button>
                <button
                  onClick={() => navigate('/history')}
                  className={`font-mono text-xs uppercase tracking-widest transition-colors ${location.pathname === '/history' ? 'text-foreground border-b border-primary py-4' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  History
                </button>
                <button
                  onClick={() => navigate('/account')}
                  className={`font-mono text-xs uppercase tracking-widest transition-colors ${location.pathname === '/account' ? 'text-foreground border-b border-primary py-4' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Account
                </button>
              </nav>
            </>
          )}

          {user && user.role === 'admin' && (
            <>
              <div className="h-4 w-px bg-border" />
              <span className="font-mono text-xs text-primary uppercase tracking-widest">
                Command Center
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-6">
          {user && (
            <div className="flex flex-col items-end">
              <span className="font-mono text-[10px] text-muted-foreground uppercase">
                {user.role}
              </span>
              <span className="font-mono text-xs text-foreground">
                {user.name}
              </span>
            </div>
          )}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
