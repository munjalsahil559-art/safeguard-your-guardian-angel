import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, saveIncident, updateIncident, Incident, Evidence, getContacts, saveContact, removeContact, TrustedContact } from '@/lib/auth';
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
    if (user) {
      getContacts(user.id).then(setContacts);
    }
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

  const handleSOSClick = useCallback(async () => {
    if (sirenPlaying) {
      stopSOSAlarm();
      setSirenPlaying(false);
      const activeId = localStorage.getItem('safeguard_active_sos');
      if (activeId) {
        await updateIncident(activeId, { sosActive: false });
        localStorage.removeItem('safeguard_active_sos');
      }
      toast.info('🔇 Siren stopped');
      return;
    }

    const name = victimName.trim() || user?.name || 'Unknown';
    const type = incidentType || 'Other';

    playSOSAlarm();
    setSirenPlaying(true);
    setSosActive(true);

    const incidentId = crypto.randomUUID();
    const incident: Incident = {
      id: incidentId,
      victimName: name,
      incidentType: type,
      description: description.trim() || undefined,
      latitude: location?.lat || 28.6139,
      longitude: location?.lng || 77.2090,
      time: new Date().toISOString(),
      status: 'pending',
      sosActive: true,
      reportedBy: user?.id || '',
      evidence: evidence.length > 0 ? evidence : undefined,
    };
    await saveIncident(incident);

    localStorage.setItem('safeguard_active_sos', incidentId);

    const currentContacts = user ? await getContacts(user.id) : [];
    sendAutoSOS(currentContacts, name, location);

    toast.success('🚨 SOS Alert Sent! Tap again to stop siren.');
    setTimeout(() => setSosActive(false), 2000);
    setVictimName('');
    setDescription('');
    setIncidentType('');
    setEvidence([]);
  }, [victimName, description, incidentType, location, user, evidence, sirenPlaying]);

  useShakeDetection(() => {
    if (shakeEnabled) {
      toast.warning('📳 Shake detected! Triggering SOS...');
      handleSOSClick();
    }
  });

  const handleAddContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) { toast.error('Fill contact details'); return; }
    const contact: TrustedContact = { id: crypto.randomUUID(), name: newContactName.trim(), phone: newContactPhone.trim() };
    await saveContact(user!.id, contact);
    setContacts(prev => [...prev, contact]);
    setNewContactName('');
    setNewContactPhone('');
    toast.success('Contact added');
  };

  const handleRemoveContact = async (id: string) => {
    await removeContact(user!.id, id);
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const addEvidence = (ev: Evidence) => setEvidence(prev => [...prev, ev]);
  const removeEvidence = (idx: number) => setEvidence(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* SOS Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="basalt-slab p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />

          <h2 className="mb-6 font-bold text-xl uppercase tracking-tight flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Emergency SOS
          </h2>

          <div className="space-y-5">
            <div className="space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Victim Name</Label>
              <Input
                value={victimName}
                onChange={e => setVictimName(e.target.value)}
                placeholder="Enter name"
                className="bg-muted border-none font-mono text-sm focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Incident Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {INCIDENT_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setIncidentType(type)}
                    className={`py-2.5 font-mono text-xs uppercase tracking-widest border transition-colors ${incidentType === type ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Description (Optional)</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the situation..."
                className="bg-muted border-none font-mono text-sm focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="bg-muted p-3 border border-border">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {locLoading ? (
                    <span className="font-mono text-xs text-muted-foreground">Detecting...</span>
                  ) : location ? (
                    <span className="font-mono text-xs">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">No location</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={getLocation} className="font-mono text-[10px] uppercase text-muted-foreground hover:text-foreground transition-colors">
                    <Navigation className="mr-1 h-3 w-3 inline" /> Refresh
                  </button>
                  {location && (
                    <button onClick={openMap} className="font-mono text-[10px] uppercase text-muted-foreground hover:text-foreground transition-colors">
                      <MapPin className="mr-1 h-3 w-3 inline" /> Map
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Evidence */}
            <EvidenceCapture evidence={evidence} onAdd={addEvidence} onRemove={removeEvidence} />

            {/* Shake toggle */}
            <div className="bg-muted p-3 border border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <span className="font-mono text-xs uppercase">Shake to trigger SOS</span>
              </div>
              <button
                onClick={() => setShakeEnabled(!shakeEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${shakeEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-background transition-transform ${shakeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* SOS Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSOSClick}
              className={`w-full py-5 font-bold text-sm uppercase tracking-widest font-mono transition-all ${
                sosActive
                  ? 'bg-primary text-primary-foreground emergency-pulse emergency-glow'
                  : sirenPlaying
                  ? 'bg-destructive text-destructive-foreground emergency-glow'
                  : 'bg-foreground text-background monolithic-btn'
              }`}
            >
              {sosActive ? '🚨 ALERT SENT!' : sirenPlaying ? '🔇 TAP TO STOP SIREN' : '🆘 SEND SOS'}
            </motion.button>
          </div>
        </motion.div>

        {/* Trusted Contacts */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="basalt-slab p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-accent" />

          <h2 className="mb-4 font-bold text-lg uppercase tracking-tight flex items-center gap-3">
            <Phone className="h-5 w-5 text-accent" />
            Trusted Contacts
            <span className="font-mono text-[10px] font-normal text-muted-foreground ml-1">(Auto-notified on SOS)</span>
          </h2>

          <div className="mb-4 flex gap-2">
            <Input
              placeholder="Name"
              value={newContactName}
              onChange={e => setNewContactName(e.target.value)}
              className="flex-1 bg-muted border-none font-mono text-sm placeholder:text-muted-foreground"
            />
            <Input
              placeholder="Phone"
              value={newContactPhone}
              onChange={e => setNewContactPhone(e.target.value)}
              className="flex-1 bg-muted border-none font-mono text-sm placeholder:text-muted-foreground"
            />
            <button
              onClick={handleAddContact}
              className="px-4 bg-accent text-accent-foreground font-mono text-xs uppercase font-bold hover:bg-accent/80 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <AnimatePresence>
            {contacts.length === 0 && (
              <p className="font-mono text-xs text-muted-foreground text-center py-6 uppercase">No contacts yet</p>
            )}
            {contacts.map(c => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between border border-border p-3 mb-2"
              >
                <div>
                  <p className="text-sm font-semibold uppercase">{c.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{c.phone}</p>
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${c.phone}`}>
                    <button className="px-2 py-1 border border-border text-muted-foreground font-mono text-[10px] uppercase hover:text-foreground transition-colors">
                      <Phone className="mr-1 h-3 w-3 inline" /> Call
                    </button>
                  </a>
                  <button
                    onClick={() => handleRemoveContact(c.id)}
                    className="px-2 py-1 border border-border text-muted-foreground font-mono text-[10px] uppercase hover:text-primary transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
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
