import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import Header from "@/components/Header";
import WaveformDisplay from "@/components/WaveformDisplay";
import SliceControls, { SliceSettings } from "@/components/SliceControls";
import DrumPads, { DrumPad } from "@/components/DrumPads";
import SmartCleanKnob from "@/components/SmartCleanKnob";
import KeyboardTriggers from "@/components/KeyboardTriggers";
import RecordingControls from "@/components/RecordingControls";
import { Button } from "@/components/ui/button";

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
  const [slices, setSlices] = useState<Map<number, { region: any; settings: SliceSettings }>>(new Map());
  const [activeSlice, setActiveSlice] = useState<number | null>(null);
  const [nextSliceNumber, setNextSliceNumber] = useState(1);
  
  // Drum state
  const [drumPads, setDrumPads] = useState<DrumPad[]>([
    { key: 'D', sampleName: 'kick1', audioBuffer: null, eq: { low: 0, mid: 0, high: 0 } },
    { key: 'F', sampleName: 'snare2', audioBuffer: null, eq: { low: 0, mid: 0, high: 0 } },
    { key: 'G', sampleName: 'hihat2', audioBuffer: null, eq: { low: 0, mid: 0, high: 0 } },
    { key: 'H', sampleName: 'kick1', audioBuffer: null, eq: { low: 0, mid: 0, high: 0 } },
    { key: 'J', sampleName: 'snare2', audioBuffer: null, eq: { low: 0, mid: 0, high: 0 } },
    { key: 'K', sampleName: 'hihat2', audioBuffer: null, eq: { low: 0, mid: 0, high: 0 } },
  ]);
  
  // UI state
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [cleanValue, setCleanValue] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Use the audio context from masterGainNode
  const ctx = masterGainNode.ctx;

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

    regions.on('region-created', (region: any) => {
      if (nextSliceNumber > 9) {
        toast.error("Maximum 9 slices allowed");
        region.remove();
        return;
      }

      const sliceNum = nextSliceNumber;
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
      setNextSliceNumber(prev => prev + 1);
      toast.success(`Slice ${sliceNum} created`);
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
  }, [nextSliceNumber, ctx]);

  // Play slice
  const playSlice = useCallback((sliceNum: number) => {
    if (!masterBuffer || !slices.has(sliceNum)) return;

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

    audioSourcesRef.current.push(source);

    // Clean up after playback
    source.onended = () => {
      audioSourcesRef.current = audioSourcesRef.current.filter(s => s !== source);
    };
  }, [masterBuffer, slices, ctx, masterGainNode]);

  // Play drum pad
  const playDrumPad = useCallback((key: string) => {
    const pad = drumPads.find(p => p.key === key);
    if (!pad?.audioBuffer) return;

    const source = ctx.createBufferSource();
    source.buffer = pad.audioBuffer;

    // Apply EQ
    const lowFilter = ctx.createBiquadFilter();
    lowFilter.type = 'lowshelf';
    lowFilter.frequency.value = 200;
    lowFilter.gain.value = pad.eq.low;

    const midFilter = ctx.createBiquadFilter();
    midFilter.type = 'peaking';
    midFilter.frequency.value = 1000;
    midFilter.gain.value = pad.eq.mid;
    midFilter.Q.value = 1;

    const highFilter = ctx.createBiquadFilter();
    highFilter.type = 'highshelf';
    highFilter.frequency.value = 3000;
    highFilter.gain.value = pad.eq.high;

    source.connect(lowFilter);
    lowFilter.connect(midFilter);
    midFilter.connect(highFilter);
    highFilter.connect(masterGainNode.gainNode);

    source.start();
    audioSourcesRef.current.push(source);
  }, [drumPads, ctx, masterGainNode]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      
      if (activeKeys.has(key)) return;
      
      setActiveKeys(prev => new Set(prev).add(key));

      // Check for slice keys
      const sliceNum = parseInt(key);
      if (!isNaN(sliceNum) && sliceNum >= 1 && sliceNum <= 9) {
        playSlice(sliceNum);
        setActiveSlice(sliceNum);
      }

      // Check for drum keys
      if (['D', 'F', 'G', 'H', 'J', 'K'].includes(key)) {
        playDrumPad(key);
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
  }, [playSlice, playDrumPad, activeKeys]);

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

  // Handle drum sample upload
  const handleDrumSampleUpload = async (key: string, file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    
    setDrumPads(prev => prev.map(pad => 
      pad.key === key 
        ? { ...pad, sampleName: file.name, audioBuffer: buffer }
        : pad
    ));
    
    toast.success(`Sample loaded for ${key}`);
  };

  // Handle drum EQ change
  const handleDrumEQChange = (key: string, eq: { low: number; mid: number; high: number }) => {
    setDrumPads(prev => prev.map(pad => 
      pad.key === key ? { ...pad, eq } : pad
    ));
  };

  // Smart clean processing
  const processCleanAudio = useCallback(async () => {
    if (!masterBuffer) return null;

    const offlineContext = new OfflineAudioContext(
      masterBuffer.numberOfChannels,
      masterBuffer.length,
      masterBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = masterBuffer;

    // Build processing chain based on clean value
    let lastNode: AudioNode = source;

    if (cleanValue > 0) {
      // Highpass filter (increases with value)
      const hpFilter = offlineContext.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.value = 50 + (cleanValue / 100) * 200;
      lastNode.connect(hpFilter);
      lastNode = hpFilter;

      // Compressor (mild)
      if (cleanValue > 40) {
        const compressor = offlineContext.createDynamicsCompressor();
        compressor.threshold.value = -30;
        compressor.knee.value = 10;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        lastNode.connect(compressor);
        lastNode = compressor;
      }

      // Lowpass for smoothing at high values
      if (cleanValue > 80) {
        const lpFilter = offlineContext.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.value = 12000 - (cleanValue - 80) * 200;
        lastNode.connect(lpFilter);
        lastNode = lpFilter;
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
        const source = ctx.createBufferSource();
        source.buffer = processedBuffer;
        source.connect(masterGainNode.gainNode);
        source.start();
        toast.success("Playing cleaned audio");
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

  const downloadRecording = () => {
    if (recordedBlob) {
      downloadBlob(recordedBlob, 'performance.webm');
      toast.success("Performance downloaded");
    }
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
          <WaveformDisplay
            audioFile={audioFile}
            onWaveSurferReady={handleWaveSurferReady}
          />
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
              />
            )}
          </div>

          {/* Drum pads */}
          <div>
            <DrumPads
              pads={drumPads}
              onPadTrigger={playDrumPad}
              onSampleUpload={handleDrumSampleUpload}
              onEQChange={handleDrumEQChange}
              activePad={null}
            />
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
