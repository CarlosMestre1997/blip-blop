import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline";

interface WaveformDisplayProps {
  audioFile: File | null;
  onWaveSurferReady: (ws: WaveSurfer, regions: RegionsPlugin) => void;
}

const WaveformDisplay = ({ audioFile, onWaveSurferReady }: WaveformDisplayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !audioFile) return;

    setIsLoading(true);

    // Clear previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    const regions = RegionsPlugin.create();
    const timeline = TimelinePlugin.create({
      container: '#timeline',
      height: 20,
    });

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#999',
      progressColor: '#333',
      cursorColor: '#000',
      height: 200,
      barWidth: 2,
      barGap: 1,
      plugins: [regions, timeline],
    });

    wavesurferRef.current = wavesurfer;

    // Load audio file
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      wavesurfer.loadBlob(new Blob([arrayBuffer]));
    };
    reader.readAsArrayBuffer(audioFile);

    wavesurfer.on('ready', () => {
      setIsLoading(false);
      onWaveSurferReady(wavesurfer, regions);
    });

    // Zoom with Alt + mouse wheel
    containerRef.current.addEventListener('wheel', (e) => {
      if (e.altKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const currentZoom = wavesurfer.options.minPxPerSec || 1;
        wavesurfer.zoom(Math.max(1, currentZoom + delta * 10));
      }
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [audioFile]);

  return (
    <div className="space-y-2">
      <div id="timeline" className="border-b border-border"></div>
      <div 
        ref={containerRef} 
        className="border-2 border-border rounded bg-white relative"
        style={{ minHeight: '200px' }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className="text-sm">Loading waveform...</div>
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        Alt + mouse wheel to zoom horizontally
      </div>
    </div>
  );
};

export default WaveformDisplay;
