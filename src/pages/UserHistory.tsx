import React, { useState, useEffect } from 'react';
import { useAuth, getIncidents, Incident } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';
import EvidenceViewer from '@/components/EvidenceViewer';
import { motion } from 'framer-motion';
import { MapPin, Clock, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

const UserHistory = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    if (user) {
      getIncidents().then(all => {
        setIncidents(all.filter(i => i.reportedBy === user.id));
      });
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-8 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-primary" />
          <h1 className="text-2xl font-bold uppercase tracking-tighter">My SOS History</h1>
        </div>

        {incidents.length === 0 && (
          <div className="basalt-slab p-12 text-center">
            <FileText className="mx-auto h-8 w-8 mb-2 text-muted-foreground opacity-30" />
            <p className="font-mono text-xs text-muted-foreground uppercase">No SOS reports yet</p>
          </div>
        )}

        {incidents.map((inc, idx) => (
          <motion.div
            key={inc.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`basalt-slab p-5 space-y-3 border-l-2 ${inc.status === 'resolved' ? 'border-l-accent' : 'border-l-primary'}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold uppercase text-sm tracking-tight">{inc.victimName}</p>
                <p className="font-mono text-[10px] text-muted-foreground uppercase">{inc.incidentType}</p>
              </div>
              <span className={`px-2 py-0.5 font-mono text-[9px] uppercase font-bold border ${
                inc.status === 'resolved'
                  ? 'border-accent/30 text-accent'
                  : 'border-primary/30 text-primary'
              }`}>
                {inc.status === 'resolved' ? '✓ Resolved' : '⏳ Pending'}
              </span>
            </div>

            {inc.description && (
              <p className="text-sm bg-muted p-3 border border-border text-muted-foreground">{inc.description}</p>
            )}

            <div className="flex flex-wrap gap-4 font-mono text-[10px] text-muted-foreground uppercase">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(inc.time).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {inc.latitude.toFixed(4)}, {inc.longitude.toFixed(4)}
              </span>
            </div>

            {inc.actionTaken && (
              <div className="px-3 py-2 border border-accent/30 font-mono text-xs text-accent">
                Action: {inc.actionTaken}
              </div>
            )}

            {inc.evidence && inc.evidence.length > 0 && (
              <EvidenceViewer evidence={inc.evidence} />
            )}
          </motion.div>
        ))}
      </main>
    </div>
  );
};

export default UserHistory;
