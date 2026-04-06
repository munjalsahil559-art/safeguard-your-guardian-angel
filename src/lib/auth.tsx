import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
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
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; needsVerification?: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.role as UserRole) || 'user';
}

async function fetchProfile(userId: string): Promise<{ name: string; email: string } | null> {
  const { data } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

async function buildUser(supabaseUser: SupabaseUser): Promise<User> {
  const [role, profile] = await Promise.all([
    fetchUserRole(supabaseUser.id),
    fetchProfile(supabaseUser.id),
  ]);
  return {
    id: supabaseUser.id,
    email: profile?.email || supabaseUser.email || '',
    role,
    name: profile?.name || supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || '',
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const appUser = await buildUser(session.user);
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const appUser = await buildUser(session.user);
        setUser(appUser);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  };

  const signup = async (name: string, email: string, password: string, role: UserRole): Promise<{ success: boolean; needsVerification?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { success: false };

    // If user needs email confirmation
    if (data.user && !data.session) {
      return { success: true, needsVerification: true };
    }

    // If auto-confirmed and role is admin, update role
    if (data.user && role === 'admin') {
      await supabase.from('user_roles').update({ role: 'admin' }).eq('user_id', data.user.id);
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Incident helpers using Supabase
export const getIncidents = async (): Promise<Incident[]> => {
  const { data } = await supabase
    .from('incidents')
    .select('*')
    .order('time', { ascending: false });
  if (!data) return [];
  return data.map(d => ({
    id: d.id,
    victimName: d.victim_name,
    incidentType: d.incident_type,
    latitude: d.latitude,
    longitude: d.longitude,
    time: d.time,
    description: d.description || undefined,
    status: d.status as 'pending' | 'resolved',
    sosActive: d.sos_active,
    archived: d.archived,
    actionTaken: d.action_taken || undefined,
    reportedBy: d.reported_by,
    evidence: (d.evidence as any) || undefined,
  }));
};

export const saveIncident = async (incident: Incident) => {
  await supabase.from('incidents').insert({
    id: incident.id,
    victim_name: incident.victimName,
    incident_type: incident.incidentType,
    latitude: incident.latitude,
    longitude: incident.longitude,
    time: incident.time,
    description: incident.description,
    status: incident.status,
    sos_active: incident.sosActive || false,
    reported_by: incident.reportedBy,
    evidence: incident.evidence ? JSON.parse(JSON.stringify(incident.evidence)) : [],
  });
};

export const updateIncident = async (id: string, updates: Partial<Incident>) => {
  const mapped: Record<string, any> = {};
  if (updates.status !== undefined) mapped.status = updates.status;
  if (updates.sosActive !== undefined) mapped.sos_active = updates.sosActive;
  if (updates.archived !== undefined) mapped.archived = updates.archived;
  if (updates.actionTaken !== undefined) mapped.action_taken = updates.actionTaken;
  await supabase.from('incidents').update(mapped).eq('id', id);
};

// Contacts helpers using Supabase
export const getContacts = async (userId: string): Promise<TrustedContact[]> => {
  const { data } = await supabase
    .from('trusted_contacts')
    .select('*')
    .eq('user_id', userId);
  return (data || []).map(c => ({ id: c.id, name: c.name, phone: c.phone }));
};

export const saveContact = async (userId: string, contact: TrustedContact) => {
  await supabase.from('trusted_contacts').insert({
    id: contact.id,
    user_id: userId,
    name: contact.name,
    phone: contact.phone,
  });
};

export const removeContact = async (userId: string, contactId: string) => {
  await supabase.from('trusted_contacts').delete().eq('id', contactId).eq('user_id', userId);
};
