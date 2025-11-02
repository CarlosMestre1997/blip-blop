import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import React from "react";

interface SequencerProps {
  bpm: number;
  isPlaying: boolean;
  onTriggerSample: (track: number) => void;
  sampleNames: string[];
  metronome?: React.ReactNode;
  onTogglePlay?: () => void;
  onMapKey?: (key: string, pattern: boolean[][]) => void;
  onClearMap?: (key: string) => void;
  sequenceKeysInfo?: { mapped: { [key: string]: boolean[][] }; active: string | null };
  onPlayDrumReady?: (playDrum: (trackIndex: number) => void) => void;
}

const STEPS = 16;
const DEFAULT_SAMPLES = [
  "/drum-kit/KICK1.wav",
  "/drum-kit/Snare1.wav",
  "/drum-kit/HH1.wav",
];

const DRUM_KIT_FILES = [
  { name: "Kick 1", path: "/drum-kit/KICK1.wav" },
  { name: "Kick 2", path: "/drum-kit/KICK2.wav" },
  { name: "Snare 1", path: "/drum-kit/Snare1.wav" },
  { name: "Snare 2", path: "/drum-kit/Snare2.wav" },
  { name: "HH 1", path: "/drum-kit/HH1.wav" },
  { name: "HH 2", path: "/drum-kit/HH2.wav" },
  { name: "HH 3", path: "/drum-kit/HH3.wav" },
];

