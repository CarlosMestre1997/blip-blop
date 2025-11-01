import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Upload, Sliders } from "lucide-react";
import { Slider } from "@/components/ui/slider";

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
  const [expandedEQ, setExpandedEQ] = useState<number | null>(null);
  
  const trackLabels = ["D", "F", "G"];

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
            <div key={index} className="space-y-2 pb-3 border-b border-border last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{trackLabels[index]}</span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {pad.sampleName}
                </span>
              </div>
              
              <div className="flex gap-2">
                <label htmlFor={`drum-upload-${index}`} className="flex-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    asChild
                  >
                    <span className="cursor-pointer flex items-center justify-center gap-2">
                      <Upload className="w-3 h-3" />
                      Upload
                    </span>
                  </Button>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedEQ(expandedEQ === index ? null : index)}
                >
                  <Sliders className="w-3 h-3" />
                </Button>
              </div>
              
              <input
                id={`drum-upload-${index}`}
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileChange(index, e)}
                className="hidden"
              />
              
              {expandedEQ === index && (
                <div className="space-y-3 pt-2 bg-accent/30 p-3 rounded">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground">Low</label>
                    <Slider
                      defaultValue={[0]}
                      min={-12}
                      max={12}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground">Mid</label>
                    <Slider
                      defaultValue={[0]}
                      min={-12}
                      max={12}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground">High</label>
                    <Slider
                      defaultValue={[0]}
                      min={-12}
                      max={12}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DrumPads;
