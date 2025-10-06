import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useAudioService } from "../hooks/useAudioService";

interface AudioRecordingComponentProps {
  sessionId?: string;
}

const AudioRecordingComponent: React.FC<AudioRecordingComponentProps> = ({
  sessionId = `session_${Date.now()}`,
}) => {
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>("");

  const audioServiceConfig = {
    onTranscriptionUpdate: useCallback(
      (result: {
        sessionId: string;
        text: string;
        timestamp: string;
        isFinal: boolean;
        chunkIndex?: number;
      }) => {
        console.log("Transcription update:", result);
        if (result.isFinal) {
          setTranscriptions((prev) => [...prev, result.text]);
        }
      },
      []
    ),

    onSessionUpdate: useCallback(
      (session: { sessionId: string; status: string; message: string }) => {
        console.log("Session update:", session);
        setSessionStatus(`${session.status}: ${session.message}`);
      },
      []
    ),

    onError: useCallback((error: string) => {
      console.error("Audio service error:", error);
      Alert.alert("오류", error);
    }, []),
  };

  const {
    isInitialized,
    isRecording,
    recorderState,
    currentSessionId,
    startRecording,
    stopRecording,
    disconnect,
  } = useAudioService({
    config: audioServiceConfig,
    sessionId,
  });

  const handleStartRecording = async () => {
    const success = await startRecording(sessionId);
    if (success) {
      Alert.alert("녹음 시작", "음성 녹음이 시작되었습니다.");
    }
  };

  const handleStopRecording = async () => {
    const success = await stopRecording();
    if (success) {
      Alert.alert("녹음 중지", "음성 녹음이 중지되었습니다.");
    }
  };

  const clearTranscriptions = () => {
    setTranscriptions([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>음성 녹음 & 실시간 전사</Text>

      {/* 연결 상태 */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          연결 상태: {isInitialized ? "연결됨" : "연결 중..."}
        </Text>
        <Text style={styles.statusText}>
          녹음 상태: {isRecording ? "녹음 중" : "대기 중"}
        </Text>
        {currentSessionId && (
          <Text style={styles.statusText}>세션 ID: {currentSessionId}</Text>
        )}
        {sessionStatus && (
          <Text style={styles.statusText}>세션 상태: {sessionStatus}</Text>
        )}
      </View>

      {/* 녹음 정보 */}
      {recorderState && (
        <View style={styles.recordingInfo}>
          <Text style={styles.infoText}>
            녹음 시간: {Math.floor((recorderState.durationMillis || 0) / 1000)}
            초
          </Text>
          <Text style={styles.infoText}>
            녹음 중: {recorderState.isRecording ? "예" : "아니오"}
          </Text>
        </View>
      )}

      {/* 제어 버튼 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.startButton,
            !isInitialized && styles.disabledButton,
          ]}
          onPress={handleStartRecording}
          disabled={!isInitialized || isRecording}
        >
          <Text style={styles.buttonText}>녹음 시작</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.stopButton,
            !isRecording && styles.disabledButton,
          ]}
          onPress={handleStopRecording}
          disabled={!isRecording}
        >
          <Text style={styles.buttonText}>녹음 중지</Text>
        </TouchableOpacity>
      </View>

      {/* 전사 결과 */}
      <View style={styles.transcriptionContainer}>
        <View style={styles.transcriptionHeader}>
          <Text style={styles.transcriptionTitle}>실시간 전사 결과</Text>
          <TouchableOpacity
            onPress={clearTranscriptions}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>지우기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transcriptionList}>
          {transcriptions.length === 0 ? (
            <Text style={styles.emptyText}>아직 전사된 텍스트가 없습니다.</Text>
          ) : (
            transcriptions.map((text, index) => (
              <View key={index} style={styles.transcriptionItem}>
                <Text style={styles.transcriptionText}>{text}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* 연결 해제 버튼 */}
      <TouchableOpacity
        style={[styles.button, styles.disconnectButton]}
        onPress={disconnect}
      >
        <Text style={styles.buttonText}>연결 해제</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  statusContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#666",
  },
  recordingInfo: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: "#666",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#4CAF50",
  },
  stopButton: {
    backgroundColor: "#f44336",
  },
  disconnectButton: {
    backgroundColor: "#FF9800",
    alignSelf: "center",
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  transcriptionContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transcriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  transcriptionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  clearButton: {
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  transcriptionList: {
    flex: 1,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 16,
    marginTop: 50,
  },
  transcriptionItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#007bff",
  },
  transcriptionText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
  },
});

export default AudioRecordingComponent;
