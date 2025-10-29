# Blip Bloop - Browser Audio Sampler

A minimalistic, browser-based audio sampler with slicing, drum pads, smart audio cleaning, and performance recording capabilities.

## Features

- **Audio File Loading**: Drag/drop or select audio files with waveform visualization
- **Slice Creation**: Create up to 9 slice regions with keyboard triggers (1-9)
- **Per-Slice Controls**: Volume, tempo, transpose, reverb, and playback modes (Classic/Oneshot/Loop)
- **Drum Pads**: 6 drum pads mapped to keys D, F, G, H, J, K with 3-band EQ
- **Smart Clean**: Audio cleaning processor with visual rotary knob (0-100%)
- **Performance Recording**: Record and export your performances with auto-silence trimming
- **Zoomable Waveform**: Alt + mouse wheel for horizontal zoom

## Running the Project

### Quick Start (No npm required)

1. **Using a simple HTTP server:**
   ```bash
   # If you have Node.js installed:
   npx http-server -p 8080
   
   # Or with Python:
   python -m http.server 8080
   
   # Or with PHP:
   php -S localhost:8080
   ```

2. Open `http://localhost:8080` in your browser

### With npm (Development)

```bash
npm install
npm run dev
```

## Keyboard Shortcuts

### Slice Triggers
- **1-9**: Play corresponding slice regions
- Visual feedback on keyboard display when pressed

### Drum Triggers
- **D, F, G, H, J, K**: Trigger drum pads
- Visual feedback on keyboard display when pressed

### Waveform Control
- **Alt + Mouse Wheel**: Zoom in/out horizontally on waveform

## Usage Guide

### 1. Load Audio File
- Click "Input file" and select an audio file
- Waveform will display with timeline

### 2. Create Slices
- **Click once** on waveform to set start point
- **Click again** to set end point and create region
- Or **click and drag** to create region in one motion
- Regions can be resized by dragging edges
- Regions can be moved by dragging
- Maximum 9 slices

### 3. Configure Slices
- Press slice number key (1-9) to play and open controls
- Adjust **Volume**: Overall loudness
- Adjust **Tempo**: Playback speed (50%-200%)
- Adjust **Transpose**: Pitch shift (-12 to +12 semitones)
- Adjust **Reverb**: Wet/dry mix
- Select **Mode**:
  - **Classic**: Plays once from start to end
  - **Oneshot**: Plays once, stops at end
  - **Loop**: Loops continuously

### 4. Drum Pads
- Press D, F, G, H, J, K to trigger pads
- Click "Upload sample" to load custom samples
- Click "EQ" to adjust 3-band EQ:
  - **Low**: Low-shelf filter (200 Hz)
  - **Mid**: Peaking filter (1000 Hz)
  - **High**: High-shelf filter (3000 Hz)

### 5. Smart Clean
- Rotate knob by clicking and dragging up/down
- **0-40%**: Light highpass + mild noise gate
- **41-80%**: Stronger highpass + spectral attenuation + compression
- **81-100%**: Aggressive reduction + lowpass smoothing
- **Listen**: Preview processed audio
- **Download**: Export processed audio as WAV

### 6. Recording Performance
- Click "Record performance" to start
- Play slices and drums
- Click "Stop recording" when done
- Leading silence is automatically trimmed
- Click "Download performance" to export as WAV

## Implementation Notes & Limitations

### Audio Processing Approximations

1. **Transpose**
   - Uses `playbackRate = 2^(semitones/12)` formula
   - Changes both pitch and tempo together
   - Tempo slider compensates for tempo changes

2. **Reverb**
   - Simplified implementation using delay + feedback
   - Production version would use convolution reverb with impulse responses
   - Current implementation provides basic wet/dry mixing

3. **Smart Clean Audio Processor**
   - **Highpass Filter**: Removes low-frequency rumble
   - **Dynamic Compression**: Evens out volume levels (activated at 40%+)
   - **Lowpass Filter**: Smooths harsh frequencies (activated at 80%+)
   - Approximates spectral noise reduction through multiband filtering
   - Not as sophisticated as dedicated audio restoration software

4. **Noise Gate**
   - Implemented through dynamic compression threshold
   - Simple amplitude-based gating
   - Does not analyze spectral content

5. **Recording Export**
   - Exports to WebM format (browser native)
   - WAV export uses client-side conversion (16-bit PCM)
   - Recording captures all audio output including effects

### Browser Compatibility

- Requires modern browser with Web Audio API support
- Best performance in Chrome/Edge
- Firefox and Safari supported with potential limitations
- No backend required - everything runs client-side

### Performance Considerations

- Large audio files may take time to load and process
- Smart Clean processing is CPU-intensive
- Multiple simultaneous slices may cause audio glitches on lower-end devices

## Technical Stack

- **React** with TypeScript
- **WaveSurfer.js v7** with Regions and Timeline plugins
- **Tone.js** for enhanced audio scheduling (optional enhancement)
- **Web Audio API** for all audio processing
- **Tailwind CSS** for minimalist UI
- **shadcn/ui** components (customized for monospace aesthetic)

## File Structure

```
/
├── src/
│   ├── components/
│   │   ├── Header.tsx              # App header
│   │   ├── WaveformDisplay.tsx     # WaveSurfer waveform
│   │   ├── SliceControls.tsx       # Per-slice parameter controls
│   │   ├── DrumPads.tsx            # Drum pad grid
│   │   ├── DrumEQ.tsx              # 3-band EQ modal
│   │   ├── SmartCleanKnob.tsx      # Rotary knob control
│   │   ├── KeyboardTriggers.tsx    # Visual keyboard display
│   │   └── RecordingControls.tsx   # Record/export controls
│   ├── pages/
│   │   └── Index.tsx               # Main application logic
│   ├── index.css                   # Design system & utilities
│   └── main.tsx                    # App entry point
├── public/
│   └── assets/
│       └── drums/                  # Drum samples (add your own)
└── index.html
```

## Adding Custom Drum Samples

Place audio files in `public/assets/drums/` and they'll be available for upload through the UI. Supported formats:
- WAV (recommended)
- MP3
- OGG
- FLAC

## Future Enhancements

Potential improvements for production version:
- True convolution reverb with impulse responses
- More sophisticated spectral noise reduction
- MIDI controller support
- Preset saving/loading
- Sample library browser
- Waveform export with visual markers
- Multi-track recording
- VST-style plugin architecture

## License

MIT

## Support

For issues or questions, please open an issue on the repository.
