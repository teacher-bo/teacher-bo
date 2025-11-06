import React, { useState, useEffect, useRef } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Breathe from "@/components/Breathe";
import { useStreamingAudioService } from "../../hooks/useStreamingAudioService";
import { useOpenAI } from "../../hooks/useOpenAI";
import { usePollyTTS } from "../../hooks/usePollyTTS";
import { useWakeWord } from "../../hooks/useWakeWord";

export default function BreathePage() {
  const wind = Dimensions.get("window");
  const width = Platform.OS === "web" ? 440 : wind.width;
  const height = wind.height;

  const generateChatSessionId = () =>
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const [chatSessionId, setChatSessionId] = useState<string>(
    generateChatSessionId()
  );

  const userTranscriptRef = useRef<string>("");

  const {
    isRecording,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    sttDatas,
    onVadEnded,
  } = useStreamingAudioService();

  const { chatWithAI } = useOpenAI();

  const { speakText, stopSpeaking } = usePollyTTS();

  // State machine for conversation flow
  type ConversationState =
    | "IDLE" // Waiting for wake word
    | "GREETING" // Playing greeting message
    | "LISTENING" // Recording user speech
    | "PROCESSING" // AI is processing the query
    | "SPEAKING"; // Playing AI response

  const [conversationState, setConversationState] =
    useState<ConversationState>("IDLE");

  /**
   * Wake word detection and handling logic
   */
  const {
    startListening: startWakeWordListening,
    stopListening: stopWakeWordListening,
  } = useWakeWord(
    async () => {
      if (conversationState !== "IDLE") return;

      console.log("Wake word detected in Breathe page!");
      setConversationState("GREETING");

      try {
        const text = `
          <speak xml:lang="ko-KR">
            <prosody pitch="+2%" volume="x-loud"> 안녕하세요! </prosody>
            <break time="100ms"/>
            <prosody pitch="+8%" rate="fast"> 무엇을 도와드릴까요? </prosody>
          </speak>
        `;

        await speakText(text);

        console.log("Speech completed, starting recording...");
        setConversationState("LISTENING");
      } catch (err) {
        console.error("Greeting TTS failed", err);
        setConversationState("IDLE");
      }
    },
    {
      wakeWords: ["보쌤", "보셈", "보샘", "알리야"],
      language: "ko-KR",
      sensitivity: 0.6,
      continuous: true,
    }
  );

  // Start wake word listening on component mount
  useEffect(() => {
    startWakeWordListening();
    return () => {
      stopWakeWordListening();
    };
  }, []);

  // State가 LISTENING으로 변경되면 녹음 시작
  useEffect(() => {
    if (conversationState === "LISTENING" && !isRecording) {
      startRecording();
    }
  }, [conversationState, isRecording]);

  // STT 데이터 수집
  useEffect(() => {
    if (sttDatas.length === 0) return;
    if (conversationState !== "LISTENING" || !isRecording) return;

    const latestData = sttDatas[sttDatas.length - 1];
    userTranscriptRef.current = sttDatas.map((data) => data.text).join(" ");

    console.log("Updated transcript:", userTranscriptRef.current);
  }, [sttDatas, conversationState, isRecording]);

  const startRecording = async () => {
    try {
      if (conversationState !== "LISTENING") {
        console.log("Not in LISTENING state");
        return;
      }

      userTranscriptRef.current = "";
      await startAudioRecording();
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
      setConversationState("IDLE");
    }
  };

  const stopRecording = async () => {
    try {
      if (conversationState !== "LISTENING") {
        console.log("Not currently in LISTENING state");
        return;
      }

      console.log("Recording stopped");
      setConversationState("PROCESSING");
      await stopAudioRecording();

      const userText = userTranscriptRef.current.trim();

      if (userText) {
        console.log("Sending to OpenAI:", userText);

        const aiResponse = await chatWithAI({
          message: userText,
          sessionId: chatSessionId,
        });

        if (aiResponse) {
          try {
            setConversationState("SPEAKING");
            await new Promise((resolve) => setTimeout(resolve, 500));
            await speakText(aiResponse.message);
            console.log("TTS completed, ready for next recording");
            setConversationState("LISTENING");
            return;
          } catch (err) {
            console.error("TTS playback error:", err);
          }
        }
      }
    } catch (err) {
      console.error("Failed to stop recording", err);
    }

    setConversationState("IDLE");
  };

  // VAD ended event handler
  useEffect(() => {
    if (onVadEnded) {
      onVadEnded((data) => {
        console.log("🎙️ VAD ended in Breathe page:", data);
        if (conversationState === "LISTENING" && isRecording) {
          console.log("Stopping recording due to VAD ended event");
          stopRecording();
        }
      });
    }
  }, [onVadEnded, isRecording, conversationState]);

  // Show conversation state indicator
  const getStateText = () => {
    switch (conversationState) {
      case "IDLE":
        return '"보쌤"을 불러보세요';
      case "GREETING":
        return "인사하는 중...";
      case "LISTENING":
        return "듣는 중...";
      case "PROCESSING":
        return "AI 처리 중...";
      case "SPEAKING":
        return "답변하는 중...";
      default:
        return "";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Breathe width={width} height={height} />
      <View style={styles.statusOverlay}>
        <Text style={styles.statusText}>{getStateText()}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  statusOverlay: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
