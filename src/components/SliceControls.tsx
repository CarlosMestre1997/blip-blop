import { Slider } from "@/components/ui/slider";
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
}

const SliceControls = ({ sliceNumber, settings, onSettingsChange }: SliceControlsProps) => {
  return (
    <div className="border-2 border-border rounded p-4 bg-card space-y-4">
      <h3 className="text-sm font-bold text-accent-foreground">Slice {sliceNumber}</h3>
      
      <div className="space-y-3">
        <div>
          <label className="text-xs block mb-1">Volume:</label>
          <Slider
            value={[settings.volume * 100]}
            onValueChange={([value]) => onSettingsChange({ ...settings, volume: value / 100 })}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        <div>
          <label className="text-xs block mb-1">Tempo:</label>
          <Slider
            value={[settings.tempo * 100]}
            onValueChange={([value]) => onSettingsChange({ ...settings, tempo: value / 100 })}
            min={50}
            max={200}
            step={1}
            className="w-full"
          />
          <span className="text-xs text-muted-foreground">{Math.round(settings.tempo * 100)}%</span>
        </div>

        <div>
          <label className="text-xs block mb-1">Transpose:</label>
          <Slider
            value={[settings.transpose]}
            onValueChange={([value]) => onSettingsChange({ ...settings, transpose: value })}
            min={-12}
            max={12}
            step={1}
            className="w-full"
          />
          <span className="text-xs text-muted-foreground">{settings.transpose > 0 ? '+' : ''}{settings.transpose} semitones</span>
        </div>

        <div>
          <label className="text-xs block mb-1">Reverb:</label>
          <Slider
            value={[settings.reverb * 100]}
            onValueChange={([value]) => onSettingsChange({ ...settings, reverb: value / 100 })}
            max={100}
            step={1}
            className="w-full"
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
