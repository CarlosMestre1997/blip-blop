import { Button } from "@/components/ui/button";
import { useState } from "react";
import DrumEQ from "./DrumEQ";

export interface DrumPad {
  key: string;
  sampleName: string;
  audioBuffer: AudioBuffer | null;
  eq: {
    low: number;
    mid: number;
    high: number;
  };
}

interface DrumPadsProps {
  pads: DrumPad[];
  onPadTrigger: (key: string) => void;
  onSampleUpload: (key: string, file: File) => void;
  onEQChange: (key: string, eq: { low: number; mid: number; high: number }) => void;
  activePad: string | null;
}

const DrumPads = ({ pads, onPadTrigger, onSampleUpload, onEQChange, activePad }: DrumPadsProps) => {
  const [showEQ, setShowEQ] = useState<string | null>(null);

  return (
    <div className="border-2 border-border rounded p-4 bg-card">
      <h3 className="text-sm font-bold mb-3">Drums</h3>
      <div className="grid grid-cols-2 gap-4">
        {pads.map((pad) => (
          <div key={pad.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-xs mb-1">{pad.key}:</div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={pad.sampleName}
                    readOnly
                    className="flex-1 text-xs border border-input rounded px-2 py-1 bg-background"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEQ(showEQ === pad.key ? null : pad.key)}
                    className="text-xs px-2"
                  >
                    EQ
                  </Button>
                </div>
              </div>
            </div>
            <label className="block">
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onSampleUpload(pad.key, file);
                }}
                className="hidden"
              />
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs"
                asChild
              >
                <span className="cursor-pointer">Upload sample</span>
              </Button>
            </label>
            {showEQ === pad.key && (
              <DrumEQ
                eq={pad.eq}
                onEQChange={(eq) => onEQChange(pad.key, eq)}
                onClose={() => setShowEQ(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DrumPads;
