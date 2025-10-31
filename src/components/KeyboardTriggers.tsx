interface KeyboardTriggersProps {
  activeKeys: Set<string>;
  isLoopRecording?: boolean;
  isLoopPlaying?: boolean;
}

const KeyboardKey = ({ keyLabel, isActive }: { keyLabel: string; isActive: boolean }) => (
  <div className="relative inline-flex flex-col items-center">
    <div
      className={`
        relative w-12 h-12 rounded-lg
        border-2 transition-all duration-150
        ${isActive 
          ? 'border-primary bg-primary/20 shadow-lg shadow-primary/50 translate-y-0.5' 
          : 'border-border bg-card shadow-md'
        }
      `}
      style={{
        boxShadow: isActive 
          ? '0 2px 0 hsl(var(--primary)), inset 0 1px 2px rgba(0,0,0,0.3)'
          : '0 4px 0 hsl(var(--border)), inset 0 1px 0 rgba(255,255,255,0.1)'
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-bold text-lg ${isActive ? 'text-primary' : 'text-foreground'}`}>
          {keyLabel}
        </span>
      </div>
      {/* Bottom shadow part */}
      <div className="absolute -bottom-1 left-0.5 right-0.5 h-1 bg-background/50 rounded-b blur-sm" />
    </div>
  </div>
);

const KeyboardTriggers = ({ activeKeys, isLoopRecording, isLoopPlaying }: KeyboardTriggersProps) => {
  const sliceKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const drumKeys = ['D', 'F', 'G', 'H', 'J', 'K'];

  return (
    <div className="space-y-6 p-6 bg-card border-2 border-border rounded-lg">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold text-muted-foreground">Slices:</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex gap-2 justify-center">
          {sliceKeys.map((key) => (
            <KeyboardKey key={key} keyLabel={key} isActive={activeKeys.has(key)} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold text-muted-foreground">Drums:</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex gap-2 justify-center">
          {drumKeys.map((key) => (
            <KeyboardKey key={key} keyLabel={key} isActive={activeKeys.has(key)} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold text-muted-foreground">Loop Control:</span>
          <div className="flex-1 h-px bg-border" />
          {isLoopRecording && (
            <span className="text-xs font-bold text-red-500 animate-pulse">● RECORDING</span>
          )}
          {isLoopPlaying && (
            <span className="text-xs font-bold text-primary">▶ LOOPING</span>
          )}
        </div>
        <div className="flex gap-2 justify-center">
          <KeyboardKey keyLabel="L" isActive={activeKeys.has('L')} />
          <span className="text-xs text-muted-foreground self-center ml-2">
            Press L to {!isLoopRecording && !isLoopPlaying ? 'start recording' : isLoopRecording ? 'loop sequence' : 'stop loop'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default KeyboardTriggers;
