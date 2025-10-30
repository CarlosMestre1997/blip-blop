# Blip Bloop v3 - Browser-Based Audio Sampler & Sequencer

A fully functional browser-based audio sampler, sequencer, and audio cleaner. Built with React, WaveSurfer.js, Tone.js, and the Web Audio API.

## 🚀 Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**: Navigate to `http://localhost:5173`

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Spacebar` | Start/Stop metronome + sequencer |
| `1-9` | Play slices 1 through 9 |
| `Alt + Mouse Wheel` | Zoom waveform horizontally |

## 🎵 Features

### Waveform Viewer with Slicing
- Create up to 9 audio slices
- Smooth zoom with cached waveform
- 5ms fade-in on slice playback

### Slice Controls
- Volume, Tempo, Transpose, Reverb
- Classic / Oneshot / Loop modes

### Metronome & Tempo (40-240 BPM)
- Syncs all slices and sequencer

### 6-Track Step Sequencer
- Kick, Snare, Closed Hat, Open Hat, Clap, Perc
- 16 steps per track
- Save/Clear patterns

### Smart Clean (0-100%)
- Enhanced audio processing chain
- Listen & Download cleaned audio

### Dark Mode
- Toggle in header (saved to localStorage)
