import React, { useState, useEffect, useRef } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Breathe from "@/components/Breathe";
import { useStreamingAudioService } from "../../hooks/useStreamingAudioService";
import { useOpenAI } from "../../hooks/useOpenAI";
import { usePollyTTS } from "../../hooks/usePollyTTS";
import { useWakeWord } from "../../hooks/useWakeWord";

interface Message {
  id: string;
  isUser: boolean;
  textItems: { resultId: string; text: string }[];
  timestamp: Date;
  source?: string;
  isDummy?: boolean;
}

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isUser: false,
      textItems: [
        {
          resultId: `item_${Date.now()}`,
          text: "안녕하세요! 보드게임 어시스턴트 보쌤입니다. '보쌤'이라고 불러주세요!",
        },
      ],
      timestamp: new Date(),
    },
    {
      id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
      isUser: true,
      textItems: [
        {
          resultId: `item_${Date.now() + 1}`,
          text: "보쌤, 오늘 날씨 어때?",
        },
      ],
      timestamp: new Date(),
    },
    {
      id: `msg_${Date.now() + 2}_${Math.random().toString(36).substr(2, 9)}`,
      isUser: false,
      textItems: [
        {
          resultId: `item_${Date.now() + 2}`,
          text: "오늘 서울의 날씨는 맑고, 최고 기온은 25도입니다. 야외 활동하기 좋은 날씨네요!",
        },
      ],
      timestamp: new Date(),
    },
  ]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [breatheOffsetY, setBreatheOffsetY] = useState(0);
  const messagesHeight = useRef(new Animated.Value(160)).current; // Initial compact height
  const currentlyAddingMessageRef = useRef(false);

  const {
    isRecording,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    sttDatas,
    resetSttDatas,
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

  // Add new message with slide up animation
  const addMessage = (isUser: boolean, content: string) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isUser,
      textItems: [{ resultId: `item_${Date.now()}`, text: content }],
      timestamp: new Date(),
      source: isUser ? undefined : "OpenAI GPT-4",
    };

    setMessages((prev) => [...prev, newMessage]);
  };

  // Toggle messages expansion
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);

    if (!isExpanded) {
      // Expanding
      setBreatheOffsetY(-250);
      Animated.timing(messagesHeight, {
        toValue: height - 160, // Almost full screen
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      // Collapsing
      setBreatheOffsetY(messages.length > 0 ? -100 : 0);
      Animated.timing(messagesHeight, {
        toValue: 160, // Compact height
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  // Initialize Breathe position slightly up when messages exist
  useEffect(() => {
    if (messages.length > 0 && !isExpanded) {
      setBreatheOffsetY(-100);
    } else if (messages.length === 0) {
      setBreatheOffsetY(0);
    }
  }, [messages.length, isExpanded]);

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
      addDummyMessage();
      startRecording();
    }
  }, [conversationState, isRecording]);

  /**
   * Add dummy message to ensure proper message flow
   */
  const addDummyMessage = () => {
    const dummyMessage: Message = {
      id: `dummy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isUser: false,
      textItems: [{ resultId: `dummy_${Date.now()}`, text: "" }],
      timestamp: new Date(),
      isDummy: true,
    };

    setMessages((prev) => [...prev, dummyMessage]);
    console.log("Added dummy message:", dummyMessage.id);
  };

  // STT 데이터를 실시간으로 메시지에 반영
  useEffect(() => {
    if (sttDatas.length === 0) return;
    if (conversationState !== "LISTENING" || !isRecording) return;

    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      const latestData = sttDatas[sttDatas.length - 1];

      if (currentlyAddingMessageRef.current && lastMessage?.isUser) {
        const exists = lastMessage.textItems.find(
          (item) => item.resultId === latestData.resultId
        );

        let textItems: Message["textItems"];
        if (exists) {
          textItems = lastMessage.textItems.map((item) =>
            item.resultId === latestData.resultId
              ? { ...item, text: latestData.text }
              : item
          );
        } else {
          textItems = [
            ...lastMessage.textItems,
            { resultId: latestData.resultId, text: latestData.text },
          ];
        }

        return prev.map((m) =>
          m.id === lastMessage.id ? { ...m, textItems } : m
        );
      }

      currentlyAddingMessageRef.current = true;

      const newMessage: Message = {
        id: latestData.resultId,
        textItems: [
          {
            resultId: lastMessage?.isDummy ? "-1" : latestData.resultId,
            text: lastMessage?.isDummy ? "" : latestData.text,
          },
        ],
        isUser: true,
        timestamp: new Date(latestData.timestamp),
      };

      console.log("생성된 메시지:", newMessage);
      return [...prev, newMessage];
    });
  }, [sttDatas, conversationState, isRecording]);

  const startRecording = async () => {
    try {
      if (conversationState !== "LISTENING") {
        console.log("Not in LISTENING state");
        return;
      }

      // Clear previous data before starting new recording
      userTranscriptRef.current = "";
      resetSttDatas();
      currentlyAddingMessageRef.current = false;

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

      // Use functional update to get latest messages
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        console.log("Last message:", lastMessage);

        if (
          lastMessage &&
          lastMessage.isUser &&
          lastMessage.textItems.length > 0
        ) {
          const userText = lastMessage.textItems
            .map((item) => item.text)
            .join(" ")
            .trim();

          if (userText) {
            console.log("Sending to OpenAI:", userText);

            // Call AI and add response asynchronously
            (async () => {
              try {
                const aiResponse = await chatWithAI({
                  message: userText,
                  sessionId: chatSessionId,
                });

                if (aiResponse) {
                  const botMessage: Message = {
                    id: `bot_${Date.now()}_${Math.random()
                      .toString(36)
                      .substr(2, 9)}`,
                    isUser: false,
                    textItems: [
                      {
                        resultId: `ai_${Date.now()}`,
                        text: aiResponse.message,
                      },
                    ],
                    timestamp: new Date(),
                    // source: "OpenAI GPT-4",
                  };

                  setMessages((prev) => [...prev, botMessage]);

                  setConversationState("SPEAKING");
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  await speakText(aiResponse.message);
                  console.log("TTS completed, ready for next recording");
                  setConversationState("LISTENING");
                } else {
                  setConversationState("IDLE");
                }
              } catch (err) {
                console.error("AI or TTS error:", err);
                setConversationState("IDLE");
              }
            })();
          } else {
            console.log("No user text detected, skipping AI call");
            setConversationState("IDLE");
          }
        } else {
          console.log("No valid user message found");
          setConversationState("IDLE");
        }

        return prevMessages;
      });

      // Clear user transcript and STT data after capturing
      userTranscriptRef.current = "";
      resetSttDatas();
    } catch (err) {
      console.error("Failed to stop recording", err);
      setConversationState("IDLE");
    } finally {
      // Always clear transcript and STT data on exit
      userTranscriptRef.current = "";
      resetSttDatas();
      currentlyAddingMessageRef.current = false;
    }
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
      {/* Breathe Animation - Circle position controlled by offsetY */}
      <View style={styles.breatheContainer}>
        <Breathe width={width} height={height} offsetY={breatheOffsetY} />
      </View>

      {/* Status Overlay */}
      <View style={styles.statusOverlay}>
        <Text style={styles.statusText}>{getStateText()}</Text>
      </View>

      {/* Messages Container - Expandable */}
      {messages.length > 0 && (
        <Animated.View
          style={[
            styles.messagesContainer,
            {
              height: messagesHeight,
            },
          ]}
        >
          {/* Header - Only visible when expanded */}
          {isExpanded && (
            <View style={styles.messagesHeader}>
              <TouchableOpacity
                onPress={toggleExpanded}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Messages ScrollView */}
          <ScrollView
            style={styles.messagesScrollView}
            showsVerticalScrollIndicator={false}
            scrollEnabled={isExpanded}
          >
            {(isExpanded ? messages : messages.slice(-3))
              .filter((message) => {
                // Filter out dummy messages and messages with empty text
                if (message.isDummy) return false;

                const messageText = message.textItems
                  .map((item) => item.text)
                  .join(" ")
                  .trim();
                return messageText.length > 0;
              })
              .map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.isUser ? styles.userMessage : styles.botMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.isUser
                        ? styles.userMessageText
                        : styles.botMessageText,
                    ]}
                    numberOfLines={isExpanded ? undefined : 2}
                    ellipsizeMode={isExpanded ? undefined : "tail"}
                  >
                    {message.textItems.map((item) => item.text).join(" ")}
                  </Text>
                  {!message.isUser && message.source && isExpanded && (
                    <View style={styles.sourceContainer}>
                      <Ionicons
                        name="document-text-outline"
                        size={12}
                        color="#aaa"
                        style={styles.sourceIcon}
                      />
                      <Text style={styles.sourceText}>{message.source}</Text>
                    </View>
                  )}
                </View>
              ))}
          </ScrollView>

          {/* Tap hint - Only visible when not expanded */}
          {!isExpanded && (
            <TouchableOpacity
              style={styles.tapHintContainer}
              onPress={toggleExpanded}
              activeOpacity={0.8}
            >
              <Text style={styles.tapHint}>탭하여 전체 대화 보기</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  breatheContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  statusOverlay: {
    position: "absolute",
    bottom: 100,
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
  // Unified Messages Container (Expandable)
  messagesContainer: {
    position: "absolute",
    bottom: 140,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  messagesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  messagesTitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  messagesScrollView: {
    flex: 1,
  },
  tapHintContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },
  tapHint: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 11,
    textAlign: "center",
    fontStyle: "italic",
  },
  // Message Bubbles
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  userMessage: {
    backgroundColor: "rgba(0, 122, 255, 0.85)",
    alignSelf: "flex-end",
  },
  botMessage: {
    backgroundColor: "rgba(51, 51, 51, 0.85)",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#fafaf8",
  },
  userMessageText: {
    color: "#fafaf8",
  },
  botMessageText: {
    color: "#fafaf8",
  },
  sourceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  sourceIcon: {
    marginRight: 2,
  },
  sourceText: {
    color: "#ccc",
    fontSize: 12,
    fontStyle: "italic",
  },
});
