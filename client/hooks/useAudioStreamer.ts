import { requestRecordingPermissionsAsync } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  AudioContext,
  AudioRecorder,
  RecorderAdapterNode,
  AudioBuffer,
} from "react-native-audio-api";

const useAudioStreamer = ({
  sampleRate,
  interval,
  onAudioReady,
}: {
  // assuming that the sample rate will not change
  sampleRate: number;
  interval: number;
  onAudioReady: (buffer: AudioBuffer) => void;
}) => {
  const recorderRef = useRef<AudioRecorder | null>(null);
  const adapterRef = useRef<RecorderAdapterNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const cleanup = useCallback(() => {
    try {
      if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }, []);

  const initializeAudio = useCallback(async () => {
    try {
      console.log("Initializing audio...");

      // Request audio recording permission
      const permissionResult = await requestRecordingPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Error",
          "Audio recording permission is required"
        );
        return;
      }

      // Create audio context
      audioContextRef.current = new AudioContext();

      // Create recorder
      console.log(AudioRecorder);
      recorderRef.current = new AudioRecorder({
        sampleRate: sampleRate,
        bufferLengthInSamples: (sampleRate * interval) / 1000,
        //bufferLengthInSamples: sampleRate,
      });

      // Create adapter
      adapterRef.current = audioContextRef.current.createRecorderAdapter();

      // Connect recorder to adapter
      recorderRef.current.connect(adapterRef.current);

      // Set up audio ready callback
      recorderRef.current.onAudioReady((event) => {
        const { buffer, numFrames, when } = event;
        console.log(
          "Audio recorder buffer ready:",
          "Duration:",
          buffer.duration,
          "Frames:",
          numFrames,
          "When:",
          when
        );
        onAudioReady(buffer);
      });

      setIsInitialized(true);
      console.log("Audio initialized successfully");
    } catch (error) {
      console.error("Failed to initialize audio:", error);
      Alert.alert("Error", "Failed to initialize audio recorder");
    }
  }, [interval, onAudioReady, sampleRate]);

  const startRecording = useCallback(() => {
    try {
      if (!recorderRef.current || !isInitialized) {
        Alert.alert("Error", "Audio recorder not initialized");
        return;
      }

      console.log("Starting recording...");
      recorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording");
    }
  }, [isInitialized]);

  const stopRecording = useCallback(() => {
    try {
      if (!recorderRef.current) {
        return;
      }

      console.log("Stopping recording...");
      recorderRef.current.stop();
      setIsRecording(false);
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Error", "Failed to stop recording");
    }
  }, []);

  useEffect(() => {
    initializeAudio();

    return () => {
      cleanup();
    };
  }, [cleanup, initializeAudio]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    isInitialized,
  };
};

export { useAudioStreamer };
