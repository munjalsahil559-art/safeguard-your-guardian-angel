import React from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Shield, Moon, Sun, LogOut, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

const AppHeader = () => {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg emergency-gradient">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">
            Safe<span className="text-primary">Guard</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.name} ({user.role})
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-9 w-9"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user && (
            <Button variant="ghost" size="icon" onClick={logout} className="h-9 w-9">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
