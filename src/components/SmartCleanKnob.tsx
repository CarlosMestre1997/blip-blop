import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface SmartCleanKnobProps {
  value: number;
  onChange: (value: number) => void;
  onListen: () => void;
  onDownload: () => void;
  isProcessing: boolean;
}

const SmartCleanKnob = ({ value, onChange, onListen, onDownload, isProcessing }: SmartCleanKnobProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = -e.movementY;
      const newValue = Math.max(0, Math.min(100, value + deltaY * 0.5));
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, value, onChange]);

  const rotation = (value / 100) * 270 - 135;

  return (
    <div className="border-2 border-border rounded p-4 bg-card space-y-3">
      <div className="text-xs font-bold">Smart clean =</div>
      
      <div className="flex flex-col items-center">
        <div
          ref={knobRef}
          className="relative w-24 h-24 cursor-pointer select-none"
          onMouseDown={() => setIsDragging(true)}
        >
          <div className="absolute inset-0 rounded-full border-4 border-border bg-background"></div>
          <div 
            className="absolute inset-2 rounded-full bg-primary"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="absolute top-1 left-1/2 w-1 h-6 bg-primary-foreground -ml-0.5 rounded-full"></div>
          </div>
        </div>
        
        <div className="mt-2 text-2xl font-bold">{Math.round(value)}%</div>
      </div>

      <div className="space-y-2">
        <Button
          onClick={onListen}
          disabled={isProcessing}
          className="w-full"
          variant="outline"
          size="sm"
        >
          Listen
        </Button>
        <Button
          onClick={onDownload}
          disabled={isProcessing}
          className="w-full"
          size="sm"
        >
          Download
        </Button>
      </div>
    </div>
  );
};

export default SmartCleanKnob;
