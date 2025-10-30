import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import * as Tone from "tone";
import Header from "@/components/Header";
import WaveformDisplay from "@/components/WaveformDisplay";
import SliceControls, { SliceSettings } from "@/components/SliceControls";
import Sequencer from "@/components/Sequencer";
import SmartCleanKnob from "@/components/SmartCleanKnob";
import KeyboardTriggers from "@/components/KeyboardTriggers";
import RecordingControls from "@/components/RecordingControls";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
  const [regionsPlugin, setRegionsPlugin] = useState<RegionsPlugin | null>(null);
  const [masterBuffer, setMasterBuffer] = useState<AudioBuffer | null>(null);
  
  // Tempo and playback state
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Slice state
  const [slices, setSlices] = useState<Map<number, { region: any; settings: SliceSettings }>>(new Map());
  const [activeSlice, setActiveSlice] = useState<number | null>(null);
  const [nextSliceNumber, setNextSliceNumber] = useState(1);
  const [currentlyPlayingSlice, setCurrentlyPlayingSlice] = useState<number | null>(null);
  const [lastPlayedSlice, setLastPlayedSlice] = useState<number | null>(null);
  const activeSliceSourcesRef = useRef<Tone.Player[]>([]);
  
  // UI state
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [cleanValue, setCleanValue] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Initialize Tone.js
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    
    // Load audio buffer using Tone.js
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await Tone.context.decodeAudioData(arrayBuffer);
    setMasterBuffer(buffer);
    
    toast.success("Audio file loaded");
  };

  // Handle WaveSurfer ready
  const handleWaveSurferReady = useCallback((ws: WaveSurfer, regions: RegionsPlugin) => {
    setWavesurfer(ws);
    setRegionsPlugin(regions);

    // Enable region creation
    let startPos: number | null = null;

    regions.on('region-created', (region: any) => {
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
    activeSliceSourcesRef.current.forEach(player => {
      if (player.state === "started") {
        player.stop();
      }
    });
    activeSliceSourcesRef.current = [];
    
    // Stop transport and waveform
    Tone.Transport.stop();
    setIsPlaying(false);
    
    if (wavesurfer?.isPlaying()) {
      wavesurfer.pause();
    }
    
    setCurrentlyPlayingSlice(null);
  }, [wavesurfer]);

  // Stop currently playing slice
  const stopCurrentSlice = useCallback(() => {
    activeSliceSourcesRef.current.forEach(player => {
      if (player.state === "started") {
        player.stop();
      }
    });
    activeSliceSourcesRef.current = [];
    setCurrentlyPlayingSlice(null);
  }, []);

  // Play slice with 5ms fade-in and tempo sync
  const playSlice = useCallback((sliceNum: number) => {
    if (!masterBuffer || !slices.has(sliceNum)) return;

    // Stop any currently playing slice to prevent overlap
    stopCurrentSlice();

    const { region, settings } = slices.get(sliceNum)!;
    const startTime = region.start;
    const duration = region.end - startTime;

    // Create Tone.js player from buffer
    const player = new Tone.Player({
      url: masterBuffer,
      fadeIn: 0.005, // 5ms fade-in
    }).toDestination();

    // Apply settings
    player.volume.value = Tone.gainToDb(settings.volume);
    player.playbackRate = Math.pow(2, settings.transpose / 12) * settings.tempo;

    // Reverb
    if (settings.reverb > 0) {
      const reverb = new Tone.Reverb({
        decay: 2,
        wet: settings.reverb,
      }).toDestination();
      player.connect(reverb);
    }

    // Start playback
    const playDuration = duration / player.playbackRate;
    player.start(Tone.now(), startTime, playDuration);

    if (settings.mode === 'loop') {
      player.loop = true;
      player.loopStart = startTime;
      player.loopEnd = region.end;
    }

    activeSliceSourcesRef.current.push(player);
    setCurrentlyPlayingSlice(sliceNum);
    setLastPlayedSlice(sliceNum);

    // Clean up after playback
    player.onstop = () => {
      activeSliceSourcesRef.current = activeSliceSourcesRef.current.filter(p => p !== player);
      if (activeSliceSourcesRef.current.length === 0) {
        setCurrentlyPlayingSlice(null);
      }
      player.dispose();
    };

    if (settings.mode !== 'loop') {
      setTimeout(() => {
        if (player.state === "started") {
          player.stop();
        }
      }, playDuration * 1000);
    }
  }, [masterBuffer, slices, stopCurrentSlice]);


  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      
      // Handle spacebar for transport control
      if (e.code === 'Space') {
        e.preventDefault();
        
        // Start Tone.js context if needed
        if (Tone.context.state !== 'running') {
          await Tone.start();
        }
        
        if (isPlaying || currentlyPlayingSlice !== null) {
          stopAllAudio();
        } else {
          // Start transport
          setIsPlaying(true);
          Tone.Transport.start();
          
          // If there was a last played slice, replay it
          if (lastPlayedSlice !== null) {
            playSlice(lastPlayedSlice);
          }
        }
        return;
      }
      
      if (activeKeys.has(key)) return;
      
      setActiveKeys(prev => new Set(prev).add(key));

      // Check for slice keys
      const sliceNum = parseInt(key);
      if (!isNaN(sliceNum) && sliceNum >= 1 && sliceNum <= 9) {
        // Start Tone.js context if needed
        if (Tone.context.state !== 'running') {
          await Tone.start();
        }
        playSlice(sliceNum);
        setActiveSlice(sliceNum);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      setActiveKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playSlice, activeKeys, currentlyPlayingSlice, lastPlayedSlice, stopAllAudio, isPlaying]);

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


  // Enhanced Smart clean processing
  const processCleanAudio = useCallback(async () => {
    if (!masterBuffer) return null;

    const offlineContext = new OfflineAudioContext(
      masterBuffer.numberOfChannels,
      masterBuffer.length,
      masterBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = masterBuffer;

    let lastNode: AudioNode = source;

    if (cleanValue > 0) {
      // Light highpass + compression (1-40%)
      const hpFilter = offlineContext.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.value = 50 + (cleanValue / 100) * 150;
      lastNode.connect(hpFilter);
      lastNode = hpFilter;

      // Add compression above 1%
      if (cleanValue > 1) {
        const compressor = offlineContext.createDynamicsCompressor();
        compressor.threshold.value = -20 - (cleanValue / 100) * 10;
        compressor.knee.value = 8;
        compressor.ratio.value = 3 + (cleanValue / 100) * 9;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.15;
        lastNode.connect(compressor);
        lastNode = compressor;
      }

      // Stronger processing (41-70%)
      if (cleanValue > 40) {
        const noiseGate = offlineContext.createBiquadFilter();
        noiseGate.type = 'highpass';
        noiseGate.frequency.value = 150 + ((cleanValue - 40) / 30) * 250;
        lastNode.connect(noiseGate);
        lastNode = noiseGate;
      }

      // Aggressive clean (71-100%)
      if (cleanValue > 70) {
        const lpFilter = offlineContext.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.value = 12000 - ((cleanValue - 70) / 30) * 4000;
        lastNode.connect(lpFilter);
        lastNode = lpFilter;

        // Final limiter
        const limiter = offlineContext.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.001;
        limiter.release.value = 0.1;
        lastNode.connect(limiter);
        lastNode = limiter;
      }
    }

    lastNode.connect(offlineContext.destination);
    source.start();

    return await offlineContext.startRendering();
  }, [masterBuffer, cleanValue]);

  const handleListen = async () => {
    setIsProcessing(true);
    try {
      const processedBuffer = await processCleanAudio();
      if (processedBuffer) {
        // Start Tone.js context if needed
        if (Tone.context.state !== 'running') {
          await Tone.start();
        }
        
        const player = new Tone.Player(processedBuffer).toDestination();
        player.start();
        toast.success("Playing cleaned audio (press spacebar to stop)");
      }
    } catch (error) {
      toast.error("Error processing audio");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadClean = async () => {
    setIsProcessing(true);
    try {
      const processedBuffer = await processCleanAudio();
      if (processedBuffer) {
        const wav = audioBufferToWav(processedBuffer);
        const blob = new Blob([wav], { type: 'audio/wav' });
        downloadBlob(blob, 'cleaned-audio.wav');
        toast.success("Download started");
      }
    } catch (error) {
      toast.error("Error exporting audio");
    } finally {
      setIsProcessing(false);
    }
  };

  // Recording with Tone.js
  const startRecording = async () => {
    try {
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }

      const dest = Tone.context.createMediaStreamDestination();
      Tone.getDestination().connect(dest);
      
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
        toast.success("Recording complete");
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started - play slices and sequencer!");
    } catch (error) {
      toast.error("Recording not supported in this browser");
      console.error(error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const downloadRecording = () => {
    if (recordedBlob) {
      downloadBlob(recordedBlob, `blipbloop_perf_${bpm}bpm.webm`);
      toast.success("Performance downloaded");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header bpm={bpm} onBpmChange={setBpm} isPlaying={isPlaying} />
      
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
              Press <kbd className="px-1.5 py-0.5 bg-secondary rounded border border-border">Spacebar</kbd> to start/stop metronome + sequencer
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

          {/* Smart clean */}
          <div>
            <SmartCleanKnob
              value={cleanValue}
              onChange={setCleanValue}
              onListen={handleListen}
              onDownload={handleDownloadClean}
              isProcessing={isProcessing}
            />
          </div>
        </div>

        {/* Sequencer */}
        <Sequencer bpm={bpm} isPlaying={isPlaying} />

        {/* Keyboard triggers */}
        <KeyboardTriggers activeKeys={activeKeys} />

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
