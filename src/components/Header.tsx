import Metronome from "./Metronome";
import DarkModeToggle from "./DarkModeToggle";

interface HeaderProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  isPlaying: boolean;
}

const Header = ({ bpm, onBpmChange, isPlaying }: HeaderProps) => {
  return (
    <header className="border-b-2 border-border py-4 px-6">
      <div className="flex items-center justify-between max-w-[1600px] mx-auto">
        <h1 className="text-2xl font-bold underline decoration-2 underline-offset-4">
          Blip Bloop v3
        </h1>
        <div className="flex items-center gap-6">
          <Metronome bpm={bpm} onBpmChange={onBpmChange} isPlaying={isPlaying} />
          <nav className="flex gap-6 text-sm">
            <a href="#about" className="hover:underline">About</a>
          </nav>
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
