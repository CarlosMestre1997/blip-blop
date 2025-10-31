import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadRecording: (format: 'wav' | 'mp3') => void;
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
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={!hasRecording || isRecording}>
            <Download className="w-4 h-4 mr-2" />
            Download performance
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onDownloadRecording('wav')}>
            Download as WAV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownloadRecording('mp3')}>
            Download as MP3
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default RecordingControls;
