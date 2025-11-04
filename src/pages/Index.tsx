import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import WaveformDisplay from "@/components/WaveformDisplay";
import SliceControls, { SliceSettings } from "@/components/SliceControls";
import Metronome from "@/components/Metronome";
import Sequencer from "@/components/Sequencer";
import KeyboardTriggers from "@/components/KeyboardTriggers";
import RecordingControls from "@/components/RecordingControls";
import AuthModal from "@/components/AuthModal";
import { Button } from "@/components/ui/button";

interface WaveSurferRegion {
  start: number;
  end: number;
  remove: () => void;
  setOptions: (opts: Record<string, unknown>) => void;
}

interface DrumPad {
  sampleName: string;
  audioBuffer: AudioBuffer | null;
}

const Index = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
  const [regionsPlugin, setRegionsPlugin] = useState<RegionsPlugin | null>(null);
  const [masterBuffer, setMasterBuffer] = useState<AudioBuffer | null>(null);
  const [masterGainNode] = useState(() => {
    const ctx = new AudioContext();
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    return { ctx, gainNode };
  });
  
  // Slice state
  const [slices, setSlices] = useState<Map<number, { region: WaveSurferRegion; settings: SliceSettings }>>(new Map());
  const [activeSlice, setActiveSlice] = useState<number | null>(null);
  const [currentlyPlayingSlice, setCurrentlyPlayingSlice] = useState<number | null>(null);
  const [currentlyPlayingDrum, setCurrentlyPlayingDrum] = useState<number | null>(null);
  const [lastPlayedSlice, setLastPlayedSlice] = useState<number | null>(null);
  const activeSliceSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const currentlyPlayingSliceRef = useRef<number | null>(null);
  const lastPlayedSliceRef = useRef<number | null>(null);
  
  // Metronome & Sequencer state
  const [bpm, setBpm] = useState(120);
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [isSequencerPlaying, setIsSequencerPlaying] = useState(false);
  const [isSequencerExpanded, setIsSequencerExpanded] = useState(false);
  
  // Drum playback function from Sequencer
  const sequencerPlayDrumRef = useRef<((trackIndex: number) => void) | null>(null);

  const mappedSequences = useRef<{[key: string]: boolean[][]}>({});
  const sequencePlaybackRef = useRef<NodeJS.Timeout | null>(null);
  const activeSequenceKeyRef = useRef<string | null>(null);
  const [activeSequenceKey, setActiveSequenceKey] = useState<string | null>(null);
  
  // UI state
  const activeKeysRef = useRef<Set<string>>(new Set());
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  // Loop recording state
  const [isLoopRecording, setIsLoopRecording] = useState(false);
  const [isLoopPlaying, setIsLoopPlaying] = useState(false);
  const recordedLoopRef = useRef<Array<{ sliceNum: number; time: number }>>([]);
  const loopRecordingStartTimeRef = useRef<number>(0);
  const loopPlaybackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Use the audio context from masterGainNode
  const ctx = masterGainNode.ctx;

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);


  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    
    // Load audio buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    setMasterBuffer(buffer);
    
    toast.success("Audio file loaded");
  };

  // Handle WaveSurfer ready
  const handleWaveSurferReady = useCallback((ws: WaveSurfer, regions: RegionsPlugin) => {
    setWavesurfer(ws);
    setRegionsPlugin(regions);

    // Enable region creation
    let startPos: number | null = null;

    regions.on('region-created', (region: WaveSurferRegion) => {
      // Find the lowest available slice number (1-9)
      setSlices(prev => {
        // Find first available slot
        let sliceNum = 1;
        for (let i = 1; i <= 9; i++) {
          if (!prev.has(i)) {
            sliceNum = i;
            break;
          }
        }
        
        if (prev.size >= 9) {
          toast.error("Maximum 9 slices allowed");
          region.remove();
          return prev;
        }

        region.setOptions({
          content: sliceNum.toString(),
          color: 'rgba(135, 206, 235, 0.3)',
          drag: true,
          resize: true,
        });

        const settings: SliceSettings = {
          volume: 1,
          tempo: 1,
          transpose: 0,
          reverb: 0,
          mode: 'classic',
        };

        const newSlices = new Map(prev).set(sliceNum, { region, settings });
        toast.success(`Slice ${sliceNum} created`);
        return newSlices;
      });
    });

    ws.on('click', (relativeX: number) => {
      if (!startPos) {
        startPos = relativeX * ws.getDuration();
      } else {
        const endPos = relativeX * ws.getDuration();
        regions.addRegion({
          start: Math.min(startPos, endPos),
          end: Math.max(startPos, endPos),
        });
        startPos = null;
      }
    });
  }, []);

  // Stop all audio
  const stopAllAudio = useCallback(() => {
    // Stop slice sources
    activeSliceSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source may already be stopped
      }
    });
    activeSliceSourcesRef.current = [];
    
    // Stop all other sources (drums, etc)
    audioSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source may already be stopped
      }
    });
    audioSourcesRef.current = [];
    
    // Stop waveform if playing
    if (wavesurfer?.isPlaying()) {
      wavesurfer.pause();
    }
    
    currentlyPlayingSliceRef.current = null;
    setCurrentlyPlayingSlice(null);
  }, [wavesurfer]);

  // Stop currently playing slice
  const stopCurrentSlice = useCallback(() => {
    activeSliceSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source may already be stopped
      }
    });
    activeSliceSourcesRef.current = [];
    currentlyPlayingSliceRef.current = null;
    setCurrentlyPlayingSlice(null);
  }, []);

  // Play slice
  const playSlice = useCallback((sliceNum: number, skipLoopRecording = false) => {
    if (!masterBuffer || !slices.has(sliceNum)) return;

    // Stop any currently playing slice to prevent overlap
    stopCurrentSlice();

    const { region, settings } = slices.get(sliceNum)!;
    const startTime = region.start;
    const endTime = region.end;
    const duration = endTime - startTime;

    const source = ctx.createBufferSource();
    source.buffer = masterBuffer;

    // Apply settings
    const gainNode = ctx.createGain();
    gainNode.gain.value = settings.volume;

    // Transpose via playback rate
    const playbackRate = Math.pow(2, settings.transpose / 12) * settings.tempo;
    source.playbackRate.value = playbackRate;

    // Simple reverb (convolver would be better but requires impulse response)
    const delay = ctx.createDelay();
    const feedback = ctx.createGain();
    delay.delayTime.value = 0.05;
    feedback.gain.value = settings.reverb * 0.5;
    
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    dryGain.gain.value = 1 - settings.reverb;
    wetGain.gain.value = settings.reverb;

    source.connect(gainNode);
    gainNode.connect(dryGain).connect(masterGainNode.gainNode);
    gainNode.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain).connect(masterGainNode.gainNode);

    source.start(ctx.currentTime, startTime, duration / playbackRate);

    if (settings.mode === 'loop') {
      source.loop = true;
      source.loopStart = startTime;
      source.loopEnd = endTime;
    } else if (settings.mode === 'oneshot') {
      source.stop(ctx.currentTime + duration / playbackRate);
    } else {
      source.stop(ctx.currentTime + duration / playbackRate);
    }

    activeSliceSourcesRef.current.push(source);
    currentlyPlayingSliceRef.current = sliceNum;
    lastPlayedSliceRef.current = sliceNum;
    setCurrentlyPlayingSlice(sliceNum);
    setLastPlayedSlice(sliceNum);

    // Record to loop if loop recording is active
    if (!skipLoopRecording && isLoopRecording) {
      const currentTime = Date.now() - loopRecordingStartTimeRef.current;
      recordedLoopRef.current.push({ sliceNum, time: currentTime });
    }

    // Clean up after playback
    source.onended = () => {
      activeSliceSourcesRef.current = activeSliceSourcesRef.current.filter(s => s !== source);
      if (activeSliceSourcesRef.current.length === 0) {
        currentlyPlayingSliceRef.current = null;
        setCurrentlyPlayingSlice(null);
      }
    };
  }, [masterBuffer, slices, ctx, masterGainNode, stopCurrentSlice, isLoopRecording]);

  // Play drum pad by track index with visual feedback
  const playDrumPad = useCallback((trackIndex: number) => {
    if (sequencerPlayDrumRef.current) {
      sequencerPlayDrumRef.current(trackIndex);
    }
    
    // Visual feedback
    setCurrentlyPlayingDrum(trackIndex);
    setTimeout(() => setCurrentlyPlayingDrum(null), 150); // Flash for 150ms
  }, []);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      
      // Handle spacebar as GLOBAL STOP for everything
      if (e.code === 'Space') {
        e.preventDefault();
        // Stop all audio
        stopAllAudio();
        // Stop sequencer
        setIsSequencerPlaying(false);
        // Stop metronome
        setIsMetronomePlaying(false);
        // Stop any sequence playback
        if (sequencePlaybackRef.current) {
          clearTimeout(sequencePlaybackRef.current);
          sequencePlaybackRef.current = null;
        }
        activeSequenceKeyRef.current = null;
        setActiveSequenceKey(null);
        // Stop loop playback
        if (isLoopPlaying) {
          if (loopPlaybackTimeoutRef.current) {
            clearTimeout(loopPlaybackTimeoutRef.current);
            loopPlaybackTimeoutRef.current = null;
          }
          setIsLoopPlaying(false);
        }
        toast.success('Everything stopped');
        return;
      }
      
      // Handle L key for loop recording/playback
      if (key === 'L') {
        e.preventDefault();
        if (!isLoopRecording && !isLoopPlaying) {
          // Start recording
          setIsLoopRecording(true);
          recordedLoopRef.current = [];
          loopRecordingStartTimeRef.current = Date.now();
          toast.success('Loop recording started - play your slices!');
        } else if (isLoopRecording) {
          // Stop recording and start looping
          if (recordedLoopRef.current.length === 0) {
            toast.error('No slices were played during recording');
            setIsLoopRecording(false);
            return;
          }
          setIsLoopRecording(false);
          setIsLoopPlaying(true);
          
          // Calculate total loop duration
          const loop = recordedLoopRef.current;
          const totalDuration = loop[loop.length - 1].time + 500; // Add 500ms buffer
          
          // Start playing the loop
          const playLoop = () => {
            loop.forEach((event) => {
              setTimeout(() => {
                playSlice(event.sliceNum, true); // Skip loop recording to avoid nested loops
              }, event.time);
            });
            
            // Schedule next loop iteration
            loopPlaybackTimeoutRef.current = setTimeout(playLoop, totalDuration);
          };
          
          playLoop();
          toast.success(`Loop playing (${loop.length} slices)`);
        } else if (isLoopPlaying) {
          // Stop loop playback
          if (loopPlaybackTimeoutRef.current) {
            clearTimeout(loopPlaybackTimeoutRef.current);
            loopPlaybackTimeoutRef.current = null;
          }
          setIsLoopPlaying(false);
          recordedLoopRef.current = [];
          toast.success('Loop stopped');
        }
        return;
      }
      
      if (activeKeysRef.current.has(key)) return;
      
      activeKeysRef.current.add(key);
      setActiveKeys(new Set(activeKeysRef.current));

      // Check for slice keys
      const sliceNum = parseInt(key);
      if (!isNaN(sliceNum) && sliceNum >= 1 && sliceNum <= 9) {
        playSlice(sliceNum);
        setActiveSlice(sliceNum);
      }

      // D/F/G = drum pads one-shots
      if (["D", "F", "G"].includes(key)) {
        const idx = { D: 0, F: 1, G: 2 }[key];
        playDrumPad(idx);
      }
      // H/J/K = mapped sequence loops
      if (["H", "J", "K"].includes(key)) {
        if (activeSequenceKeyRef.current === key) {
          if (sequencePlaybackRef.current) clearTimeout(sequencePlaybackRef.current);
          sequencePlaybackRef.current = null;
          activeSequenceKeyRef.current = null;
          setActiveSequenceKey(null);
          return;
        }
        const seq = mappedSequences.current[key];
        if (seq) {
          let step = 0;
          const steps = seq[0].length;
          const bpmLocal = bpm;
          const stepDuration = (60 / bpmLocal / 4) * 1000;
          activeSequenceKeyRef.current = key;
          setActiveSequenceKey(key);
          function playStep() {
            // Play all tracks for current step
            for (let i = 0; i < 3; i++) {
              if (seq[i][step] && sequencerPlayDrumRef.current) {
                sequencerPlayDrumRef.current(i);
              }
            }
            // Move to next step
            step = (step + 1) % steps;
            // Schedule next step if still playing this sequence
            if (activeSequenceKeyRef.current === key) {
              sequencePlaybackRef.current = setTimeout(playStep, stepDuration);
            }
          }
          // Clear any existing playback before starting
          if (sequencePlaybackRef.current) clearTimeout(sequencePlaybackRef.current);
          // Start the sequence
          playStep();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      activeKeysRef.current.delete(key);
      setActiveKeys(new Set(activeKeysRef.current));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (sequencePlaybackRef.current) clearTimeout(sequencePlaybackRef.current);
      sequencePlaybackRef.current = null;
      activeSequenceKeyRef.current = null;
      setActiveSequenceKey(null);
    };
  }, [playSlice, playDrumPad, stopAllAudio, bpm, ctx, masterGainNode.gainNode]);

  // Update slice settings
  const updateSliceSettings = (sliceNum: number, settings: SliceSettings) => {
    setSlices(prev => {
      const newSlices = new Map(prev);
      const slice = newSlices.get(sliceNum);
      if (slice) {
        newSlices.set(sliceNum, { ...slice, settings });
      }
      return newSlices;
    });
  };

  // Delete slice
  const deleteSlice = (sliceNum: number) => {
    setSlices(prev => {
      const newSlices = new Map(prev);
      const slice = newSlices.get(sliceNum);
      if (slice) {
        // Remove the region from wavesurfer
        slice.region.remove();
        newSlices.delete(sliceNum);
        
        // If this was the active slice, clear it
        if (activeSlice === sliceNum) {
          setActiveSlice(null);
        }
        
        // Stop playing if this slice is currently playing
        if (currentlyPlayingSlice === sliceNum) {
          stopCurrentSlice();
        }
        
        toast.success(`Slice ${sliceNum} deleted`);
      }
      return newSlices;
    });
  };

  // Handle drum sample upload by track index


  // Recording - proper implementation with master gain routing
  const startRecording = () => {
    try {
      // Create a media stream destination for recording
      const dest = ctx.createMediaStreamDestination();
      recordingDestRef.current = dest;
      
      // Connect master gain to the recording destination
      masterGainNode.gainNode.connect(dest);
      
      // Create a media recorder from the destination stream
      const mediaRecorder = new MediaRecorder(dest.stream, {
        mimeType: 'audio/webm'
      });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        
        // Disconnect recording destination
        if (recordingDestRef.current) {
          masterGainNode.gainNode.disconnect(recordingDestRef.current);
          recordingDestRef.current = null;
        }
        
        toast.success("Recording complete");
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started - play slices and drums!");
    } catch (error) {
      toast.error("Recording not supported in this browser");
      console.error(error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const downloadRecording = async () => {
    if (!recordedBlob) return;

    // Check if user is logged in
    if (!user || !session) {
      setAuthModalOpen(true);
      toast.error("Please log in to download");
      return;
    }

    try {
      // Validate download permission server-side
      const { data: validation, error: validationError } = await supabase.functions.invoke(
        'validate-download',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (validationError) {
        console.error("Validation error:", validationError);
        toast.error("Failed to validate download permission");
        return;
      }

      if (!validation.allowed) {
        toast.error(validation.message);
        return;
      }

      const isPremium = validation.isPremium;
      const format = validation.format;

      // Premium users get WAV format, free users get WEBM
      if (isPremium && format === 'wav') {
        // Convert webm blob to audio buffer, then to WAV
        const arrayBuffer = await recordedBlob.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const wavBuffer = audioBufferToWav(audioBuffer);
        const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        downloadBlob(wavBlob, 'performance.wav');
        
        // Track the download
        await supabase.from("downloads").insert({
          user_id: user.id,
          file_format: "wav",
        });
        
        toast.success("Premium WAV downloaded!");
      } else {
        // Free users download as webm
        downloadBlob(recordedBlob, 'performance.webm');
        
        // Track the download
        await supabase.from("downloads").insert({
          user_id: user.id,
          file_format: "webm",
        });
        
        toast.success("Free WEBM downloaded! Upgrade to Premium for WAV format.");
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error downloading:", error);
      }
      toast.error("Error during download");
    }
  };

  // Mapping handler for sequencer
  const handleMapSequencerKey = (key: string, pattern: boolean[][]) => {
    mappedSequences.current[key] = pattern.map(row => [...row]); // Deep copy
    toast.success(`Sequence mapped to ${key}`);
  };

  const handleClearMap = (key: string) => {
    delete mappedSequences.current[key];
    toast.success(`Mapping for ${key} cleared`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* File input */}
        <div>
          <label htmlFor="audio-file">
            <Button variant="outline" asChild>
              <span className="cursor-pointer">Input file</span>
            </Button>
          </label>
          <input
            id="audio-file"
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Waveform */}
        {audioFile && (
          <div className="space-y-2">
            <WaveformDisplay
              audioFile={audioFile}
              onWaveSurferReady={handleWaveSurferReady}
            />
            <div className="text-xs text-muted-foreground text-center">
              Press <kbd className="px-1.5 py-0.5 bg-secondary rounded border border-border">Spacebar</kbd> to stop all audio / replay last sample
            </div>
          </div>
        )}

        {/* Main controls grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Slice controls */}
          <div>
            {activeSlice && slices.has(activeSlice) && (
              <SliceControls
                sliceNumber={activeSlice}
                settings={slices.get(activeSlice)!.settings}
                onSettingsChange={(settings) => updateSliceSettings(activeSlice, settings)}
                onDelete={() => deleteSlice(activeSlice)}
              />
            )}
          </div>

          {/* Sequencer with embedded Metronome */}
          <div className="space-y-4">
            <Sequencer
              bpm={bpm}
              isPlaying={isSequencerPlaying}
              onTriggerSample={playDrumPad}
              sampleNames={[]}
              metronome={
                <Metronome
                  bpm={bpm}
                  onBpmChange={setBpm}
                  isPlaying={isMetronomePlaying}
                  onToggle={() => setIsMetronomePlaying(!isMetronomePlaying)}
                />
              }
              onTogglePlay={() => setIsSequencerPlaying(prev => !prev)}
              onMapKey={handleMapSequencerKey}
              onClearMap={handleClearMap}
              sequenceKeysInfo={{ mapped: mappedSequences.current, active: activeSequenceKey }}
              onPlayDrumReady={(playDrum) => {
                sequencerPlayDrumRef.current = playDrum;
              }}
            />
          </div>
        </div>

        {/* Keyboard triggers */}
        <KeyboardTriggers 
          activeKeys={activeKeys} 
          isLoopRecording={isLoopRecording}
          isLoopPlaying={isLoopPlaying}
          currentlyPlayingSlice={currentlyPlayingSlice}
          currentlyPlayingDrum={currentlyPlayingDrum}
          onSlicePlay={playSlice}
          onDrumPlay={playDrumPad}
          onSequenceToggle={(key) => {
            // Handle sequence toggle (H/J/K)
            if (activeSequenceKeyRef.current === key) {
              if (sequencePlaybackRef.current) clearTimeout(sequencePlaybackRef.current);
              sequencePlaybackRef.current = null;
              activeSequenceKeyRef.current = null;
              setActiveSequenceKey(null);
              return;
            }
            const seq = mappedSequences.current[key];
            if (seq) {
              let step = 0;
              const steps = seq[0].length;
              const bpmLocal = bpm;
              const stepDuration = (60 / bpmLocal / 4) * 1000;
              activeSequenceKeyRef.current = key;
              setActiveSequenceKey(key);
              function playStep() {
                for (let i = 0; i < 3; i++) {
                  if (seq[i][step] && sequencerPlayDrumRef.current) {
                    sequencerPlayDrumRef.current(i);
                  }
                }
                step = (step + 1) % steps;
                if (activeSequenceKeyRef.current === key) {
                  sequencePlaybackRef.current = setTimeout(playStep, stepDuration);
                }
              }
              if (sequencePlaybackRef.current) clearTimeout(sequencePlaybackRef.current);
              playStep();
            }
          }}
          onLoopToggle={() => {
            // Handle L key - loop recording/playback toggle
            if (!isLoopRecording && !isLoopPlaying) {
              setIsLoopRecording(true);
              recordedLoopRef.current = [];
              loopRecordingStartTimeRef.current = Date.now();
              toast.success('Loop recording started');
            } else if (isLoopRecording) {
              if (recordedLoopRef.current.length === 0) {
                toast.error('No slices recorded');
                setIsLoopRecording(false);
                return;
              }
              setIsLoopRecording(false);
              setIsLoopPlaying(true);
              
              const loop = recordedLoopRef.current;
              const totalDuration = loop[loop.length - 1].time + 500;
              
              const playLoop = () => {
                loop.forEach((event) => {
                  setTimeout(() => {
                    playSlice(event.sliceNum, true);
                  }, event.time);
                });
                loopPlaybackTimeoutRef.current = setTimeout(playLoop, totalDuration);
              };
              
              playLoop();
              toast.success(`Loop playing (${loop.length} slices)`);
            } else if (isLoopPlaying) {
              if (loopPlaybackTimeoutRef.current) {
                clearTimeout(loopPlaybackTimeoutRef.current);
                loopPlaybackTimeoutRef.current = null;
              }
              setIsLoopPlaying(false);
              recordedLoopRef.current = [];
              toast.success('Loop stopped');
            }
          }}
          onGlobalStop={stopAllAudio}
        />

        {/* Recording controls */}
        <RecordingControls
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onDownloadRecording={downloadRecording}
          hasRecording={!!recordedBlob}
        />

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </main>
    </div>
  );
};

// Utility functions
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const data = new Float32Array(buffer.length * numChannels);
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    const channelData = buffer.getChannelData(i);
    for (let j = 0; j < buffer.length; j++) {
      data[j * numChannels + i] = channelData[j];
    }
  }

  const dataLength = data.length * bytesPerSample;
  const headerLength = 44;
  const wav = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(wav);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  return wav;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default Index;
