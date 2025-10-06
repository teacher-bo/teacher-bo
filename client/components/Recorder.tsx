import { useAudioStreamer } from "@/hooks/useAudioStreamer";
import { Buffer } from "buffer";
import React, { useCallback, useRef, useState } from "react";
import { Button, Text, View } from "react-native";
import {
  AudioBuffer,
  AudioBufferSourceNode,
  AudioContext,
} from "react-native-audio-api";

const RnApiAudioRecorder = () => {
  const [messages, setMessages] = useState<string[]>([]);

  const onAudioReady = useCallback((buffer: AudioBuffer) => {
    // Handle the audio buffer when it's ready
    console.log("Audio buffer is ready:", buffer);

    // Get the float32 channel data
    const floatData = buffer.getChannelData(0);

    // Convert Float32Array to 16-bit PCM
    const pcmData = new Int16Array(floatData.length);
    for (let i = 0; i < floatData.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit integer
      const sample = Math.max(-1, Math.min(1, floatData[i]));
      pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    // Convert to base64
    const buffer16 = new Uint8Array(pcmData.buffer);
    const pcmBase64 = Buffer.from(buffer16).toString("base64");

    console.log("PCM Base64:", pcmBase64);
    setMessages((prev) => [...prev, pcmBase64]);
  }, []);

  const { isRecording, startRecording, stopRecording, isInitialized } =
    useAudioStreamer({ sampleRate: 16000, interval: 250, onAudioReady });

  const _startRecording = () => {
    if (isInitialized) {
      setMessages([]);
      startRecording();
    }
  };

  const { playAudio } = useBase64AudioPlayer();

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>RnApiAudioRecorder</Text>
      <Text style={{ marginBottom: 10 }}>
        Status: {isInitialized ? "Initialized" : "Initializing..."}
      </Text>
      <Text style={{ marginBottom: 20 }}>
        Recording: {isRecording ? "Yes" : "No"}
      </Text>
      <Button
        title={isRecording ? "Stop Recording" : "Start Recording"}
        onPress={isRecording ? stopRecording : _startRecording}
        disabled={!isInitialized}
      />

      <Button
        title="Play Messages"
        onPress={() => {
          const combined = mergePCMBase64Strings(messages);
          console.log("Combined PCM Base64:", combined);
          playAudio({ base64Text: combined, sampleRate: 16000 });
        }}
      />
    </View>
  );
};

function mergePCMBase64Strings(pcmBase64List: string[]): string {
  if (pcmBase64List.length === 0) {
    return "";
  }

  if (pcmBase64List.length === 1) {
    return pcmBase64List[0];
  }

  // Convert all base64 strings to binary data
  const binaryDataArrays: Uint8Array[] = pcmBase64List.map((base64String) => {
    // Remove any data URL prefix if present (e.g., "data:audio/pcm;base64,")
    const cleanBase64 = base64String.replace(/^data:.*?;base64,/, "");

    // Decode base64 to binary
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  });

  // Calculate total length
  const totalLength = binaryDataArrays.reduce(
    (sum, array) => sum + array.length,
    0
  );

  // Create merged array
  const mergedArray = new Uint8Array(totalLength);
  let offset = 0;

  for (const array of binaryDataArrays) {
    mergedArray.set(array, offset);
    offset += array.length;
  }

  // Convert back to base64
  let binaryString = "";
  for (let i = 0; i < mergedArray.length; i++) {
    binaryString += String.fromCharCode(mergedArray[i]);
  }

  return btoa(binaryString);
}

const useBase64AudioPlayer = () => {
  const playerNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const playAudio = useCallback(
    ({
      base64Text,
      sampleRate,
    }: {
      base64Text: string;
      sampleRate: number;
    }) => {
      const audioContext = new AudioContext();

      // Convert base64 to raw PCM data
      const arrayBuffer = base64AudioTextToArrayBuffer(base64Text);
      const pcmData = new Int16Array(arrayBuffer);

      // Create audio buffer with the specified sample rate
      const audioBuffer = audioContext.createBuffer(
        1,
        pcmData.length,
        sampleRate
      );
      const channelData = audioBuffer.getChannelData(0);

      // Convert Int16 PCM data to Float32 for Web Audio API
      for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / 32768.0; // Normalize 16-bit to -1.0 to 1.0
      }

      const playerNode = audioContext.createBufferSource();
      playerNode.buffer = audioBuffer;

      playerNode.connect(audioContext.destination);
      setIsAudioPlaying(true);
      playerNode.start(audioContext.currentTime);
      playerNode.stop(audioContext.currentTime + audioBuffer.duration);
      playerNode.onEnded = () => {
        playerNodeRef.current = null;
        setIsAudioPlaying(false);
      };
      playerNodeRef.current = playerNode;
    },
    []
  );

  const stopPlayingAudio = useCallback(() => {
    playerNodeRef.current?.stop?.();
    playerNodeRef.current = null;
  }, []);

  return { playAudio, isAudioPlaying, stopPlayingAudio };
};

function base64AudioTextToArrayBuffer(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function Example() {
  const { isAudioPlaying, playAudio, stopPlayingAudio } =
    useBase64AudioPlayer();

  return (
    <View
      style={{
        alignSelf: "stretch",
        flex: 1,
        padding: 16,
        justifyContent: "center",
        alignItems: "stretch",
        gap: 16,
      }}
    >
      <Text style={{ fontSize: 32, fontWeight: "semibold" }}>
        Is Playing: {`${isAudioPlaying}`}
      </Text>

      {!isAudioPlaying ? (
        <Button
          title="Play Audio"
          onPress={() => {
            playAudio({ base64Text: "dummy one", sampleRate: 16000 });
          }}
        />
      ) : (
        <Button title="Stop Playing Audio" onPress={stopPlayingAudio} />
      )}
    </View>
  );
}

export default RnApiAudioRecorder;
