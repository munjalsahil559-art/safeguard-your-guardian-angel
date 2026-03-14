import React, { useState, useEffect } from 'react';
import { getIncidents, updateIncident, Incident } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Shield, MapPin, CheckCircle, Clock, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const AdminDashboard = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [actionInputs, setActionInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = () => setIncidents(getIncidents());
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = (id: string) => {
    const action = actionInputs[id]?.trim();
    if (!action) { toast.error('Enter action taken'); return; }
    updateIncident(id, { status: 'resolved', actionTaken: action });
    setIncidents(getIncidents());
    toast.success('Incident resolved');
  };

  const generatePDF = (incident: Incident) => {
    const doc = new jsPDF();
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
    ];
    lines.forEach((line, i) => doc.text(line, 20, y + i * 10));

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleString()} by SafeGuard`, 20, 280);

    doc.save(`safeguard-report-${incident.id.slice(0, 8)}.pdf`);
    toast.success('PDF downloaded');
  };

  const pending = incidents.filter(i => i.status === 'pending');
  const resolved = incidents.filter(i => i.status === 'resolved');

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: incidents.length, icon: Shield, color: 'text-foreground' },
            { label: 'Pending', value: pending.length, icon: Clock, color: 'text-warning' },
            { label: 'Resolved', value: resolved.length, icon: CheckCircle, color: 'text-success' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4 text-center">
              <stat.icon className={`mx-auto mb-1 h-5 w-5 ${stat.color}`} />
              <p className="text-2xl font-extrabold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Incidents */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <AlertTriangle className="h-5 w-5 text-primary" />
            All Incidents
          </h2>

          {incidents.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Shield className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No incidents reported yet</p>
            </div>
          )}

          <div className="space-y-3">
            {incidents.map((incident, idx) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold">{incident.victimName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(incident.time).toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    incident.status === 'resolved'
                      ? 'bg-success/15 text-success'
                      : 'bg-warning/15 text-warning'
                  }`}>
                    {incident.status}
                  </span>
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

                {incident.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Action taken..."
                      value={actionInputs[incident.id] || ''}
                      onChange={e => setActionInputs(prev => ({ ...prev, [incident.id]: e.target.value }))}
                      className="flex-1"
                    />
                    <Button onClick={() => handleResolve(incident.id)} size="sm" className="bg-success text-success-foreground hover:bg-success/90">
                      Resolve
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-success/10 px-3 py-1.5 text-xs text-success">
                      ✓ {incident.actionTaken}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => generatePDF(incident)} className="text-xs">
                      <FileText className="mr-1 h-3 w-3" /> PDF
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
