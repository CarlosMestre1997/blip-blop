import { Button } from "@/components/ui/button";

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
        <Button onClick={onStartRecording} variant="outline">
          Record performance
        </Button>
      ) : (
        <Button onClick={onStopRecording} variant="destructive">
          Stop recording
        </Button>
      )}
      
      <Button
        onClick={onDownloadRecording}
        disabled={!hasRecording || isRecording}
      >
        Download performance
      </Button>
    </div>
  );
};

export default RecordingControls;
