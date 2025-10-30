import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SequencerProps {
  bpm: number;
  isPlaying: boolean;
  onLoadSample: (track: number, file: File) => void;
  onTriggerSample: (track: number) => void;
  sampleNames: string[];
}

const TRACK_NAMES = ["Kick", "Snare", "Closed Hat", "Open Hat", "Clap", "Perc"];
const STEPS = 16;

const Sequencer = ({ bpm, isPlaying, onLoadSample, onTriggerSample, sampleNames }: SequencerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pattern, setPattern] = useState<boolean[][]>(
    Array(6).fill(null).map(() => Array(STEPS).fill(false))
  );
  const [currentStep, setCurrentStep] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying && isExpanded) {
      const stepDuration = (60 / bpm / 4) * 1000; // 16th notes
      
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1) % STEPS;
          
          // Trigger samples for active steps
          pattern.forEach((track, trackIndex) => {
            if (track[nextStep]) {
              onTriggerSample(trackIndex);
            }
          });
          
          return nextStep;
        });
      }, stepDuration);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentStep(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isExpanded, bpm, pattern, onTriggerSample]);

  const toggleStep = (track: number, step: number) => {
    setPattern(prev => {
      const newPattern = prev.map(row => [...row]);
      newPattern[track][step] = !newPattern[track][step];
      return newPattern;
    });
  };

  const clearPattern = () => {
    setPattern(Array(6).fill(null).map(() => Array(STEPS).fill(false)));
  };

  return (
    <div className="border-2 border-border rounded bg-card">
      <div 
        className="p-4 cursor-pointer flex justify-between items-center hover:bg-accent/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-bold">Sequencer</h3>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={clearPattern}>
              Clear Pattern
            </Button>
          </div>

          <div className="space-y-2">
            {TRACK_NAMES.map((name, trackIndex) => (
              <div key={trackIndex} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-20 font-mono">{name}</span>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onLoadSample(trackIndex, file);
                      }}
                      className="hidden"
                    />
                    <span className="text-xs underline hover:text-ring">
                      {sampleNames[trackIndex] || "Load"}
                    </span>
                  </label>
                </div>
                <div className="flex gap-1">
                  {Array(STEPS).fill(0).map((_, stepIndex) => (
                    <button
                      key={stepIndex}
                      onClick={() => toggleStep(trackIndex, stepIndex)}
                      className={`w-6 h-6 border-2 rounded transition-colors ${
                        pattern[trackIndex][stepIndex]
                          ? 'bg-ring border-ring'
                          : 'border-border bg-background'
                      } ${
                        currentStep === stepIndex && isPlaying
                          ? 'ring-2 ring-accent'
                          : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sequencer;
