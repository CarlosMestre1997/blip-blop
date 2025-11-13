import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadRecording: () => void;
  hasRecording: boolean;
}

const RecordingControls = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  onDownloadRecording,
  hasRecording,
}: RecordingControlsProps) => {
  return (
    <div className="flex gap-2">
      {!isRecording ? (
        <Button onClick={onStartRecording} variant="outline" className="smooth-transition hover-lift">
          Record performance
        </Button>
      ) : (
        <Button onClick={onStopRecording} variant="destructive" className="smooth-transition pulse-subtle">
          Stop recording
        </Button>
      )}
      
      <Button 
        onClick={onDownloadRecording} 
        disabled={!hasRecording || isRecording}
        className="smooth-transition hover-lift"
      >
        <Download className="w-4 h-4 mr-2" />
        Download recording
      </Button>
    </div>
  );
};

export default RecordingControls;
