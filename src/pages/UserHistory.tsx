import React, { useState, useEffect } from 'react';
import { useAuth, getIncidents, Incident } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';
import EvidenceViewer from '@/components/EvidenceViewer';
import { motion } from 'framer-motion';
import { History, MapPin, Clock, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const UserHistory = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    if (user) {
      const all = getIncidents().filter(i => i.reportedBy === user.email);
      setIncidents(all.reverse());
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-2xl px-4 py-6 space-y-4">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <History className="h-5 w-5 text-primary" />
          My SOS History
        </h1>

        {incidents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="mx-auto h-10 w-10 mb-2 opacity-50" />
            <p>No SOS reports yet</p>
          </div>
        )}

        {incidents.map((inc, idx) => (
          <motion.div
            key={inc.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{inc.victimName}</p>
                <p className="text-sm text-muted-foreground">{inc.incidentType}</p>
              </div>
              <Badge variant={inc.status === 'resolved' ? 'default' : 'destructive'} className="shrink-0">
                {inc.status === 'resolved' ? (
                  <><CheckCircle className="mr-1 h-3 w-3" /> Resolved</>
                ) : (
                  <><AlertTriangle className="mr-1 h-3 w-3" /> Pending</>
                )}
              </Badge>
            </div>

            {inc.description && (
              <p className="text-sm bg-muted rounded-lg p-2">{inc.description}</p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
              <div className="text-sm rounded-lg bg-primary/10 p-2 text-primary">
                <strong>Action:</strong> {inc.actionTaken}
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
