import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

export interface SliceSettings {
  volume: number;
  tempo: number;
  transpose: number;
  reverb: number;
  mode: 'classic' | 'oneshot' | 'loop';
}

interface SliceControlsProps {
  sliceNumber: number;
  settings: SliceSettings;
  onSettingsChange: (settings: SliceSettings) => void;
  onDelete: () => void;
}

interface KnobProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  formatValue?: (value: number) => string;
}

const Knob = ({ label, value, onChange, min, max, step, unit, formatValue }: KnobProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = -e.movementY;
      const range = max - min;
      const change = (deltaY / 200) * range; // Slower sensitivity
      const raw = value + change;
      const snapped = Math.round(raw / step) * step; // honor step increments
      const clamped = Math.max(min, Math.min(max, snapped));
      onChange(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, value, onChange, min, max, step]);

  const rotation = ((value - min) / (max - min)) * 270 - 135;
  
  const displayValue = formatValue ? formatValue(value) : value.toFixed(1);

  return (
    <div className="flex flex-col items-center">
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <div
        ref={knobRef}
        className="relative w-12 h-12 cursor-pointer select-none"
        onMouseDown={() => setIsDragging(true)}
      >
        <div className="absolute inset-0 rounded-full border-2 border-border bg-background"></div>
        <div 
          className="absolute inset-1 rounded-full bg-primary"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="absolute top-0.5 left-1/2 w-0.5 h-3 bg-primary-foreground -ml-0.5 rounded-full"></div>
        </div>
      </div>
      <div className="text-[10px] mt-1 font-bold">
        {displayValue}{unit && ` ${unit}`}
      </div>
    </div>
  );
};

const SliceControls = ({ sliceNumber, settings, onSettingsChange, onDelete }: SliceControlsProps) => {
  return (
    <div className="border-2 border-border rounded p-4 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-accent-foreground">Slice {sliceNumber}</h3>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="h-6 px-2 text-xs"
        >
          Delete
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          <Knob
            label="Volume"
            value={settings.volume * 100}
            onChange={(value) => onSettingsChange({ ...settings, volume: value / 100 })}
            min={0}
            max={100}
            step={1}
            unit="%"
          />
          <Knob
            label="Tempo"
            value={settings.tempo * 100}
            onChange={(value) => onSettingsChange({ ...settings, tempo: value / 100 })}
            min={50}
            max={200}
            step={1}
            unit="%"
          />
          <Knob
            label="Transpose"
            value={settings.transpose}
            onChange={(value) => onSettingsChange({ ...settings, transpose: Math.round(value) })}
            min={-12}
            max={12}
            step={1}
            formatValue={(v) => (v > 0 ? '+' : '') + Math.round(v)}
            unit="st"
          />
          <Knob
            label="Reverb"
            value={settings.reverb * 100}
            onChange={(value) => onSettingsChange({ ...settings, reverb: value / 100 })}
            min={0}
            max={100}
            step={1}
            unit="%"
          />
        </div>

        <div className="flex gap-2">
          {(['classic', 'oneshot', 'loop'] as const).map((mode) => (
            <Button
              key={mode}
              variant={settings.mode === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSettingsChange({ ...settings, mode })}
              className="flex-1 text-xs"
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SliceControls;
