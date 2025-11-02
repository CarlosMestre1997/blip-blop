interface KeyboardTriggersProps {
  activeKeys: Set<string>;
  isLoopRecording?: boolean;
  isLoopPlaying?: boolean;
  currentlyPlayingSlice?: number | null;
  currentlyPlayingDrum?: number | null;
  onSlicePlay?: (sliceNum: number) => void;
  onDrumPlay?: (drumIndex: number) => void;
  onSequenceToggle?: (key: string) => void;
  onLoopToggle?: () => void;
  onGlobalStop?: () => void;
}

const KeyboardKey = ({ 
  keyLabel, 
  isActive, 
  isPlaying, 
  onTouchStart 
}: { 
  keyLabel: string; 
  isActive: boolean; 
  isPlaying?: boolean;
  onTouchStart?: () => void;
}) => {
  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTouchStart?.();
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only handle click if not a touch device
    if ('ontouchstart' in window) {
      e.preventDefault();
      return;
    }
    onTouchStart?.();
  };

  return (
    <div className="relative inline-flex flex-col items-center">
      <div
        className={`
          relative w-10 h-10 rounded-lg select-none
          border-2 transition-all duration-150 cursor-pointer
          ${isActive || isPlaying
            ? 'border-primary bg-primary/20 shadow-lg shadow-primary/50 translate-y-0.5' 
            : 'border-border bg-card shadow-md active:translate-y-0.5'
          }
          ${isPlaying ? 'animate-pulse' : ''}
        `}
        style={{
          boxShadow: (isActive || isPlaying)
            ? '0 2px 0 hsl(var(--primary)), inset 0 1px 2px rgba(0,0,0,0.3)'
            : '0 4px 0 hsl(var(--border)), inset 0 1px 0 rgba(255,255,255,0.1)',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
        onTouchStart={handleTouch}
        onClick={handleClick}
      >
        <div className="absolute inset-0 flex items-center justify-center select-none">
          <span className={`font-bold text-sm select-none ${(isActive || isPlaying) ? 'text-primary' : 'text-foreground'}`}>
            {keyLabel}
          </span>
        </div>
        {/* Bottom shadow part */}
        <div className="absolute -bottom-1 left-0.5 right-0.5 h-1 bg-background/50 rounded-b blur-sm" />
      </div>
    </div>
  );
};

const KeyboardTriggers = ({ 
  activeKeys, 
  isLoopRecording, 
  isLoopPlaying, 
  currentlyPlayingSlice, 
  currentlyPlayingDrum,
  onSlicePlay,
  onDrumPlay,
  onSequenceToggle,
  onLoopToggle,
  onGlobalStop
}: KeyboardTriggersProps) => {
  const sliceKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const drumKeys = ['D', 'F', 'G'];
  const drumSequenceKeys = ['H', 'J', 'K'];

  return (
    <div className="space-y-3 p-4">
      <div className="flex gap-2 items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground mr-1">Slices</span>
        {sliceKeys.map((key) => {
          const sliceNum = parseInt(key);
          const isPlaying = currentlyPlayingSlice === sliceNum;
          return (
            <KeyboardKey 
              key={key} 
              keyLabel={key} 
              isActive={activeKeys.has(key)} 
              isPlaying={isPlaying}
              onTouchStart={() => onSlicePlay?.(sliceNum)}
            />
          );
        })}
      </div>

      <div className="flex gap-2 items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground mr-1">Drums</span>
        {drumKeys.map((key, idx) => {
          const isPlaying = currentlyPlayingDrum === idx;
          return (
            <KeyboardKey 
              key={key} 
              keyLabel={key} 
              isActive={activeKeys.has(key)} 
              isPlaying={isPlaying}
              onTouchStart={() => onDrumPlay?.(idx)}
            />
          );
        })}
        <span className="text-xs font-medium text-muted-foreground mx-2">|</span>
        {drumSequenceKeys.map((key) => (
          <KeyboardKey 
            key={key} 
            keyLabel={key} 
            isActive={activeKeys.has(key)}
            onTouchStart={() => onSequenceToggle?.(key)}
          />
        ))}
      </div>

      <div className="flex gap-2 items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground mr-1">Loop Control</span>
        {isLoopRecording && (
          <span className="text-xs font-bold text-red-500 animate-pulse">● REC</span>
        )}
        {isLoopPlaying && (
          <span className="text-xs font-bold text-primary">▶ LOOP</span>
        )}
        <KeyboardKey 
          keyLabel="L" 
          isActive={activeKeys.has('L')}
          onTouchStart={onLoopToggle}
        />
        <span className="text-[10px] text-muted-foreground ml-1">
          {!isLoopRecording && !isLoopPlaying ? 'start recording' : isLoopRecording ? 'loop sequence' : 'stop loop'}
        </span>
      </div>

      <div className="flex gap-2 items-center justify-center mt-4">
        <div className="relative inline-flex flex-col items-center">
          <div
            className={`
              relative w-52 h-10 rounded-lg select-none
              border-2 transition-all duration-150 cursor-pointer
              ${activeKeys.has(' ')
                ? 'border-primary bg-primary/20 shadow-lg shadow-primary/50 translate-y-0.5' 
                : 'border-border bg-card shadow-md active:translate-y-0.5'
              }
            `}
            style={{
              boxShadow: activeKeys.has(' ')
                ? '0 2px 0 hsl(var(--primary)), inset 0 1px 2px rgba(0,0,0,0.3)'
                : '0 4px 0 hsl(var(--border)), inset 0 1px 0 rgba(255,255,255,0.1)',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none'
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onGlobalStop?.();
            }}
            onClick={(e) => {
              if ('ontouchstart' in window) {
                e.preventDefault();
                return;
              }
              onGlobalStop?.();
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center select-none">
              <span className={`font-bold text-sm select-none ${activeKeys.has(' ') ? 'text-primary' : 'text-foreground'}`}>
                SPACE
              </span>
            </div>
            <div className="absolute -bottom-1 left-0.5 right-0.5 h-1 bg-background/50 rounded-b blur-sm" />
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground ml-1">
          global stop
        </span>
      </div>
    </div>
  );
};

export default KeyboardTriggers;
