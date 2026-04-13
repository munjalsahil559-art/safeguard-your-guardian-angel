import React, { useState, useEffect } from 'react';
import { getIncidents, updateIncident, Incident } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';
import IncidentMap from '@/components/IncidentMap';
import EvidenceViewer from '@/components/EvidenceViewer';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Shield, MapPin, CheckCircle, Clock, FileText, AlertTriangle, Map, Eye, Volume2, VolumeX, Archive, ArchiveRestore, Trash2, List, X } from 'lucide-react';
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
  const [mobileShowList, setMobileShowList] = useState(false);

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
    doc.setTextColor(255, 60, 0);
    doc.text('SafeGuard - Incident Report', 20, 25);
    doc.setDrawColor(255, 60, 0);
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
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 flex flex-col">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border">
          {[
            { label: 'Total', value: activeIncidents.length, color: '' },
            { label: 'Pending', value: pending.length, color: 'text-primary' },
            { label: 'Resolved', value: resolved.length, color: 'text-accent' },
            { label: 'Archived', value: archivedIncidents.length, color: 'text-muted-foreground', clickable: true },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`p-4 md:p-6 border-b md:border-b-0 ${i % 2 === 0 ? 'border-r border-border' : ''} md:border-r md:border-border md:last:border-r-0 ${stat.clickable ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
              onClick={() => stat.clickable && setShowArchived(!showArchived)}
            >
              <p className="font-mono text-[10px] text-muted-foreground uppercase mb-1 tracking-widest">
                {stat.label}
              </p>
              <p className={`text-2xl md:text-3xl font-bold font-mono tracking-tighter ${stat.color}`}>
                {String(stat.value).padStart(2, '0')}
              </p>
            </div>
          ))}
        </div>

        {/* SOS Alert Banner */}
        {adminSirenPlaying && (
          <div className="border-b border-primary bg-primary/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-primary animate-pulse" />
              <div>
                <p className="font-bold text-primary font-mono text-sm uppercase">Active SOS Alert</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {incidents.filter(i => i.sosActive).length} active emergency alert(s)
                </p>
              </div>
            </div>
            <button
              onClick={stopAdminSiren}
              className="px-3 py-1.5 bg-primary text-primary-foreground font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-primary/80 transition-colors"
            >
              <VolumeX className="mr-1 h-3 w-3 inline" /> Mute
            </button>
          </div>
        )}

        {/* Mobile Incident List Toggle */}
        <div className="md:hidden border-b border-border p-3 flex justify-between items-center bg-muted/30">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {mobileShowList ? 'Incidents' : (selectedIncident ? selectedIncident.victimName : 'Select Incident')}
          </span>
          <button
            onClick={() => setMobileShowList(!mobileShowList)}
            className="px-3 py-1.5 border border-border font-mono text-[10px] uppercase text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {mobileShowList ? <><X className="h-3 w-3" /> Close</> : <><List className="h-3 w-3" /> List ({activeIncidents.length})</>}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:grid md:grid-cols-12 overflow-hidden">
          {/* Left: Incident List */}
          <aside className={`${mobileShowList ? 'block' : 'hidden'} md:block md:col-span-4 xl:col-span-3 border-r border-border overflow-y-auto flex flex-col`}>
            <div className="hidden md:flex p-4 border-b border-border justify-between items-center bg-muted/30">
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Active Incidents
              </span>
              {pending.length > 0 && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary font-mono text-[10px] border border-primary/20">
                  {pending.length} PENDING
                </span>
              )}
            </div>

            {activeIncidents.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Shield className="h-8 w-8 mb-2 opacity-30" />
                <p className="font-mono text-xs uppercase">No active incidents</p>
              </div>
            )}

            <div className="flex-1 divide-y divide-border">
              {activeIncidents.map((incident, idx) => {
                const detection = detectFakeScore(incident);
                const isSelected = selectedIncident?.id === incident.id;
                return (
                  <motion.div
                    key={incident.id}
                    id={`incident-${incident.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => { setSelectedIncident(incident); setMobileShowList(false); }}
                    className={`p-4 cursor-pointer transition-colors ${
                      incident.sosActive
                        ? 'bg-primary/5 border-l-2 border-l-primary'
                        : isSelected
                        ? 'bg-muted/50 border-l-2 border-l-accent'
                        : 'hover:bg-muted/30 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between mb-2">
                      <span className={`font-mono text-[10px] uppercase ${
                        incident.sosActive ? 'text-primary' : incident.status === 'resolved' ? 'text-accent' : 'text-muted-foreground'
                      }`}>
                        {incident.sosActive ? 'SOS_ACTIVE' : incident.status === 'resolved' ? 'RESOLVED' : 'PENDING'}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(incident.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium mb-1 uppercase tracking-tight">{incident.victimName}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{incident.incidentType} — {incident.description || 'No description'}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 font-mono text-[9px] uppercase border ${
                        detection.score >= 70 ? 'border-accent/30 text-accent' : detection.score >= 45 ? 'border-primary/30 text-primary' : 'border-destructive/30 text-destructive'
                      }`}>
                        {detection.label}
                      </span>
                      {incident.evidence && incident.evidence.length > 0 && (
                        <span className="px-2 py-0.5 bg-muted font-mono text-[9px] text-muted-foreground uppercase">
                          {incident.evidence.length} Evidence
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </aside>

          {/* Right: Map + Detail */}
          <div className={`${mobileShowList ? 'hidden' : 'flex'} md:flex col-span-8 xl:col-span-9 flex-col bg-background overflow-y-auto`}>
            {/* Map */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    Live Feed // Incident Map
                  </span>
                </div>
                <button
                  onClick={() => setShowMap(!showMap)}
                  className="font-mono text-[10px] text-muted-foreground uppercase hover:text-foreground transition-colors"
                >
                  {showMap ? 'Hide Map' : 'Show Map'}
                </button>
              </div>
              {showMap && activeIncidents.length > 0 && (
                <div className="basalt-slab overflow-hidden">
                  <IncidentMap incidents={activeIncidents} onIncidentClick={handleMapIncidentClick} />
                </div>
              )}
              {showMap && activeIncidents.length === 0 && (
                <div className="basalt-slab p-12 text-center">
                  <p className="font-mono text-xs text-muted-foreground uppercase">No incidents to display</p>
                </div>
              )}
            </div>

            {/* Selected Incident Detail */}
            {selectedIncident && (
              <div className="px-6 pb-6">
                <div className="basalt-slab p-6 relative">
                  {selectedIncident.sosActive && (
                    <div className="absolute top-0 right-0 px-3 py-1.5 bg-primary text-primary-foreground font-mono text-[10px] font-bold uppercase">
                      🚨 SOS Active
                    </div>
                  )}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold uppercase tracking-tight">{selectedIncident.victimName}</h3>
                    <p className="font-mono text-xs text-muted-foreground">{selectedIncident.incidentType} • {new Date(selectedIncident.time).toLocaleString()}</p>
                  </div>

                  {selectedIncident.description && (
                    <p className="text-sm text-muted-foreground mb-4 bg-muted p-3 border border-border">
                      {selectedIncident.description}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="bg-muted p-3 border border-border">
                      <p className="font-mono text-[10px] text-muted-foreground uppercase mb-1">Location</p>
                      <a
                        href={`https://www.google.com/maps?q=${selectedIncident.latitude},${selectedIncident.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3" />
                        {selectedIncident.latitude.toFixed(4)}, {selectedIncident.longitude.toFixed(4)}
                      </a>
                    </div>
                    <div className="bg-muted p-3 border border-border">
                      <p className="font-mono text-[10px] text-muted-foreground uppercase mb-1">Authenticity</p>
                      {(() => {
                        const d = detectFakeScore(selectedIncident);
                        return (
                          <span className={`font-mono text-xs font-bold ${d.score >= 70 ? 'text-accent' : d.score >= 45 ? 'text-primary' : 'text-destructive'}`}>
                            {d.label} ({d.score}%)
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Authenticity reasons */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {detectFakeScore(selectedIncident).reasons.map((r, i) => (
                      <span key={i} className="px-2 py-0.5 bg-muted font-mono text-[9px] text-muted-foreground uppercase border border-border">{r}</span>
                    ))}
                  </div>

                  {/* Evidence */}
                  {selectedIncident.evidence && selectedIncident.evidence.length > 0 && (
                    <div className="mb-4">
                      <p className="font-mono text-[10px] text-muted-foreground uppercase mb-2">Evidence ({selectedIncident.evidence.length})</p>
                      <EvidenceViewer evidence={selectedIncident.evidence} />
                    </div>
                  )}

                  {/* Action */}
                  {selectedIncident.status === 'pending' ? (
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Select
                        value={actionInputs[selectedIncident.id] || ''}
                        onValueChange={val => setActionInputs(prev => ({ ...prev, [selectedIncident.id]: val }))}
                      >
                        <SelectTrigger className="flex-1 font-mono text-xs bg-muted border-border">
                          <SelectValue placeholder="Select action..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt} className="font-mono text-xs">{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => handleResolve(selectedIncident.id)}
                        className="px-4 py-2 bg-accent text-accent-foreground font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-accent/80 transition-colors"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleArchive(selectedIncident.id)}
                        className="px-3 py-2 border border-border text-muted-foreground font-mono text-[10px] uppercase hover:text-primary hover:border-primary transition-colors"
                        title="Archive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="px-3 py-2 border border-accent/30 font-mono text-xs text-accent">
                        ✓ {selectedIncident.actionTaken}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => generatePDF(selectedIncident)}
                          className="px-3 py-1.5 border border-border text-muted-foreground font-mono text-[10px] uppercase hover:text-foreground transition-colors"
                        >
                          <FileText className="mr-1 h-3 w-3 inline" /> PDF
                        </button>
                        <button
                          onClick={() => handleArchive(selectedIncident.id)}
                          className="px-3 py-1.5 border border-border text-muted-foreground font-mono text-[10px] uppercase hover:text-primary transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Archived */}
            {showArchived && (
              <div className="px-6 pb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    Archived Incidents
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">({archivedIncidents.length})</span>
                </div>

                {archivedIncidents.length === 0 && (
                  <div className="basalt-slab p-8 text-center">
                    <p className="font-mono text-xs text-muted-foreground uppercase">No archived incidents</p>
                  </div>
                )}

                <div className="space-y-2">
                  {archivedIncidents.map((incident, idx) => (
                    <motion.div
                      key={incident.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="basalt-slab p-4 border-dashed flex items-start justify-between"
                    >
                      <div>
                        <p className="font-semibold uppercase text-sm tracking-tight">{incident.victimName}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{incident.incidentType} • {new Date(incident.time).toLocaleString()}</p>
                        {incident.actionTaken && (
                          <p className="font-mono text-[10px] text-muted-foreground mt-1">Action: {incident.actionTaken}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestore(incident.id)}
                          className="px-2 py-1 border border-border text-muted-foreground font-mono text-[10px] uppercase hover:text-foreground transition-colors"
                        >
                          <ArchiveRestore className="mr-1 h-3 w-3 inline" /> Restore
                        </button>
                        <button
                          onClick={() => generatePDF(incident)}
                          className="px-2 py-1 border border-border text-muted-foreground font-mono text-[10px] uppercase hover:text-foreground transition-colors"
                        >
                          <FileText className="mr-1 h-3 w-3 inline" /> PDF
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
