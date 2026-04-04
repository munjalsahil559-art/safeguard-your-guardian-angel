import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'user' | 'admin';

export interface User {
  email: string;
  role: UserRole;
  name: string;
}

export interface Evidence {
  type: 'photo' | 'video' | 'audio';
  dataUrl: string;
  timestamp: string;
}

export interface Incident {
  id: string;
  victimName: string;
  incidentType: string;
  latitude: number;
  longitude: number;
  time: string;
  description?: string;
  status: 'pending' | 'resolved';
  sosActive?: boolean;
  archived?: boolean;
  actionTaken?: string;
  reportedBy: string;
  evidence?: Evidence[];
}

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  signup: (name: string, email: string, password: string, role: UserRole) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

interface StoredUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('safeguard_session');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('safeguard_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('safeguard_session');
    }
  }, [user]);

  const getUsers = (): StoredUser[] => {
    const data = localStorage.getItem('safeguard_users');
    if (!data) {
      // seed admin
      const seed: StoredUser[] = [
        { name: 'Admin', email: 'admin@safeguard.com', password: 'admin123', role: 'admin' }
      ];
      localStorage.setItem('safeguard_users', JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(data);
  };

  const login = (email: string, password: string): boolean => {
    const users = getUsers();
    const found = users.find(u => u.email === email && u.password === password);
    if (found) {
      setUser({ email: found.email, role: found.role, name: found.name });
      return true;
    }
    return false;
  };

  const signup = (name: string, email: string, password: string, role: UserRole): boolean => {
    const users = getUsers();
    if (users.find(u => u.email === email)) return false;
    users.push({ name, email, password, role });
    localStorage.setItem('safeguard_users', JSON.stringify(users));
    setUser({ email, role, name });
    return true;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Incident helpers
export const getIncidents = (): Incident[] => {
  const data = localStorage.getItem('safeguard_incidents');
  return data ? JSON.parse(data) : [];
};

export const saveIncident = (incident: Incident) => {
  const incidents = getIncidents();
  incidents.push(incident);
  localStorage.setItem('safeguard_incidents', JSON.stringify(incidents));
};

export const updateIncident = (id: string, updates: Partial<Incident>) => {
  const incidents = getIncidents();
  const idx = incidents.findIndex(i => i.id === id);
  if (idx !== -1) {
    incidents[idx] = { ...incidents[idx], ...updates };
    localStorage.setItem('safeguard_incidents', JSON.stringify(incidents));
  }
};

// Contacts helpers
export const getContacts = (email: string): TrustedContact[] => {
  const data = localStorage.getItem(`safeguard_contacts_${email}`);
  return data ? JSON.parse(data) : [];
};

export const saveContact = (email: string, contact: TrustedContact) => {
  const contacts = getContacts(email);
  contacts.push(contact);
  localStorage.setItem(`safeguard_contacts_${email}`, JSON.stringify(contacts));
};

export const removeContact = (email: string, contactId: string) => {
  const contacts = getContacts(email).filter(c => c.id !== contactId);
  localStorage.setItem(`safeguard_contacts_${email}`, JSON.stringify(contacts));
};