const Sequencer = ({ bpm, isPlaying, onTriggerSample, sampleNames, metronome, onTogglePlay, onMapKey, onClearMap, sequenceKeysInfo, onPlayDrumReady }: SequencerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pattern, setPattern] = useState<boolean[][]>(
    Array(3).fill(null).map(() => Array(STEPS).fill(false))
  );
  const [currentStep, setCurrentStep] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [buffers, setBuffers] = useState<(AudioBuffer | null)[]>([null, null, null]);
  const ctxRef = useRef<AudioContext | null>(null);
  const [selectedSamples, setSelectedSamples] = useState<string[]>(DEFAULT_SAMPLES);
  const [showEQ, setShowEQ] = useState<number | null>(null);
  const [eqSettings, setEqSettings] = useState<{low: number, mid: number, high: number}[]>([
    { low: 0, mid: 0, high: 0 },
    { low: 0, mid: 0, high: 0 },
    { low: 0, mid: 0, high: 0 },
  ]);
  const eqNodesRef = useRef<{low: BiquadFilterNode, mid: BiquadFilterNode, high: BiquadFilterNode}[]>([]);

  // On mount, load all default samples and create EQ nodes
  useEffect(() => {
    const win = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AudioCtx = win.AudioContext ?? win.webkitAudioContext;
    if (!AudioCtx) return;
    ctxRef.current = new AudioCtx();
    const ctx = ctxRef.current;
    
    // Create EQ nodes for each track
    eqNodesRef.current = Array(3).fill(null).map(() => ({
      low: ctx.createBiquadFilter(),
      mid: ctx.createBiquadFilter(),
      high: ctx.createBiquadFilter(),
    }));
    
    // Configure filters
    eqNodesRef.current.forEach((nodes) => {
      nodes.low.type = 'lowshelf';
      nodes.low.frequency.value = 320;
      nodes.mid.type = 'peaking';
      nodes.mid.frequency.value = 1000;
      nodes.mid.Q.value = 0.5;
      nodes.high.type = 'highshelf';
      nodes.high.frequency.value = 3200;
    });
    
    Promise.all(
      selectedSamples.map(async (url) => {
        const resp = await fetch(url);
        const arrayBuffer = await resp.arrayBuffer();
        return await ctx.decodeAudioData(arrayBuffer);
      })
    ).then(setBuffers);
    // Clean up
    return () => { ctx?.close(); };
  }, []);
  
  // Reload buffer when sample changes
  const handleSampleChange = async (trackIndex: number, samplePath: string) => {
    const newSelectedSamples = [...selectedSamples];
    newSelectedSamples[trackIndex] = samplePath;
    setSelectedSamples(newSelectedSamples);
    
    if (ctxRef.current) {
      const resp = await fetch(samplePath);
      const arrayBuffer = await resp.arrayBuffer();
      const buffer = await ctxRef.current.decodeAudioData(arrayBuffer);
      setBuffers(prev => {
        const newBuffers = [...prev];
        newBuffers[trackIndex] = buffer;
        return newBuffers;
      });
    }
  };
  
  // Update EQ gain
  const updateEQ = (trackIndex: number, band: 'low' | 'mid' | 'high', value: number) => {
    setEqSettings(prev => {
      const newSettings = [...prev];
      newSettings[trackIndex] = { ...newSettings[trackIndex], [band]: value };
      return newSettings;
    });
    
    if (eqNodesRef.current[trackIndex]) {
      eqNodesRef.current[trackIndex][band].gain.value = value;
    }
  };

  // Play drum with EQ applied
  const playDrumWithEQ = useCallback((trackIndex: number) => {
    if (!buffers[trackIndex] || !ctxRef.current) return;
    
    const ctx = ctxRef.current;
    const src = ctx.createBufferSource();
    src.buffer = buffers[trackIndex]!;
    
    // Apply EQ chain
    const eqNodes = eqNodesRef.current[trackIndex];
    if (eqNodes) {
      src.connect(eqNodes.low);
      eqNodes.low.connect(eqNodes.mid);
      eqNodes.mid.connect(eqNodes.high);
      eqNodes.high.connect(ctx.destination);
    } else {
      src.connect(ctx.destination);
    }
    
    src.start();
  }, [buffers]);

  // Expose playDrumWithEQ to parent
  useEffect(() => {
    if (onPlayDrumReady) {
      onPlayDrumReady(playDrumWithEQ);
    }
  }, [onPlayDrumReady, playDrumWithEQ]);

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
              
              // Apply EQ chain
              const eqNodes = eqNodesRef.current[trackIndex];
              if (eqNodes) {
                src.connect(eqNodes.low);
                eqNodes.low.connect(eqNodes.mid);
                eqNodes.mid.connect(eqNodes.high);
                eqNodes.high.connect(ctx.destination);
              } else {
                src.connect(ctx.destination);
              }
              
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
        <h3 className="text-sm font-bold">Drums and Sequencer</h3>
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
          <div className="space-y-3">
            {[0, 1, 2].map((trackIndex) => (
              <div key={trackIndex} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedSamples[trackIndex]} 
                    onValueChange={(value) => handleSampleChange(trackIndex, value)}
                  >
                    <SelectTrigger className="h-7 text-xs w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DRUM_KIT_FILES.map((file) => (
                        <SelectItem key={file.path} value={file.path} className="text-xs">
                          {file.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={() => setShowEQ(showEQ === trackIndex ? null : trackIndex)}
                  >
                    <Settings size={14} />
                  </Button>
                </div>
                
                {showEQ === trackIndex && (
                  <div className="bg-muted/50 p-2 rounded space-y-2 mb-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Low: {eqSettings[trackIndex].low.toFixed(1)} dB</label>
                      <Slider
                        value={[eqSettings[trackIndex].low]}
                        onValueChange={([value]) => updateEQ(trackIndex, 'low', value)}
                        min={-12}
                        max={12}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Mid: {eqSettings[trackIndex].mid.toFixed(1)} dB</label>
                      <Slider
                        value={[eqSettings[trackIndex].mid]}
                        onValueChange={([value]) => updateEQ(trackIndex, 'mid', value)}
                        min={-12}
                        max={12}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">High: {eqSettings[trackIndex].high.toFixed(1)} dB</label>
                      <Slider
                        value={[eqSettings[trackIndex].high]}
                        onValueChange={([value]) => updateEQ(trackIndex, 'high', value)}
                        min={-12}
                        max={12}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
                
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
