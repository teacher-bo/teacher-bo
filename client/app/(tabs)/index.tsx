import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { SafeAreaView } from "react-native-safe-area-context";
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
}

export default function HomeScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessionId] = useState<string>(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  const currentlyAddingMessageRef = useRef(false);

  const {
    isRecording,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    audioLevel,
    sampleRate,
    bufferSize,
    sttDatas,
  } = useStreamingAudioService();

  const { chatWithAI, loading: aiLoading, error: aiError } = useOpenAI();

  const {
    speakText,
    isPlaying: isSpeaking,
    isLoading: ttsLoading,
    error: ttsError,
  } = usePollyTTS();

  const [toggleRecordingFlag, setToggleRecordingFlag] = useState(false);
  const {
    isListening: isWakeWordListening,
    isSupported: isWakeWordSupported,
    startListening: startWakeWordListening,
    stopListening: stopWakeWordListening,
    error: wakeWordError,
  } = useWakeWord(
    () => {
      // "보쌤" 감지 시 녹음 시작
      if (!isRecording && !isSpeaking && !aiLoading && !ttsLoading) {
        console.log("Wake word detected! Starting recording...");
        setToggleRecordingFlag((p) => !p);
      }
    },
    {
      wakeWords: ["보쌤", "보셈", "보샘"],
      language: "ko-KR",
      sensitivity: 0.6,
      continuous: true,
    }
  );
  useEffect(() => {
    if (toggleRecordingFlag) {
      startRecording();
    }
  }, [toggleRecordingFlag]);

  // 컴포넌트 마운트 시 웨이크워드 리스닝 시작
  useEffect(() => {
    if (isWakeWordSupported) {
      startWakeWordListening();
      console.log("Wake word listening started");
    } else {
      console.warn("Wake word detection not supported on this platform");
    }

    return () => {
      stopWakeWordListening();
      console.log("Wake word listening stopped");
    };
  }, [isWakeWordSupported, startWakeWordListening, stopWakeWordListening]);

  useEffect(() => {
    if (sttDatas.length === 0) return;
    setMessages((prev) => {
      const latestData = sttDatas[sttDatas.length - 1];

      if (currentlyAddingMessageRef.current) {
        const message = prev[prev.length - 1];
        const exists = message.textItems.find(
          (item) => item.resultId === latestData.resultId
        );

        let textItems: Message["textItems"];
        if (exists) {
          textItems = message.textItems.map((item) =>
            item.resultId === latestData.resultId
              ? { ...item, text: latestData.text }
              : item
          );
        } else {
          textItems = [
            ...message.textItems,
            { resultId: latestData.resultId, text: latestData.text },
          ];
        }

        return prev.map((m) => (m.id === message.id ? { ...m, textItems } : m));
      }

      currentlyAddingMessageRef.current = true;

      const newMessage: Message = {
        id: latestData.resultId,
        textItems: [{ resultId: latestData.resultId, text: latestData.text }],
        isUser: true,
        timestamp: new Date(latestData.timestamp),
      };

      return [...prev, newMessage];
    });
  }, [sttDatas]);

  const startRecording = async () => {
    try {
      // 중복 실행 방지
      if (isRecording || isSpeaking || aiLoading || ttsLoading) {
        console.log("Recording already in progress or system busy");
        return;
      }

      await startAudioRecording();
    } catch (err) {
      console.error("Failed to start recording", err);
      // Alert.alert("오류", "음성 녹음을 시작할 수 없습니다.");
    }
  };

  const stopRecording = async () => {
    try {
      // 중복 실행 방지
      if (!isRecording) {
        console.log("Not currently recording");
        return;
      }

      await stopAudioRecording();
      currentlyAddingMessageRef.current = false;

      // 현재 사용자 메시지에서 텍스트 추출
      const lastMessage = messages[messages.length - 1];
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
          // OpenAI API 호출하여 응답 받기
          console.log("Sending to OpenAI:", userText);

          const aiResponse = await chatWithAI({
            message: userText,
            sessionId: chatSessionId,
            context: messages
              .slice(-4)
              .map((msg) => msg.textItems.map((item) => item.text).join(" "))
              .filter(Boolean), // 최근 4개 메시지를 컨텍스트로 사용
          });

          if (aiResponse) {
            // AI 응답을 메시지로 추가
            const botMessage: Message = {
              id: `bot_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              isUser: false,
              textItems: [
                { resultId: `ai_${Date.now()}`, text: aiResponse.message },
              ],
              timestamp: new Date(),
              source: "OpenAI GPT-4",
            };

            setMessages((prev) => [...prev, botMessage]);

            // AI 응답을 음성으로 재생
            setTimeout(() => {
              speakText(aiResponse.message);
            }, 500);
          }
        }
      }

      if (aiError) {
        console.error("OpenAI API Error:", aiError);
        Alert.alert("AI 오류", aiError);
      }

      if (ttsError) {
        console.error("TTS Error:", ttsError);
        Alert.alert("음성 합성 오류", ttsError);
      }

      if (wakeWordError) {
        console.error("Wake Word Error:", wakeWordError);
        // 웨이크워드 오류는 사용자에게 알리지 않고 콘솔에만 로그
      }
    } catch (err) {
      console.error("Failed to stop recording", err);
      Alert.alert("오류", "음성 처리 중 오류가 발생했습니다.");
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
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={32}
                  color="white"
                />
              </TouchableOpacity>

              {(isRecording ||
                aiLoading ||
                ttsLoading ||
                isSpeaking ||
                isWakeWordListening) && (
                <Text style={styles.micStatusText}>
                  {isRecording
                    ? "듣는 중..."
                    : aiLoading
                    ? "AI 처리 중..."
                    : ttsLoading
                    ? "음성 합성 중..."
                    : isSpeaking
                    ? "음성 재생 중..."
                    : ""}
                </Text>
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
              {`보드게임 규칙, 전략, 추천 등 무엇이든 물어보세요!${
                isWakeWordSupported
                  ? '\n음성으로 "보쌤"을 불러서 시작할 수도 있어요!'
                  : ""
              }`}
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
                  {message.textItems.map((item) => item.text).join(" ")}
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

            {/* AI 로딩 상태 표시 */}
            {(aiLoading || ttsLoading) && (
              <View style={styles.loadingContainer}>
                <Ionicons name="ellipsis-horizontal" size={24} color="#888" />
                <Text style={styles.loadingText}>
                  {aiLoading
                    ? "AI가 답변을 생성하고 있습니다..."
                    : "음성을 합성하고 있습니다..."}
                </Text>
              </View>
            )}

            {/* 하단 녹음 버튼 */}
            <View style={styles.recordingButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.micButton,
                  isRecording && styles.micButtonRecording,
                  (isSpeaking || aiLoading || ttsLoading) &&
                    styles.micButtonDisabled,
                ]}
                onPress={toggleRecording}
                disabled={isSpeaking || aiLoading || ttsLoading}
              >
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={32}
                  color="white"
                />
              </TouchableOpacity>
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
  wakeWordIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.3)",
  },
  wakeWordText: {
    color: "#007AFF",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
});
