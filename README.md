# Blip Blop - Audio Sampler & Cleaner

A browser-based audio sampler and cleaner built with React, WaveSurfer.js, and the Web Audio API.

## Features

- **Waveform Viewer**: Load and visualize audio files with WaveSurfer.js
- **Audio Slicing**: Create up to 9 slices that can be triggered with keyboard keys (1-9)
- **Sequencer**: 6-track step sequencer for drum patterns
- **Metronome**: Adjustable tempo (40-240 BPM) with visual feedback
- **Smart Clean**: Audio cleaning with adjustable intensity (0-100%)
- **Recording**: Record and download your performances
- **Dark Mode**: Toggle between light and dark themes

## Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd blip-blop
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. **Add Drum Samples** (Important!)
   
   Create the following folder structure and add your drum samples:
   ```
   public/
   └── samples/
       ├── kick.wav
       ├── snare.wav
       ├── hihat-closed.wav
       ├── hihat-open.wav
       ├── clap.wav
       └── perc.wav
   ```

4. Start the development server:
```bash
npm run dev
# or
bun run dev
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1-9` | Play slice 1-9 |
| `Spacebar` | Stop all audio / Play last slice |
| `D, F, G, H, J, K` | Trigger drum pads |

## Project Structure

```
src/
├── components/
│   ├── DarkModeToggle.tsx
│   ├── Header.tsx
│   ├── Metronome.tsx
│   ├── Sequencer.tsx
│   ├── SliceControls.tsx
│   ├── SmartCleanKnob.tsx
│   ├── WaveformDisplay.tsx
│   ├── KeyboardTriggers.tsx
│   ├── RecordingControls.tsx
│   └── ui/                    # shadcn/ui components
├── pages/
│   └── Index.tsx              # Main application page
├── hooks/
├── lib/
├── App.tsx
├── index.css
└── main.tsx
```

## Usage

### Loading Audio

1. Click "Upload audio file" to load your sample
2. The waveform will appear in the viewer

### Creating Slices

1. Click twice on the waveform to create a slice region
2. Drag the edges to adjust the slice boundaries
3. Press keys 1-9 to trigger slices

### Using the Sequencer

1. Click on "Sequencer" to expand the panel
2. Load drum samples for each track (or use the default samples in `public/samples/`)
3. Click grid cells to create patterns
4. Start the metronome to play the sequence

### Smart Clean

1. Adjust the knob (0-100%) to set cleaning intensity
2. Click "Listen" to preview the cleaned audio
3. Click "Download" to export the cleaned version

## Technologies

- React 18
- TypeScript
- WaveSurfer.js
- Web Audio API
- Tailwind CSS
- shadcn/ui
- Vite

## License

MIT
