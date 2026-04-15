import React, { useState, useEffect } from 'react';
import { getIncidents, updateIncident, Incident } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';
import IncidentMap from '@/components/IncidentMap';
import EvidenceViewer from '@/components/EvidenceViewer';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Shield, MapPin, CheckCircle, Clock, FileText, AlertTriangle, Map, Eye, ShieldAlert, ShieldCheck, Volume2, VolumeX, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ACTION_OPTIONS = [
  'Police dispatched to location',
  'Ambulance sent to victim',
  'Contacted victim via phone',
  'Sent security team to location',
  'Filed official report with authorities',
  'Contacted emergency services (112)',
  'False alarm — no action needed',
  'Victim rescued successfully',
];

const detectFakeScore = (incident: Incident): { score: number; label: string; reasons: string[] } => {
  const reasons: string[] = [];
  let score = 70;
  if (incident.latitude === 28.6139 && incident.longitude === 77.2090) { score -= 25; reasons.push('Default location detected'); }
  if (incident.evidence && incident.evidence.length > 0) { score += 15; reasons.push(`${incident.evidence.length} evidence item(s) attached`); }
  else { score -= 10; reasons.push('No evidence provided'); }
  if (incident.incidentType === 'Medical' || incident.incidentType === 'Harassment') { score += 5; reasons.push('High-priority incident type'); }
  score = Math.max(10, Math.min(100, score));
  const label = score >= 70 ? 'Likely Genuine' : score >= 45 ? 'Needs Verification' : 'Possibly Fake';
  return { score, label, reasons };
};

let adminSiren: HTMLAudioElement | null = null;

