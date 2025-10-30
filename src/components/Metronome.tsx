import { useEffect, useState } from "react";
import * as Tone from "tone";

interface MetronomeProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  isPlaying: boolean;
}

const Metronome = ({ bpm, onBpmChange, isPlaying }: MetronomeProps) => {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  useEffect(() => {
    const rotationAngle = ((bpm - 40) / (240 - 40)) * 270 - 135;
    setRotation(rotationAngle);
  }, [bpm]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = -e.movementY;
      const change = deltaY * 0.5;
      const newBpm = Math.max(40, Math.min(240, bpm + change));
      onBpmChange(Math.round(newBpm));
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, bpm, onBpmChange]);

  return (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <div className="text-xs text-muted-foreground mb-2">TEMPO</div>
        <div
          className="relative w-16 h-16 cursor-pointer"
          onMouseDown={() => setIsDragging(true)}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-border"
            />
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="20"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${rotation} 50 50)`}
              className="text-primary"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold">{bpm}</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">BPM</div>
      </div>
      {isPlaying && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-xs text-primary">Playing</span>
        </div>
      )}
    </div>
  );
};

export default Metronome;
