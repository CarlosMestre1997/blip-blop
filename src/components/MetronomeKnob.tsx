import { useState, useRef, useEffect } from "react";

interface MetronomeKnobProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: number; // px
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const MetronomeKnob = ({ value, onChange, min = 40, max = 240, step = 1, size = 40 }: MetronomeKnobProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);

  const lastTouchYRef = useRef<number>(0);

  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = -e.movementY;
      let newValue = value + deltaY * ((max - min) / 150);
      newValue = Math.round(clamp(newValue, min, max) / step) * step;
      onChange(newValue);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaY = lastTouchYRef.current - touch.clientY;
      lastTouchYRef.current = touch.clientY;
      let newValue = value + deltaY * ((max - min) / 150);
      newValue = Math.round(clamp(newValue, min, max) / step) * step;
      onChange(newValue);
    };
    
    const handleEnd = () => setIsDragging(false);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, value, min, max, step, onChange]);

  const angle = ((value - min) / (max - min)) * 270 - 135;
  const knobStyle = { width: size, height: size };
  const indicatorLen = size / 2.2;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        ref={knobRef}
        className="relative rounded-full border border-border bg-card cursor-pointer"
        style={knobStyle}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={(e) => {
          lastTouchYRef.current = e.touches[0].clientY;
          setIsDragging(true);
        }}
        title="Set BPM"
      >
        <svg width={size} height={size} className="block">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={(size / 2) - 3}
            fill="#fff"
            stroke="#999"
            strokeWidth={2}
          />
          <g style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: '50% 50%'
          }}>
            <rect
              x={(size / 2) - 2}
              y={size * 0.14}
              width={4}
              height={indicatorLen}
              rx={2}
              fill="#222"
            />
          </g>
        </svg>
        {/* Removed numbers inside the knob*/}
      </div>
      {/* Still show label below for clarity */}
    </div>
  );
};

export default MetronomeKnob;
