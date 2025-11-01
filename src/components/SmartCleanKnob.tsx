import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SmartCleanKnobProps {
  value: number;
  onChange: (value: number) => void;
  onListen: () => void;
  isPlaying: boolean;
  onDownload: (format: 'wav' | 'mp3') => void;
  isProcessing: boolean;
}

const SmartCleanKnob = ({ value, onChange, onListen, isPlaying, onDownload, isProcessing }: SmartCleanKnobProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
    <div className="border-2 border-border rounded bg-card">
      <div
        className="p-4 cursor-pointer flex justify-between items-center hover:bg-accent/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-bold">Smart Clean</h3>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      
      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          <div className="text-xs flex items-center justify-center opacity-70">AI Enhanced</div>
          
          <div className="flex flex-col items-center">
            <div
              ref={knobRef}
              className="relative w-24 h-24 cursor-pointer select-none"
              onMouseDown={() => setIsDragging(true)}
            >
              <div className="absolute inset-0 rounded-full border-4 border-border bg-background"></div>
              <div 
                className="absolute inset-2 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <div className="absolute top-1 left-1/2 w-1 h-6 bg-primary-foreground -ml-0.5 rounded-full"></div>
              </div>
            </div>
            
            <div className="mt-2 text-2xl font-bold">{Math.round(value)}%</div>
            <div className="text-[10px] text-muted-foreground text-center">
              Spectral Processing
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={onListen}
              disabled={isProcessing}
              className="w-full"
              variant="outline"
              size="sm"
            >
              {isPlaying ? 'Stop' : 'Listen'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={isProcessing}
                  className="w-full"
                  size="sm"
                >
                  <Download className="w-3 h-3 mr-2" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onDownload('wav')}>
                  Download as WAV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownload('mp3')}>
                  Download as MP3
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCleanKnob;
