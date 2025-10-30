import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface DrumEQProps {
  eq: { low: number; mid: number; high: number };
  onEQChange: (eq: { low: number; mid: number; high: number }) => void;
  onClose: () => void;
}

const DrumEQ = ({ eq, onEQChange, onClose }: DrumEQProps) => {
  return (
    <div className="border border-border rounded p-3 bg-secondary space-y-2">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold">EQ</span>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-6 px-2 text-xs">
          ×
        </Button>
      </div>
      
      <div>
        <label className="text-xs block mb-1">Low: {eq.low.toFixed(1)} dB</label>
        <Slider
          value={[eq.low]}
          onValueChange={([value]) => onEQChange({ ...eq, low: value })}
          min={-12}
          max={12}
          step={0.5}
        />
      </div>

      <div>
        <label className="text-xs block mb-1">Mid: {eq.mid.toFixed(1)} dB</label>
        <Slider
          value={[eq.mid]}
          onValueChange={([value]) => onEQChange({ ...eq, mid: value })}
          min={-12}
          max={12}
          step={0.5}
        />
      </div>

      <div>
        <label className="text-xs block mb-1">High: {eq.high.toFixed(1)} dB</label>
        <Slider
          value={[eq.high]}
          onValueChange={([value]) => onEQChange({ ...eq, high: value })}
          min={-12}
          max={12}
          step={0.5}
        />
      </div>
    </div>
  );
};

export default DrumEQ;
