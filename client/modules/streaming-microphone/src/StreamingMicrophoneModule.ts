import { NativeModule, requireNativeModule } from "expo";

export type StreamingMicrophoneModuleEvents = {
  onAudioBuffer: (params: AudioBuffer) => void;
  onAudioChunk: (params: AudioChunk) => void;
};

export type AudioBuffer = {
  samples: number[];
};

export type AudioChunk = {
  data: number[];
  timestamp: number;
  sampleRate: number;
};

declare class StreamingMicrophoneModule extends NativeModule<StreamingMicrophoneModuleEvents> {
  stopRecording(): void;
  startRecording(): void;
  getSampleRate(): number;
  getBufferSize(): number;
  isRecording(): boolean;
  BUFFERS_PER_SECOND: number;
  SAMPLE_RATE: number;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<StreamingMicrophoneModule>(
  "StreamingMicrophone"
);
