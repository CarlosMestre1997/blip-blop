import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import * as Tone from "tone";

interface SequencerProps {
  bpm: number;
  isPlaying: boolean;
}

const TRACK_NAMES = ["Kick", "Snare", "Closed Hat", "Open Hat", "Clap", "Perc"];
const STEPS = 16;

const Sequencer = ({ bpm, isPlaying }: SequencerProps) => {
  const [pattern, setPattern] = useState<boolean[][]>(
    Array(6).fill(null).map(() => Array(STEPS).fill(false))
  );
  const [currentStep, setCurrentStep] = useState(-1);
  const sequenceRef = useRef<number | null>(null);
  const playersRef = useRef<Tone.Player[]>([]);

  // Load drum samples
  useEffect(() => {
    const sampleUrls = [
      "/assets/drums/kick.wav",
      "/assets/drums/snare.wav",
      "/assets/drums/hihat_closed.wav",
      "/assets/drums/hihat_open.wav",
      "/assets/drums/clap.wav",
      "/assets/drums/perc.wav",
    ];

    playersRef.current = sampleUrls.map(url => {
      const player = new Tone.Player(url).toDestination();
      player.volume.value = -6;
      return player;
    });

    return () => {
      playersRef.current.forEach(player => player.dispose());
    };
  }, []);

  // Setup sequencer with Tone.Transport
  useEffect(() => {
    if (isPlaying) {
      let step = 0;
      
      sequenceRef.current = Tone.Transport.scheduleRepeat((time) => {
        setCurrentStep(step);
        
        // Trigger sounds for active steps
        pattern.forEach((track, trackIndex) => {
          if (track[step] && playersRef.current[trackIndex]) {
            playersRef.current[trackIndex].start(time);
          }
        });
        
        step = (step + 1) % STEPS;
      }, "16n");

      Tone.Transport.start();
    } else {
      if (sequenceRef.current !== null) {
        Tone.Transport.clear(sequenceRef.current);
        sequenceRef.current = null;
      }
      Tone.Transport.stop();
      setCurrentStep(-1);
    }

    return () => {
      if (sequenceRef.current !== null) {
        Tone.Transport.clear(sequenceRef.current);
      }
    };
  }, [isPlaying, pattern]);

  const toggleStep = (trackIndex: number, stepIndex: number) => {
    setPattern(prev => {
      const newPattern = prev.map(track => [...track]);
      newPattern[trackIndex][stepIndex] = !newPattern[trackIndex][stepIndex];
      return newPattern;
    });
  };

  const clearPattern = () => {
    setPattern(Array(6).fill(null).map(() => Array(STEPS).fill(false)));
  };

  const savePattern = () => {
    const json = JSON.stringify({ pattern, bpm }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blipbloop_pattern_${bpm}bpm.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border-2 border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Sequencer</h3>
        <div className="flex gap-2">
          <Button onClick={clearPattern} variant="outline" size="sm">
            Clear Pattern
          </Button>
          <Button onClick={savePattern} variant="outline" size="sm">
            Save Pattern
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {pattern.map((track, trackIndex) => (
          <div key={trackIndex} className="flex items-center gap-2">
            <div className="w-20 text-xs font-mono">{TRACK_NAMES[trackIndex]}</div>
            <div className="flex gap-1">
              {track.map((active, stepIndex) => (
                <button
                  key={stepIndex}
                  onClick={() => toggleStep(trackIndex, stepIndex)}
                  className={`w-6 h-6 border border-border transition-all ${
                    active 
                      ? "bg-primary" 
                      : "bg-muted hover:bg-muted/80"
                  } ${
                    currentStep === stepIndex && isPlaying
                      ? "ring-2 ring-cyan-400 scale-110"
                      : ""
                  }`}
                  style={{
                    borderRadius: "2px",
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">
        Click steps to activate. Spacebar starts/stops the sequence.
      </div>
    </div>
  );
};

export default Sequencer;
