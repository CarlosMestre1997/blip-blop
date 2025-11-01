import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import React from "react";

interface SequencerProps {
  bpm: number;
  isPlaying: boolean;
  onTriggerSample: (track: number) => void;
  sampleNames: string[];
  metronome?: React.ReactNode;
  onTogglePlay?: () => void;
  onMapKey?: (key: string, pattern: boolean[][]) => void; // NEW
  onClearMap?: (key: string) => void;
  sequenceKeysInfo?: { mapped: { [key: string]: boolean[][] }; active: string | null };
}

const TRACK_NAMES = ["Kick 1", "Snare 1", "HH 1"];
const STEPS = 16;
const DEFAULT_SAMPLES = [
  "/drum-kit/KICK1.wav",
  "/drum-kit/Snare1.wav",
  "/drum-kit/HH1.wav",
];

const Sequencer = ({ bpm, isPlaying, onTriggerSample, sampleNames, metronome, onTogglePlay, onMapKey, onClearMap, sequenceKeysInfo }: SequencerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pattern, setPattern] = useState<boolean[][]>(
    Array(3).fill(null).map(() => Array(STEPS).fill(false))
  );
  const [currentStep, setCurrentStep] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [buffers, setBuffers] = useState<(AudioBuffer | null)[]>([null, null, null]);
  const ctxRef = useRef<AudioContext | null>(null);

  // On mount, load all default samples
  useEffect(() => {
    const win = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AudioCtx = win.AudioContext ?? win.webkitAudioContext;
    if (!AudioCtx) return;
    ctxRef.current = new AudioCtx();
    const ctx = ctxRef.current;
    Promise.all(
      DEFAULT_SAMPLES.map(async (url) => {
        const resp = await fetch(url);
        const arrayBuffer = await resp.arrayBuffer();
        return await ctx.decodeAudioData(arrayBuffer);
      })
    ).then(setBuffers);
    // Clean up
    return () => { ctx?.close(); };
  }, []);

  useEffect(() => {
    if (isPlaying && isExpanded) {
      const stepDuration = (60 / bpm / 4) * 1000;
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          const nextStep = (prev + 1) % STEPS;
          pattern.forEach((track, trackIndex) => {
            if (track[nextStep] && buffers[trackIndex]) {
              const ctx = ctxRef.current;
              if (!ctx) return;
              const src = ctx.createBufferSource();
              src.buffer = buffers[trackIndex]!;
              src.connect(ctx.destination);
              src.start();
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
  }, [isPlaying, isExpanded, bpm, pattern, buffers]);

  const toggleStep = (track: number, step: number) => {
    setPattern((prev) => {
      const newPattern = prev.map((row) => [...row]);
      newPattern[track][step] = !newPattern[track][step];
      return newPattern;
    });
  };
  const clearPattern = () => {
    setPattern(Array(3).fill(null).map(() => Array(STEPS).fill(false)));
  };
  return (
    <div className="border-2 border-border rounded bg-card">
      {metronome && (
        <div className="border-b border-border p-3 pb-2">{metronome}</div>
      )}
      <div
        className="p-4 cursor-pointer flex justify-between items-center hover:bg-accent/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-bold">Sequencer</h3>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          <div className="flex gap-2 items-center">
            <Button size="sm" onClick={onTogglePlay}>
              {isPlaying ? 'Stop' : 'Play'}
            </Button>
            <Button size="sm" variant="outline" onClick={clearPattern}>
              Clear Pattern
            </Button>
          </div>
          <div className="space-y-2">
            {TRACK_NAMES.map((name, trackIndex) => (
              <div key={trackIndex} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-20 font-mono">{name}</span>
                </div>
                <div className="flex gap-1">
                  {Array(STEPS)
                    .fill(0)
                    .map((_, stepIndex) => {
                      // Highlight steps 1, 5, 9, 13 (indices 0, 4, 8, 12)
                      const isDownbeat = stepIndex % 4 === 0;
                      return (
                        <button
                          key={stepIndex}
                          onClick={() => toggleStep(trackIndex, stepIndex)}
                          className={`w-6 h-6 border-2 rounded transition-colors ${
                            pattern[trackIndex][stepIndex]
                              ? "bg-ring border-ring"
                              : isDownbeat
                              ? "border-primary/60 bg-primary/10"
                              : "border-border bg-background"
                          } ${
                            currentStep === stepIndex && isPlaying
                              ? "ring-2 ring-accent shadow-lg"
                              : ""
                          }`}
                        />
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
          {/* Mapping buttons */}
          <div className="flex gap-3 pt-2 justify-center">
            {["H", "J", "K"].map(key => (
              <div key={key} className="flex flex-col items-center">
                <Button
                  size="sm"
                  variant="default"
                  className={
                    `${sequenceKeysInfo?.mapped?.[key] ? 'bg-ring/80 text-white' : 'bg-muted'} ` +
                    (sequenceKeysInfo?.active === key ? ' border-4 border-accent' : '')
                  }
                  onClick={() => onMapKey && onMapKey(key, pattern)}
                >
                  Map to {key}
                </Button>
                {sequenceKeysInfo?.mapped?.[key] && (
                  <Button size="sm" variant="outline" className="mt-1" onClick={() => onClearMap && onClearMap(key)}>
                    Clear {key}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sequencer;
