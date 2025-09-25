import React, { useState } from "react";
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
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { ThemedText } from "@/components/ThemedText";
import { SafeAreaView } from "react-native-safe-area-context";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function HomeScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  // ([
  //   {
  //     id: "1",
  //     text: "보쌤!",
  //     isUser: true,
  //     timestamp: new Date(),
  //   },
  //   {
  //     id: "2",
  //     text: "네, 무엇을 도와드릴까요?",
  //     isUser: false,
  //     timestamp: new Date(),
  //   },
  //   {
  //     id: "3",
  //     text: "사보타지 게임에서 6명이 플레이 할 때 역할카드 몇 개 중에서 뽑아가야해?",
  //     isUser: true,
  //     timestamp: new Date(),
  //   },
  //   {
  //     id: "4",
  //     text: "사보타지 게임에서 6명이 플레이할 때는 역할 카드 9장 중에서 뽑아가야 합니다. (광부 5장, 사보타지 3장, 예언자 1장)",
  //     isUser: false,
  //     timestamp: new Date(),
  //   },
  //   {
  //     id: "5",
  //     text: "디럭스판이랑 차이가 있나?",
  //     isUser: true,
  //     timestamp: new Date(),
  //   },
  //   {
  //     id: "6",
  //     text: "아니요, 디럭스 버전과 일반 버전의 역할 카드 구성은 동일합니다.",
  //     isUser: false,
  //     timestamp: new Date(),
  //   },
  // ]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

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
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("권한 필요", "음성 녹음을 위해 마이크 권한이 필요합니다.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("오류", "음성 녹음을 시작할 수 없습니다.");
    }
  };

  const transcribeAudio = async (audioUri: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: audioUri,
        type: "audio/m4a",
        name: "audio.m4a",
      } as any);
      formData.append("model", "whisper-1");
      formData.append("language", "ko");

      // TODO: 실제 OpenAI API 키를 환경변수나 설정에서 가져와야 함
      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("STT API 요청 실패");
      }

      const result = await response.json();
      return result.text;
    } catch (error) {
      console.error("STT Error:", error);
      return null;
    }
  };

  const sendToGemini = async (text: string): Promise<string> => {
    try {
      // TODO: 실제 Gemini API 연동 구현
      // 현재는 목업 응답
      const responses = [
        "안녕하세요! 어떤 보드게임의 규칙을 알고 싶으신가요?",
        "보드게임에 대해 더 자세히 알려주시면 도움을 드릴 수 있습니다.",
        "해당 게임의 규칙을 설명해드리겠습니다.",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "죄송합니다. 현재 서비스에 문제가 있습니다. 잠시 후 다시 시도해주세요.";
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        setIsLoading(true);

        // 음성을 텍스트로 변환
        const transcriptedText = await transcribeAudio(uri);

        if (transcriptedText) {
          addMessage(transcriptedText, true);

          // Gemini API에 텍스트 전송하고 응답 받기
          const botResponse = await sendToGemini(transcriptedText);
          addMessage(botResponse, false);

          // TTS로 응답 읽기
          speakText(botResponse);
        } else {
          Alert.alert("오류", "음성을 인식할 수 없습니다. 다시 시도해주세요.");
        }

        setIsLoading(false);
      }
    } catch (err) {
      console.error("Failed to stop recording", err);
      Alert.alert("오류", "음성 처리 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  const speakText = async (text: string) => {
    try {
      setIsSpeaking(true);
      await Speech.speak(text, {
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
                  (isLoading || isSpeaking) && styles.micButtonDisabled,
                ]}
                onPress={toggleRecording}
                disabled={isLoading || isSpeaking}
              >
                {isLoading ? (
                  <ActivityIndicator size="large" color="white" />
                ) : (
                  <Ionicons
                    name={isRecording ? "stop" : "mic"}
                    size={32}
                    color="white"
                  />
                )}
              </TouchableOpacity>

              <Text style={styles.micStatusText}>
                {isRecording
                  ? "듣는 중..."
                  : isLoading
                  ? "처리 중..."
                  : isSpeaking
                  ? "음성 재생 중..."
                  : ""}
              </Text>
            </View>
            <ThemedText style={styles.emptyText}>
              "보쌤"을 불러보세요!
            </ThemedText>
            <ThemedText style={styles.emptySubText}>
              보드게임 규칙, 전략, 추천 등 무엇이든 물어보세요!
            </ThemedText>
          </View>
        ) : (
          messages.map((message) => (
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
            </View>
          ))
        )}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>응답을 생성중...</Text>
          </View>
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
});
