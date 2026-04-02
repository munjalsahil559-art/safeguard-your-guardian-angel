import React, { useState } from 'react';
import { Evidence } from '@/lib/auth';
import { Camera, Video, Mic, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EvidenceViewerProps {
  evidence: Evidence[];
}

const EvidenceViewer = ({ evidence }: EvidenceViewerProps) => {
  const [selected, setSelected] = useState<Evidence | null>(null);

  if (!evidence || evidence.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {evidence.map((ev, i) => (
          <button
            key={i}
            onClick={() => setSelected(ev)}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted hover:bg-accent/20 transition-colors"
          >
            {ev.type === 'photo' && <Camera className="h-4 w-4 text-primary" />}
            {ev.type === 'video' && <Video className="h-4 w-4 text-primary" />}
            {ev.type === 'audio' && <Mic className="h-4 w-4 text-primary" />}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-lg w-full rounded-xl border border-border bg-card p-4"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute right-3 top-3 rounded-full bg-muted p-1 hover:bg-accent/20"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-xs text-muted-foreground mb-2 capitalize">{selected.type} — {new Date(selected.timestamp).toLocaleString()}</p>
              {selected.type === 'photo' && (
                <img src={selected.dataUrl} alt="evidence" className="w-full rounded-lg" />
              )}
              {selected.type === 'video' && (
                <video src={selected.dataUrl} controls className="w-full rounded-lg" />
              )}
              {selected.type === 'audio' && (
                <audio src={selected.dataUrl} controls className="w-full mt-4" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EvidenceViewer;
