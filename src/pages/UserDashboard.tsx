import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, saveIncident, Incident, Evidence, getContacts, saveContact, removeContact, TrustedContact } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';
import EvidenceCapture from '@/components/EvidenceCapture';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, MapPin, Phone, Plus, Trash2, Navigation, User, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useShakeDetection } from '@/hooks/useShakeDetection';

const INCIDENT_TYPES = ['Harassment', 'Accident', 'Medical', 'Other'];

let sirenAudio: HTMLAudioElement | null = null;

const playSOSAlarm = () => {
  try {
    if (sirenAudio) { sirenAudio.pause(); sirenAudio.currentTime = 0; }
    sirenAudio = new Audio('/siren.mp3');
    sirenAudio.loop = true;
    sirenAudio.play();
  } catch {}
};

const stopSOSAlarm = () => {
  if (sirenAudio) { sirenAudio.pause(); sirenAudio.currentTime = 0; sirenAudio = null; }
};

const sendAutoSOS = (contacts: TrustedContact[], victimName: string, location: { lat: number; lng: number } | null) => {
  if (contacts.length === 0) return;
  const mapLink = location
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
    : '';
  const message = `🚨 EMERGENCY SOS from SafeGuard!\n${victimName} needs help!\nLocation: ${mapLink}`;

  contacts.forEach(c => {
    // Open SMS with pre-filled message for each contact
    const smsUrl = `sms:${c.phone}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
  });

  toast.success(`📱 Auto SOS sent to ${contacts.length} contact(s)`);
};

const UserDashboard = () => {
  const { user } = useAuth();
  const [victimName, setVictimName] = useState('');
  const [description, setDescription] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [shakeEnabled, setShakeEnabled] = useState(true);

  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  useEffect(() => {
    if (user) setContacts(getContacts(user.email));
  }, [user]);

  const getLocation = useCallback(() => {
    setLocLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocLoading(false);
          toast.success('Location detected');
        },
        () => {
          setLocation({ lat: 28.6139, lng: 77.2090 });
          setLocLoading(false);
          toast.info('Using default location');
        }
      );
    } else {
      setLocation({ lat: 28.6139, lng: 77.2090 });
      setLocLoading(false);
    }
  }, []);

  useEffect(() => { getLocation(); }, [getLocation]);

  const openMap = () => {
    if (!location) return;
    window.open(`https://www.google.com/maps?q=${location.lat},${location.lng}`, '_blank', 'noopener,noreferrer');
  };

  const triggerSOS = useCallback(() => {
    const name = victimName.trim() || user?.name || 'Unknown';
    const type = incidentType || 'Other';

    playSOSAlarm();
    setSosActive(true);

    const incident: Incident = {
      id: crypto.randomUUID(),
      victimName: name,
      incidentType: type,
      description: description.trim() || undefined,
      latitude: location?.lat || 28.6139,
      longitude: location?.lng || 77.2090,
      time: new Date().toISOString(),
      status: 'pending',
      reportedBy: user?.email || '',
      evidence: evidence.length > 0 ? evidence : undefined,
    };
    saveIncident(incident);

    // Auto SOS to contacts
    const currentContacts = user ? getContacts(user.email) : [];
    sendAutoSOS(currentContacts, name, location);

    toast.success('🚨 SOS Alert Sent!');
    setTimeout(() => setSosActive(false), 2000);
    setVictimName('');
    setDescription('');
    setIncidentType('');
    setEvidence([]);
  }, [victimName, description, incidentType, location, user, evidence]);

  // Shake to trigger SOS
  useShakeDetection(() => {
    if (shakeEnabled) {
      toast.warning('📳 Shake detected! Triggering SOS...');
      triggerSOS();
    }
  });

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) { toast.error('Fill contact details'); return; }
    const contact: TrustedContact = { id: crypto.randomUUID(), name: newContactName.trim(), phone: newContactPhone.trim() };
    saveContact(user!.email, contact);
    setContacts(prev => [...prev, contact]);
    setNewContactName('');
    setNewContactPhone('');
    toast.success('Contact added');
  };

  const handleRemoveContact = (id: string) => {
    removeContact(user!.email, id);
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const addEvidence = (ev: Evidence) => setEvidence(prev => [...prev, ev]);
  const removeEvidence = (idx: number) => setEvidence(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* SOS Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Emergency SOS
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="victim">Victim Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="victim" value={victimName} onChange={e => setVictimName(e.target.value)} placeholder="Enter name" className="pl-9" />
              </div>
            </div>

            <div>
              <Label>Incident Type</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {INCIDENT_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setIncidentType(type)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${incidentType === type ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                  >
                    {type}
                  </button>
                ))}
            </div>

            <div>
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the situation..." className="mt-1" rows={3} />
            </div>
            </div>

            {/* Location */}
            <div className="rounded-lg bg-muted p-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  {locLoading ? (
                    <span className="text-muted-foreground">Detecting...</span>
                  ) : location ? (
                    <span className="font-mono text-xs">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                  ) : (
                    <span className="text-muted-foreground">No location</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={getLocation} className="h-7 text-xs">
                    <Navigation className="mr-1 h-3 w-3" /> Refresh
                  </Button>
                  {location && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={openMap}>
                      <MapPin className="mr-1 h-3 w-3" /> Open Map
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Evidence Capture */}
            <EvidenceCapture evidence={evidence} onAdd={addEvidence} onRemove={removeEvidence} />

            {/* Shake toggle */}
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4 text-primary" />
                <span className="font-medium">Shake to trigger SOS</span>
              </div>
              <button
                onClick={() => setShakeEnabled(!shakeEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${shakeEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-primary-foreground transition-transform ${shakeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* SOS Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={triggerSOS}
              className={`w-full rounded-xl py-4 text-lg font-extrabold text-primary-foreground emergency-gradient transition-all ${sosActive ? 'emergency-pulse emergency-glow' : 'hover:emergency-glow'}`}
            >
              {sosActive ? '🚨 ALERT SENT!' : '🆘 SEND SOS'}
            </motion.button>
          </div>
        </motion.div>

        {/* Trusted Contacts */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Phone className="h-5 w-5 text-primary" />
            Trusted Contacts
            <span className="text-xs font-normal text-muted-foreground ml-1">(Auto-notified on SOS)</span>
          </h2>

          <div className="mb-4 flex gap-2">
            <Input placeholder="Name" value={newContactName} onChange={e => setNewContactName(e.target.value)} className="flex-1" />
            <Input placeholder="Phone" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} className="flex-1" />
            <Button onClick={handleAddContact} size="icon" className="emergency-gradient text-primary-foreground shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <AnimatePresence>
            {contacts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No contacts yet</p>
            )}
            {contacts.map(c => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between rounded-lg border border-border p-3 mb-2"
              >
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{c.phone}</p>
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${c.phone}`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <Phone className="mr-1 h-3 w-3" /> Call
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveContact(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
};

export default UserDashboard;
