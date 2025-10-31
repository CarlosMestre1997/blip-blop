import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export const initFFmpeg = async () => {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  await ffmpeg.load();
  return ffmpeg;
};

export const convertAudioToFormat = async (
  audioBlob: Blob,
  outputFormat: 'wav' | 'mp3'
): Promise<Blob> => {
  const ffmpegInstance = await initFFmpeg();
  
  const inputFileName = 'input.wav';
  const outputFileName = `output.${outputFormat}`;
  
  // Write input file to FFmpeg virtual file system
  await ffmpegInstance.writeFile(inputFileName, await fetchFile(audioBlob));
  
  // Convert to desired format
  if (outputFormat === 'mp3') {
    await ffmpegInstance.exec(['-i', inputFileName, '-codec:a', 'libmp3lame', '-b:a', '192k', outputFileName]);
  } else {
    await ffmpegInstance.exec(['-i', inputFileName, outputFileName]);
  }
  
  // Read the output file
  const data = await ffmpegInstance.readFile(outputFileName);
  
  const mimeType = outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav';
  return new Blob([new Uint8Array(data as Uint8Array).buffer], { type: mimeType });
};
