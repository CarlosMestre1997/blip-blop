import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Upload } from "lucide-react";

interface DrumPad {
  sampleName: string;
  audioBuffer: AudioBuffer | null;
}

interface DrumPadsProps {
  drumPads: DrumPad[];
  onSampleUpload: (trackIndex: number, file: File) => void;
}

const DrumPads = ({ drumPads, onSampleUpload }: DrumPadsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFileChange = (trackIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSampleUpload(trackIndex, file);
    }
  };

  return (
    <div className="border-2 border-border rounded bg-card">
      <div
        className="p-4 cursor-pointer flex justify-between items-center hover:bg-accent/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-bold">Drums</h3>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      
      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          <div className="text-xs text-muted-foreground text-center mb-2">
            Upload custom samples for each drum track
          </div>
          
          {drumPads.map((pad, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Track {index + 1}</span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {pad.sampleName}
                </span>
              </div>
              
              <label htmlFor={`drum-upload-${index}`}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  asChild
                >
                  <span className="cursor-pointer flex items-center justify-center gap-2">
                    <Upload className="w-3 h-3" />
                    Upload Sample
                  </span>
                </Button>
              </label>
              <input
                id={`drum-upload-${index}`}
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileChange(index, e)}
                className="hidden"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DrumPads;
