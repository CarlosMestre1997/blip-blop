import { useState, useEffect, useRef } from "react";
import MetronomeKnob from "./MetronomeKnob";

interface MetronomeProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  isPlaying: boolean;
  onToggle: () => void;
}

const Metronome = ({ bpm, onBpmChange, isPlaying, onToggle }: MetronomeProps) => {
  const [activeBeat, setActiveBeat] = useState<1 | 2>(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Preload metronome sound HH3 on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const resp = await fetch("/drum-kit/HH3.wav");
        const buffer = await resp.arrayBuffer();
        const decoded = await ctxRef.current.decodeAudioData(buffer);
        if (isMounted) audioBufferRef.current = decoded;
      } catch (err) {
        console.warn("Failed to load metronome sound", err);
      }
    })();
    return () => { isMounted = false; ctxRef.current?.close(); }
  }, []);

  function playSound() {
    const ctx = ctxRef.current;
    const buffer = audioBufferRef.current;
    if (!ctx || !buffer) return;
    // Stop previous node if needed
    try { sourceRef.current?.stop(); } catch { /* ignore */ }
    try {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start();
      sourceRef.current = src;
    } catch (err) {
      console.warn("Failed to play metronome sound", err);
    }
  }

  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (isPlaying) {
      playSound(); // Immediate
      setActiveBeat(1); // Reset to first beat
      const interval = (60 / bpm) * 1000;
      intervalRef.current = setInterval(() => {
        setActiveBeat(prev => {
          playSound(); // Play each beat
          return prev === 1 ? 2 : 1;
        });
      }, interval);
    } else {
      setActiveBeat(1);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, bpm]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        className="border-2 border-border rounded p-2 flex gap-1 hover:bg-accent transition-colors"
        style={{minWidth: 36}}
      >
        <div
          className={`w-3 h-3 rounded-full transition-colors ${isPlaying && activeBeat === 1 ? 'bg-ring' : 'bg-muted'}`}
        />
        <div
          className={`w-3 h-3 rounded-full transition-colors ${isPlaying && activeBeat === 2 ? 'bg-ring' : 'bg-muted'}`}
        />
      </button>
      <MetronomeKnob
        value={bpm}
        onChange={onBpmChange}
        min={40}
        max={240}
        step={1}
        size={36}
      />
      <span className="text-xs font-medium ml-2">Tempo: {bpm} BPM</span>
    </div>
  );
};

export default Metronome;
