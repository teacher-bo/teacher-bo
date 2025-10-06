import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { ThemedText } from "@/components/ThemedText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStreamingAudioService } from "../../hooks/useStreamingAudioService";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  source?: string;
}

export default function HomeScreen() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [realtimeText, setRealtimeText] = useState<string>("");

  // useStreamingAudioService Hook 사용
  const {
    isRecording,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    audioLevel,
    sampleRate,
    bufferSize,
    sttDatas,
  } = useStreamingAudioService();

  useEffect(() => {
    if (sttDatas.length === 0) return;
    setMessages((prev) => {
      const latestData = sttDatas[sttDatas.length - 1];
      const exists = prev.find((msg) => msg.id === latestData.resultId);
      if (exists) {
        // 기존 메시지 업데이트
        return prev.map((msg) =>
          msg.id === latestData.resultId
            ? { ...msg, text: latestData.text }
            : msg
        );
      } else {
        // 새로운 메시지 추가
        const newMessage: Message = {
          id: latestData.resultId,
          text: latestData.text,
          isUser: true,
          timestamp: new Date(latestData.timestamp),
        };
        // 사용자가 마지막으로 보낸 메시지 이후에만 봇 응답 추가
        const lastUserMessageIndex = [...prev]
          .reverse()
          .findIndex((msg) => msg.isUser);
        if (
          lastUserMessageIndex === -1 ||
          prev.length - 1 - lastUserMessageIndex === prev.length - 1
        ) {
          // 마지막 메시지가 사용자 메시지이거나, 사용자가 메시지를 보낸 적이 없는 경우에만 추가
          return [...prev, newMessage];
        } else {
          return prev;
        }
      }
    });
  }, [sttDatas]);

  const generateBotResponse = (userText: string): string => {
    const responses = [
      `"${userText}"에 대해 알려드리겠습니다.`,
      "흥미로운 질문이네요! 보드게임 규칙을 확인해보겠습니다.",
      "네, 그 게임에 대해 설명해드릴 수 있습니다.",
      "좋은 질문입니다. 관련 정보를 찾아보겠습니다.",
      "보드게임 전문가로서 답변드리겠습니다.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const startRecording = async () => {
    try {
      await startAudioRecording();
      speakText("듣는 중입니다. 말씀해주세요.");
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("오류", "음성 녹음을 시작할 수 없습니다.");
    }
  };

  const stopRecording = async () => {
    try {
      await stopAudioRecording();
    } catch (err) {
      console.error("Failed to stop recording", err);
      Alert.alert("오류", "음성 처리 중 오류가 발생했습니다.");
    }
  };

  const speakText = async (text: string) => {
    try {
      setIsSpeaking(true);
      Speech.speak(text, {
        language: "ko-KR",
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSourceClick = (source: string) => {
    Alert.alert("출처 정보", source, [{ text: "확인", style: "default" }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 메시지 영역 */}
      <ScrollView
        contentContainerStyle={{
          justifyContent: "center",
        }}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* <RnApiAudioRecorder /> */}
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.micContainer}>
              <TouchableOpacity
                style={[
                  styles.micButton,
                  isRecording && styles.micButtonRecording,
                ]}
                onPress={toggleRecording}
              >
                {
                  <Ionicons
                    name={isRecording ? "stop" : "mic"}
                    size={32}
                    color="white"
                  />
                }
              </TouchableOpacity>

              <Text style={styles.micStatusText}>
                {isRecording
                  ? "듣는 중..."
                  : isSpeaking
                  ? "음성 재생 중..."
                  : ""}
              </Text>

              {/* 실시간 STT 결과 표시 */}
              {realtimeText && (
                <View style={styles.realtimeTextContainer}>
                  <Text style={styles.realtimeText}>{realtimeText}</Text>
                </View>
              )}

              {/* 오디오 레벨 표시 */}
              {audioLevel > 0 && (
                <View style={styles.audioLevelContainer}>
                  <Text style={styles.audioLevelText}>
                    음성 레벨: {Math.round(audioLevel)}%
                  </Text>
                  <View style={styles.audioLevelBar}>
                    <View
                      style={[
                        styles.audioLevelFill,
                        { width: `${Math.min(100, audioLevel)}%` },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* 스트리밍 정보 표시 */}
              {sampleRate > 0 && (
                <View style={styles.streamingInfoContainer}>
                  <Text style={styles.streamingInfoText}>
                    샘플 레이트: {sampleRate}Hz | 버퍼: {bufferSize}
                  </Text>
                </View>
              )}
            </View>
            <ThemedText style={styles.emptyText}>
              "보쌤"을 불러보세요!
            </ThemedText>
            <ThemedText style={styles.emptySubText}>
              보드게임 규칙, 전략, 추천 등 무엇이든 물어보세요!
            </ThemedText>
          </View>
        ) : (
          <>
            {messages.map((message) => (
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
                >
                  {message.text}
                </Text>
                {!message.isUser && message.source && (
                  <TouchableOpacity
                    style={styles.sourceContainer}
                    onPress={() => handleSourceClick(message.source!)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={12}
                      color="#aaa"
                      style={styles.sourceIcon}
                    />
                    <Text style={styles.sourceText}>{message.source}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* 하단 녹음 버튼 */}
            <View style={styles.recordingButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.micButton,
                  isRecording && styles.micButtonRecording,
                  isSpeaking && styles.micButtonDisabled,
                ]}
                onPress={toggleRecording}
                disabled={isSpeaking}
              >
                {
                  <Ionicons
                    name={isRecording ? "stop" : "mic"}
                    size={32}
                    color="white"
                  />
                }
              </TouchableOpacity>

              {/* 실시간 STT 결과 표시 */}
              {realtimeText && (
                <View style={styles.realtimeTextContainer}>
                  <Text style={styles.realtimeText}>{realtimeText}</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 16,
  },
  messagesContainer: {
    paddingTop: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginVertical: 8,
  },
  userMessage: {
    backgroundColor: "#007AFF",
    alignSelf: "flex-end",
    marginLeft: "15%",
  },
  botMessage: {
    backgroundColor: "#333",
    alignSelf: "flex-start",
    marginRight: "15%",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: "#fff",
  },
  botMessageText: {
    color: "#fff",
  },
  sourceText: {
    color: "#ccc",
    fontSize: 12,
    fontStyle: "italic",
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
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  loadingText: {
    color: "#888",
    marginLeft: 8,
    fontSize: 14,
  },
  micContainer: {
    alignItems: "center",
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  micButtonRecording: {
    backgroundColor: "#FF3B30",
  },
  micButtonDisabled: {
    backgroundColor: "#666",
  },
  micStatusText: {
    color: "#888",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  recordingButtonContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  realtimeTextContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderRadius: 8,
    maxWidth: "90%",
  },
  realtimeText: {
    color: "#007AFF",
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
  audioLevelContainer: {
    marginTop: 12,
    alignItems: "center",
    width: "80%",
  },
  audioLevelText: {
    color: "#888",
    fontSize: 12,
    marginBottom: 4,
  },
  audioLevelBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    overflow: "hidden",
  },
  audioLevelFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  streamingInfoContainer: {
    marginTop: 12,
    alignItems: "center",
  },
  streamingInfoText: {
    color: "#666",
    fontSize: 10,
    textAlign: "center",
    marginVertical: 1,
  },
});