const AdminDashboard = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [actionInputs, setActionInputs] = useState<Record<string, string>>({});
  const [showMap, setShowMap] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [prevCount, setPrevCount] = useState(0);
  const [adminSirenPlaying, setAdminSirenPlaying] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const stopAdminSiren = () => {
    if (adminSiren) { adminSiren.pause(); adminSiren.currentTime = 0; adminSiren = null; }
    setAdminSirenPlaying(false);
  };

  useEffect(() => {
    const load = async () => {
      const loaded = await getIncidents();
      const hasActiveSOS = loaded.some(i => i.sosActive);

      if (hasActiveSOS && !adminSirenPlaying) {
        try {
          adminSiren = new Audio('/siren.mp3');
          adminSiren.loop = true;
          adminSiren.play();
          setAdminSirenPlaying(true);
        } catch {}
      } else if (!hasActiveSOS && adminSirenPlaying) {
        stopAdminSiren();
      }

      if (loaded.length > prevCount && prevCount > 0) {
        const newOnes = loaded.slice(0, loaded.length - prevCount);
        newOnes.forEach(inc => {
          toast.warning(`🚨 New SOS from ${inc.victimName}!`, { duration: 5000 });
        });
      }
      setPrevCount(loaded.length);
      setIncidents(loaded);
    };
    load();
    const interval = setInterval(load, 3000);
    return () => {
      clearInterval(interval);
      stopAdminSiren();
    };
  }, [prevCount, adminSirenPlaying]);

  const handleResolve = async (id: string) => {
    const action = actionInputs[id]?.trim();
    if (!action) { toast.error('Select an action'); return; }
    await updateIncident(id, { status: 'resolved', actionTaken: action, sosActive: false });
    setIncidents(await getIncidents());
    toast.success('Incident resolved');
  };

  const handleMapIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident);
    const el = document.getElementById(`incident-${incident.id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleArchive = async (id: string) => {
    await updateIncident(id, { archived: true, sosActive: false });
    setIncidents(await getIncidents());
    toast.success('Incident archived');
  };

  const handleRestore = async (id: string) => {
    await updateIncident(id, { archived: false });
    setIncidents(await getIncidents());
    toast.success('Incident restored');
  };

  const generatePDF = (incident: Incident) => {
    const doc = new jsPDF();
    const detection = detectFakeScore(incident);
    doc.setFontSize(20);
    doc.setTextColor(220, 50, 50);
    doc.text('SafeGuard - Incident Report', 20, 25);
    doc.setDrawColor(220, 50, 50);
    doc.line(20, 30, 190, 30);
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    const y = 45;
    const lines = [
      `Report ID: ${incident.id.slice(0, 8)}`,
      `Victim Name: ${incident.victimName}`,
      `Incident Type: ${incident.incidentType}`,
      `Location: ${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`,
      `Time: ${new Date(incident.time).toLocaleString()}`,
      `Status: ${incident.status.toUpperCase()}`,
      `Reported By: ${incident.reportedBy}`,
      `Action Taken: ${incident.actionTaken || 'N/A'}`,
      `Authenticity: ${detection.label} (${detection.score}%)`,
      `Evidence Count: ${incident.evidence?.length || 0}`,
    ];
    lines.forEach((line, i) => doc.text(line, 20, y + i * 10));
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleString()} by SafeGuard`, 20, 280);
    doc.save(`safeguard-report-${incident.id.slice(0, 8)}.pdf`);
    toast.success('PDF downloaded');
  };

  const activeIncidents = incidents.filter(i => !i.archived);
  const archivedIncidents = incidents.filter(i => i.archived);
  const pending = activeIncidents.filter(i => i.status === 'pending');
  const resolved = activeIncidents.filter(i => i.status === 'resolved');

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: activeIncidents.length, icon: Shield, color: 'text-foreground' },
            { label: 'Pending', value: pending.length, icon: Clock, color: 'text-warning' },
            { label: 'Resolved', value: resolved.length, icon: CheckCircle, color: 'text-success' },
            { label: 'Archived', value: archivedIncidents.length, icon: Archive, color: 'text-muted-foreground' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => stat.label === 'Archived' && setShowArchived(!showArchived)}>
              <stat.icon className={`mx-auto mb-1 h-5 w-5 ${stat.color}`} />
              <p className="text-2xl font-extrabold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Active SOS Siren Banner */}
        {adminSirenPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border-2 border-destructive bg-destructive/10 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Volume2 className="h-6 w-6 text-destructive animate-pulse" />
              <div>
                <p className="font-bold text-destructive">🚨 Active SOS Alert!</p>
                <p className="text-xs text-muted-foreground">
                  {incidents.filter(i => i.sosActive).length} active emergency alert(s) — siren playing
                </p>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={stopAdminSiren}>
              <VolumeX className="mr-1 h-4 w-4" /> Mute Siren
            </Button>
          </motion.div>
        )}

        {/* Map */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Map className="h-5 w-5 text-primary" />
              Live Incident Map
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowMap(!showMap)} className="text-xs">
              <Eye className="mr-1 h-3 w-3" /> {showMap ? 'Hide' : 'Show'}
            </Button>
          </div>
          {showMap && activeIncidents.length > 0 && <IncidentMap incidents={activeIncidents} onIncidentClick={handleMapIncidentClick} />}
          {showMap && activeIncidents.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No incidents to display on map
            </div>
          )}
        </div>

        {/* Incidents */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Active Incidents
          </h2>

          {activeIncidents.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Shield className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No active incidents</p>
            </div>
          )}

          <div className="space-y-3">
            {activeIncidents.map((incident, idx) => {
              const detection = detectFakeScore(incident);
              return (
                <motion.div
                  key={incident.id}
                  id={`incident-${incident.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-xl border p-4 ${
                    incident.sosActive
                      ? 'border-destructive bg-destructive/5 ring-2 ring-destructive/30 animate-pulse'
                      : selectedIncident?.id === incident.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold">{incident.victimName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(incident.time).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {incident.sosActive && (
                        <span className="flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground animate-pulse">
                          🚨 ACTIVE SOS
                        </span>
                      )}
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        detection.score >= 70
                          ? 'bg-success/15 text-success'
                          : detection.score >= 45
                          ? 'bg-warning/15 text-warning'
                          : 'bg-destructive/15 text-destructive'
                      }`}>
                        {detection.score >= 70 ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                        {detection.label}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        incident.status === 'resolved'
                          ? 'bg-success/15 text-success'
                          : 'bg-warning/15 text-warning'
                      }`}>
                        {incident.status}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1">
                    {detection.reasons.map((r, i) => (
                      <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{r}</span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="rounded-lg bg-muted p-2">
                      <span className="text-xs text-muted-foreground">Type</span>
                      <p className="font-medium">{incident.incidentType}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2">
                      <span className="text-xs text-muted-foreground">Location</span>
                      <a
                        href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                      >
                        <MapPin className="h-3 w-3" />
                        {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
                      </a>
                    </div>
                  </div>

                  {incident.evidence && incident.evidence.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs font-semibold text-muted-foreground">Evidence ({incident.evidence.length})</span>
                      <EvidenceViewer evidence={incident.evidence} />
                    </div>
                  )}

                  {incident.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Select
                        value={actionInputs[incident.id] || ''}
                        onValueChange={val => setActionInputs(prev => ({ ...prev, [incident.id]: val }))}
                      >
                        <SelectTrigger className="flex-1 text-xs">
                          <SelectValue placeholder="Select action..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={() => handleResolve(incident.id)} size="sm" className="bg-success text-success-foreground hover:bg-success/90">
                        Resolve
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleArchive(incident.id)} title="Archive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="rounded-lg bg-success/10 px-3 py-1.5 text-xs text-success">
                        ✓ {incident.actionTaken}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => generatePDF(incident)} className="text-xs">
                          <FileText className="mr-1 h-3 w-3" /> PDF
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleArchive(incident.id)} title="Archive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Archived Incidents */}
        {showArchived && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <Archive className="h-5 w-5 text-muted-foreground" />
              Archived Incidents
              <span className="text-xs font-normal text-muted-foreground">({archivedIncidents.length})</span>
            </h2>

            {archivedIncidents.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <Archive className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No archived incidents</p>
              </div>
            )}

            <div className="space-y-3">
              {archivedIncidents.map((incident, idx) => (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-xl border border-dashed border-border bg-muted/30 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{incident.victimName}</p>
                      <p className="text-xs text-muted-foreground">{incident.incidentType} • {new Date(incident.time).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleRestore(incident.id)}>
                        <ArchiveRestore className="mr-1 h-3 w-3" /> Restore
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => generatePDF(incident)}>
                        <FileText className="mr-1 h-3 w-3" /> PDF
                      </Button>
                    </div>
                  </div>
                  {incident.actionTaken && (
                    <p className="text-xs text-muted-foreground">Action: {incident.actionTaken}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
