interface KeyboardTriggersProps {
  activeKeys: Set<string>;
}

const KeyboardTriggers = ({ activeKeys }: KeyboardTriggersProps) => {
  const sliceKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const drumKeys = ['D', 'F', 'G', 'H', 'J', 'K'];

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm mb-2">Slices:</div>
        <div className="flex gap-2">
          {sliceKeys.map((key) => (
            <div
              key={key}
              className={`kbd-button w-12 h-12 flex items-center justify-center font-bold ${
                activeKeys.has(key) ? 'active' : ''
              }`}
            >
              {key}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm mb-2">Drums:</div>
        <div className="flex gap-2">
          {drumKeys.map((key) => (
            <div
              key={key}
              className={`kbd-button w-12 h-12 flex items-center justify-center font-bold ${
                activeKeys.has(key) ? 'active' : ''
              }`}
            >
              {key}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyboardTriggers;
