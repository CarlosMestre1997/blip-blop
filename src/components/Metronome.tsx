import { useState, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";

interface MetronomeProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  isPlaying: boolean;
  onToggle: () => void;
}

const Metronome = ({ bpm, onBpmChange, isPlaying, onToggle }: MetronomeProps) => {
  const [activeBeat, setActiveBeat] = useState<1 | 2>(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const interval = (60 / bpm) * 1000; // milliseconds per beat
      intervalRef.current = setInterval(() => {
        setActiveBeat(prev => prev === 1 ? 2 : 1);
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setActiveBeat(1);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, bpm]);

  return (
    <div className="border-2 border-border rounded p-4 bg-card">
      <h3 className="text-sm font-bold mb-3">Metronome</h3>
      
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onToggle}
          className="border-2 border-border rounded p-2 flex gap-2 hover:bg-accent transition-colors"
        >
          <div 
            className={`w-3 h-3 rounded-full transition-colors ${
              isPlaying && activeBeat === 1 
                ? 'bg-ring' 
                : 'bg-muted'
            }`}
          />
          <div 
            className={`w-3 h-3 rounded-full transition-colors ${
              isPlaying && activeBeat === 2 
                ? 'bg-ring' 
                : 'bg-muted'
            }`}
          />
        </button>
        
        <div className="flex-1">
          <div className="text-xs mb-1">Tempo: {bpm} BPM</div>
          <Slider
            value={[bpm]}
            onValueChange={([value]) => onBpmChange(value)}
            min={40}
            max={240}
            step={1}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default Metronome;
