import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import Header from "@/components/Header";
import WaveformDisplay from "@/components/WaveformDisplay";
import SliceControls, { SliceSettings } from "@/components/SliceControls";
import Metronome from "@/components/Metronome";
import Sequencer from "@/components/Sequencer";
import SmartCleanKnob from "@/components/SmartCleanKnob";
import KeyboardTriggers from "@/components/KeyboardTriggers";
import RecordingControls from "@/components/RecordingControls";
import { Button } from "@/components/ui/button";
import { convertAudioToFormat } from "@/lib/audioConverter";

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
  const [nextSliceNumber, setNextSliceNumber] = useState(1);
  const [currentlyPlayingSlice, setCurrentlyPlayingSlice] = useState<number | null>(null);
  const [lastPlayedSlice, setLastPlayedSlice] = useState<number | null>(null);
  const activeSliceSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const currentlyPlayingSliceRef = useRef<number | null>(null);
  const lastPlayedSliceRef = useRef<number | null>(null);
  
  // Metronome & Sequencer state
  const [bpm, setBpm] = useState(120);
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [isSequencerPlaying, setIsSequencerPlaying] = useState(false);
  const [isSequencerExpanded, setIsSequencerExpanded] = useState(false);
  
  // Drum state (6 tracks for sequencer)
  const [drumPads, setDrumPads] = useState<DrumPad[]>([
    { sampleName: 'Kick', audioBuffer: null },
    { sampleName: 'Snare', audioBuffer: null },
    { sampleName: 'Closed Hat', audioBuffer: null },
  ]);
  const drumPadsRef = useRef<DrumPad[]>([
    { sampleName: 'Kick', audioBuffer: null },
    { sampleName: 'Snare', audioBuffer: null },
    { sampleName: 'Closed Hat', audioBuffer: null },
  ]);

  const mappedSequences = useRef<{[key: string]: boolean[][]}>({});
  const sequencePlaybackRef = useRef<NodeJS.Timeout | null>(null);
  const activeSequenceKeyRef = useRef<string | null>(null);
  const [activeSequenceKey, setActiveSequenceKey] = useState<string | null>(null);
  
  // UI state
  const activeKeysRef = useRef<Set<string>>(new Set());
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [cleanValue, setCleanValue] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  
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
  const cleanPlaybackSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isSmartCleanPlaying, setIsSmartCleanPlaying] = useState(false);

  // Use the audio context from masterGainNode
  const ctx = masterGainNode.ctx;

  // Load drum samples for manual play on mount
  useEffect(() => {
    const ctx = masterGainNode.ctx;
    const FILES = [
      '/drum-kit/KICK1.wav', '/drum-kit/Snare1.wav', '/drum-kit/HH1.wav'
    ];
    Promise.all(FILES.map(async (url) => {
      const resp = await fetch(url);
      const arr = await resp.arrayBuffer();
      return ctx.decodeAudioData(arr);
    })).then(buffers => {
      const newPads = [
        { sampleName: 'Kick 1', audioBuffer: buffers[0] },
        { sampleName: 'Snare 1', audioBuffer: buffers[1] },
        { sampleName: 'HH 1', audioBuffer: buffers[2] }
      ];
      drumPadsRef.current = newPads;
      setDrumPads(newPads);
    });
  }, [masterGainNode.ctx]);

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
      // Use a closure to capture the current nextSliceNumber
      setNextSliceNumber(currentNum => {
        if (currentNum > 9) {
          toast.error("Maximum 9 slices allowed");
          region.remove();
          return currentNum;
        }

        const sliceNum = currentNum;
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

        setSlices(prev => new Map(prev).set(sliceNum, { region, settings }));
        toast.success(`Slice ${sliceNum} created`);
        
        return currentNum + 1;
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

  // Play drum pad by track index
  const playDrumPad = useCallback((trackIndex: number) => {
    const pad = drumPadsRef.current[trackIndex];
    if (!pad?.audioBuffer) return;

    const source = ctx.createBufferSource();
    source.buffer = pad.audioBuffer;
    source.connect(masterGainNode.gainNode);
    source.start();
    audioSourcesRef.current.push(source);
  }, [ctx, masterGainNode]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      
      // Handle spacebar to stop all audio and replay last sample
      if (e.code === 'Space') {
        e.preventDefault();
        if (currentlyPlayingSliceRef.current !== null || audioSourcesRef.current.length > 0) {
          // If anything is playing, stop everything
          stopAllAudio();
        } else if (lastPlayedSliceRef.current !== null) {
          // If nothing playing, replay the last slice
          playSlice(lastPlayedSliceRef.current);
        }
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
              if (seq[i][step] && drumPadsRef.current[i]?.audioBuffer) {
                const source = ctx.createBufferSource();
                source.buffer = drumPadsRef.current[i].audioBuffer!;
                source.connect(masterGainNode.gainNode);
                source.start();
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
  const handleDrumSampleUpload = async (trackIndex: number, file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    
    const newPads = drumPadsRef.current.map((pad, idx) => 
      idx === trackIndex 
        ? { ...pad, sampleName: file.name, audioBuffer: buffer }
        : pad
    );
    drumPadsRef.current = newPads;
    setDrumPads(newPads);
    
    toast.success(`Sample loaded for track ${trackIndex + 1}`);
  };

  // Enhanced Smart Clean processing with Web Audio API filters
  const processCleanAudio = useCallback(async () => {
    if (!masterBuffer) return null;
    
    const offlineContext = new OfflineAudioContext(
      masterBuffer.numberOfChannels,
      masterBuffer.length,
      masterBuffer.sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = masterBuffer;
    
    // Clean intensity from 0-100
    const intensity = cleanValue / 100;
    
    if (intensity === 0) {
      // Bypass processing
      source.connect(offlineContext.destination);
      source.start();
      return await offlineContext.startRendering();
    }
    
    // Create processing chain based on intensity
    let currentNode: AudioNode = source;
    
    // 1. High-pass filter - removes low-frequency rumble and hum
    if (intensity > 0.1) {
      const hpFilter = offlineContext.createBiquadFilter();
      hpFilter.type = 'highpass';
      // Increase cutoff frequency with intensity (50Hz to 150Hz)
      hpFilter.frequency.value = 50 + (intensity * 100);
      hpFilter.Q.value = 0.7;
      currentNode.connect(hpFilter);
      currentNode = hpFilter;
    }
    
    // 2. Notch filters for common electrical noise (50/60Hz hum)
    if (intensity > 0.3) {
      const notch60 = offlineContext.createBiquadFilter();
      notch60.type = 'notch';
      notch60.frequency.value = 60;
      notch60.Q.value = 10;
      currentNode.connect(notch60);
      currentNode = notch60;
      
      const notch120 = offlineContext.createBiquadFilter();
      notch120.type = 'notch';
      notch120.frequency.value = 120;
      notch120.Q.value = 10;
      currentNode.connect(notch120);
      currentNode = notch120;
    }
    
    // 3. Noise gate simulation using dynamics compressor
    if (intensity > 0.2) {
      const compressor = offlineContext.createDynamicsCompressor();
      // Aggressive settings to act as noise gate
      compressor.threshold.value = -50 + (intensity * 30); // -50dB to -20dB
      compressor.knee.value = 0; // Hard knee
      compressor.ratio.value = 12 + (intensity * 8); // 12:1 to 20:1
      compressor.attack.value = 0.001; // Fast attack
      compressor.release.value = 0.05; // Quick release
      currentNode.connect(compressor);
      currentNode = compressor;
    }
    
    // 4. Multi-band EQ for noise reduction
    if (intensity > 0.4) {
      // Reduce low-mids (mud region)
      const lowMid = offlineContext.createBiquadFilter();
      lowMid.type = 'peaking';
      lowMid.frequency.value = 250;
      lowMid.Q.value = 1.0;
      lowMid.gain.value = -3 - (intensity * 6); // -3dB to -9dB
      currentNode.connect(lowMid);
      currentNode = lowMid;
      
      // Boost presence for clarity
      const presence = offlineContext.createBiquadFilter();
      presence.type = 'peaking';
      presence.frequency.value = 3000;
      presence.Q.value = 1.5;
      presence.gain.value = 2 + (intensity * 3); // +2dB to +5dB
      currentNode.connect(presence);
      currentNode = presence;
    }
    
    // 5. De-esser (reduce harsh highs)
    if (intensity > 0.6) {
      const deEss = offlineContext.createBiquadFilter();
      deEss.type = 'highshelf';
      deEss.frequency.value = 8000;
      deEss.gain.value = -2 - (intensity * 4); // -2dB to -6dB
      currentNode.connect(deEss);
      currentNode = deEss;
    }
    
    // 6. Final limiter to prevent clipping
    if (intensity > 0.5) {
      const limiter = offlineContext.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.1;
      currentNode.connect(limiter);
      currentNode = limiter;
    }
    
    // 7. Output gain compensation
    const outputGain = offlineContext.createGain();
    // Compensate for volume loss from filtering
    outputGain.gain.value = 1.0 + (intensity * 0.3);
    currentNode.connect(outputGain);
    outputGain.connect(offlineContext.destination);
    
    source.start();
    return await offlineContext.startRendering();
  }, [masterBuffer, cleanValue]);

  const handleListenToggle = async () => {
    if (isSmartCleanPlaying) {
      try { cleanPlaybackSourceRef.current?.stop(); } catch(e) { void e; }
      cleanPlaybackSourceRef.current = null;
      setIsSmartCleanPlaying(false);
      return;
    }
    setIsProcessing(true);
    setIsSmartCleanPlaying(true);
    try {
      const processedBuffer = await processCleanAudio();
      if (processedBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = processedBuffer;
        source.connect(masterGainNode.gainNode);
        source.start();
        cleanPlaybackSourceRef.current = source;
        toast.success("Playing cleaned audio");
        source.onended = () => {
          if (cleanPlaybackSourceRef.current === source) cleanPlaybackSourceRef.current = null;
          setIsSmartCleanPlaying(false);
        };
      }
    } catch (error) {
      toast.error("Error processing audio");
      setIsSmartCleanPlaying(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopListen = () => {
    try {
      cleanPlaybackSourceRef.current?.stop();
    } catch (e) {
      void e;
    }
    cleanPlaybackSourceRef.current = null;
  };

  const handleDownloadClean = async (format: 'wav' | 'mp3') => {
    setIsProcessing(true);
    try {
      const processedBuffer = await processCleanAudio();
      if (processedBuffer) {
        const wav = audioBufferToWav(processedBuffer);
        const wavBlob = new Blob([wav], { type: 'audio/wav' });
        
        const finalBlob = format === 'mp3' 
          ? await convertAudioToFormat(wavBlob, 'mp3')
          : wavBlob;
        
        const extension = format === 'mp3' ? 'mp3' : 'wav';
        downloadBlob(finalBlob, `cleaned-audio.${extension}`);
        toast.success("Download started");
      }
    } catch (error) {
      toast.error("Error exporting audio");
    } finally {
      setIsProcessing(false);
    }
  };

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

  const downloadRecording = async (format: 'wav' | 'mp3') => {
    if (recordedBlob) {
      try {
        const finalBlob = format === 'mp3' 
          ? await convertAudioToFormat(recordedBlob, 'mp3')
          : recordedBlob;
        
        const extension = format === 'mp3' ? 'mp3' : 'webm';
        downloadBlob(finalBlob, `performance.${extension}`);
        toast.success("Performance downloaded");
      } catch (error) {
        console.error('Error converting audio:', error);
        toast.error("Error during download");
      }
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          <div>
            <Sequencer
              bpm={bpm}
              isPlaying={isSequencerPlaying}
              onTriggerSample={playDrumPad}
              sampleNames={drumPads.map(pad => pad.sampleName)}
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
            />
          </div>

          {/* Smart cleaner */}
          <div>
            <SmartCleanKnob
              value={cleanValue}
              onChange={setCleanValue}
              onListen={handleListenToggle}
              isPlaying={isSmartCleanPlaying}
              onDownload={handleDownloadClean}
              isProcessing={isProcessing}
            />
          </div>
        </div>

        {/* Keyboard triggers */}
        <KeyboardTriggers 
          activeKeys={activeKeys} 
          isLoopRecording={isLoopRecording}
          isLoopPlaying={isLoopPlaying}
        />

        {/* Recording controls */}
        <RecordingControls
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onDownloadRecording={downloadRecording}
          hasRecording={!!recordedBlob}
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
