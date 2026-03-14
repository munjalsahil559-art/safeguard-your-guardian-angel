import React, { useState, useRef, useCallback } from 'react';
import { Evidence } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Camera, Video, Mic, Square, X, Image } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface EvidenceCaptureProps {
  evidence: Evidence[];
  onAdd: (ev: Evidence) => void;
  onRemove: (index: number) => void;
}

const EvidenceCapture = ({ evidence, onAdd, onRemove }: EvidenceCaptureProps) => {
  const [activeMode, setActiveMode] = useState<'photo' | 'video' | 'audio' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async (mode: 'photo' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: mode === 'video',
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setActiveMode(mode);
    } catch {
      toast.error('Camera access denied');
    }
  }, []);

  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setActiveMode('audio');
    } catch {
      toast.error('Microphone access denied');
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActiveMode(null);
    setIsRecording(false);
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    onAdd({ type: 'photo', dataUrl, timestamp: new Date().toISOString() });
    toast.success('Photo captured');
    stopStream();
  }, [onAdd, stopStream]);

  const startRecording = useCallback((type: 'video' | 'audio') => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = type === 'video' ? 'video/webm' : 'audio/webm';
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const reader = new FileReader();
      reader.onload = () => {
        onAdd({ type, dataUrl: reader.result as string, timestamp: new Date().toISOString() });
        toast.success(`${type === 'video' ? 'Video' : 'Audio'} recorded`);
      };
      reader.readAsDataURL(blob);
      stopStream();
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  }, [onAdd, stopStream]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Evidence</span>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => startCamera('photo')} disabled={!!activeMode}>
            <Camera className="mr-1 h-3 w-3" /> Photo
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => startCamera('video')} disabled={!!activeMode}>
            <Video className="mr-1 h-3 w-3" /> Video
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={startAudio} disabled={!!activeMode}>
            <Mic className="mr-1 h-3 w-3" /> Audio
          </Button>
        </div>
      </div>

      {/* Camera / Audio Preview */}
      <AnimatePresence>
        {activeMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-border bg-muted overflow-hidden"
          >
            {(activeMode === 'photo' || activeMode === 'video') && (
              <video ref={videoRef} className="w-full rounded-t-lg" autoPlay muted playsInline />
            )}
            {activeMode === 'audio' && (
              <div className="flex items-center justify-center py-8">
                <div className={`h-16 w-16 rounded-full border-4 border-primary flex items-center justify-center ${isRecording ? 'emergency-pulse' : ''}`}>
                  <Mic className="h-6 w-6 text-primary" />
                </div>
              </div>
            )}
            <div className="flex gap-2 p-3">
              {activeMode === 'photo' && (
                <Button size="sm" className="flex-1 emergency-gradient text-primary-foreground" onClick={capturePhoto}>
                  <Camera className="mr-1 h-3 w-3" /> Capture
                </Button>
              )}
              {activeMode === 'video' && !isRecording && (
                <Button size="sm" className="flex-1 emergency-gradient text-primary-foreground" onClick={() => startRecording('video')}>
                  <Video className="mr-1 h-3 w-3" /> Start Recording
                </Button>
              )}
              {activeMode === 'audio' && !isRecording && (
                <Button size="sm" className="flex-1 emergency-gradient text-primary-foreground" onClick={() => startRecording('audio')}>
                  <Mic className="mr-1 h-3 w-3" /> Start Recording
                </Button>
              )}
              {isRecording && (
                <Button size="sm" variant="destructive" className="flex-1" onClick={stopRecording}>
                  <Square className="mr-1 h-3 w-3" /> Stop
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={stopStream}>
                <X className="h-3 w-3" /> Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />

      {/* Evidence thumbnails */}
      {evidence.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {evidence.map((ev, i) => (
            <div key={i} className="group relative rounded-lg border border-border overflow-hidden">
              {ev.type === 'photo' && (
                <img src={ev.dataUrl} alt="evidence" className="h-16 w-16 object-cover" />
              )}
              {ev.type === 'video' && (
                <div className="flex h-16 w-16 items-center justify-center bg-muted">
                  <Video className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              {ev.type === 'audio' && (
                <div className="flex h-16 w-16 items-center justify-center bg-muted">
                  <Mic className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => onRemove(i)}
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute bottom-0 left-0 right-0 bg-foreground/60 text-center text-[9px] text-background capitalize">{ev.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EvidenceCapture;
