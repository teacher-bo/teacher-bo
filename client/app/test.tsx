import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { Button } from "@/components/Button";
import { ClientOnly } from "@/components/ClientOnly";
import { Text } from "@/components/ui/Text";
import { ENV } from "@/utils/env";

type HealthState = "checking" | "online" | "offline";

interface WhisperHealth {
  ok: boolean;
  serviceUrl: string;
  model: string;
}

interface WhisperSegment {
  id: number;
  startMs: number | null;
  endMs: number | null;
  text: string;
}

interface WhisperResult {
  text: string;
  segments: WhisperSegment[];
  durationMs: number;
  model: string;
  language: string;
  serviceUrl: string;
}

const languageOptions = ["ko", "auto", "en"] as const;
const webInputStyle: React.CSSProperties = {
  display: "none",
};

export default function WhisperTestPage() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ClientOnly fallback={<View style={styles.page} />}>
        <WhisperTestContent />
      </ClientOnly>
    </>
  );
}

function WhisperTestContent() {
  const { width } = useWindowDimensions();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [health, setHealth] = useState<WhisperHealth | null>(null);
  const [healthState, setHealthState] = useState<HealthState>("checking");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [language, setLanguage] =
    useState<(typeof languageOptions)[number]>("ko");
  const [prompt, setPrompt] = useState(
    "보드게임 규칙과 음성 명령을 한국어로 인식",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadHovered, setIsUploadHovered] = useState(false);
  const [result, setResult] = useState<WhisperResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isWide = width >= 980;
  const healthLabel = useMemo(() => {
    if (healthState === "checking") {
      return "Checking";
    }

    return healthState === "online" ? "Online" : "Offline";
  }, [healthState]);

  const checkHealth = useCallback(async () => {
    setHealthState("checking");

    try {
      const response = await fetch(
        `${ENV.API_BASE_URL}/api/test/whisper/health`,
      );
      const data = parseHealth(await response.json());

      setHealth(data);
      setHealthState(data.ok ? "online" : "offline");
    } catch {
      setHealth(null);
      setHealthState("offline");
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  const openFilePicker = useCallback(() => {
    if (Platform.OS !== "web") {
      return;
    }

    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0] ?? null;

      setSelectedFile(file);
      setResult(null);
      setErrorMessage(null);
    },
    [],
  );

  const submit = useCallback(async () => {
    if (!selectedFile) {
      setErrorMessage("오디오 파일이 필요합니다.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("audio", selectedFile, selectedFile.name);
    formData.append("language", language);
    formData.append("prompt", prompt);
    formData.append("temperature", "0.0");

    try {
      const response = await fetch(`${ENV.API_BASE_URL}/api/test/whisper`, {
        method: "POST",
        body: formData,
      });
      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(extractErrorMessage(data) ?? `HTTP ${response.status}`);
      }

      setResult(parseWhisperResult(data));
      await checkHealth();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Whisper 테스트에 실패했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [checkHealth, language, prompt, selectedFile]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.eyebrow}>Teacher Bo Test Router</Text>
          <Text style={styles.title}>Whisper.cpp Test Lab</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            healthState === "online" && styles.statusPillOnline,
            healthState === "offline" && styles.statusPillOffline,
          ]}
        >
          {healthState === "checking" ? (
            <ActivityIndicator color="#f8fafc" size="small" />
          ) : (
            <View
              style={[
                styles.statusDot,
                healthState === "online" && styles.statusDotOnline,
                healthState === "offline" && styles.statusDotOffline,
              ]}
            />
          )}
          <Text style={styles.statusText}>{healthLabel}</Text>
        </View>
      </View>

      <View
        style={[
          styles.workspace,
          isWide ? styles.workspaceWide : styles.workspaceNarrow,
        ]}
      >
        <View style={styles.inputPane}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Audio Source</Text>
            <Button
              size="sm"
              variant="ghost"
              iconLeft="refresh"
              onPress={checkHealth}
            >
              Refresh
            </Button>
          </View>

          {Platform.OS === "web" &&
            React.createElement("input", {
              ref: fileInputRef,
              type: "file",
              accept: "audio/*,.wav,.mp3,.m4a,.webm,.ogg",
              style: webInputStyle,
              onChange: handleFileChange,
            })}

          <Pressable
            onPress={openFilePicker}
            onHoverIn={() => setIsUploadHovered(true)}
            onHoverOut={() => setIsUploadHovered(false)}
            style={({ pressed }) => [
              styles.uploadZone,
              (pressed || isUploadHovered) && styles.uploadZoneActive,
            ]}
          >
            <View style={styles.uploadIconWrap}>
              <Ionicons name="cloud-upload-outline" size={28} color="#f8fafc" />
            </View>
            <View style={styles.uploadCopy}>
              <Text style={styles.uploadTitle}>
                {selectedFile ? selectedFile.name : "Select audio file"}
              </Text>
              <Text style={styles.uploadMeta}>
                {selectedFile
                  ? `${formatBytes(selectedFile.size)} · ${formatDate(
                      selectedFile.lastModified,
                    )}`
                  : "wav, mp3, m4a, webm, ogg"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
          </Pressable>

          <View style={styles.controlBlock}>
            <Text style={styles.label}>Language</Text>
            <View style={styles.segmentedControl}>
              {languageOptions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setLanguage(option)}
                  style={[
                    styles.segment,
                    language === option && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      language === option && styles.segmentTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.controlBlock}>
            <Text style={styles.label}>Prompt</Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              multiline
              placeholder="prompt"
              placeholderTextColor="#64748b"
              style={styles.promptInput}
            />
          </View>

          <Button
            fullWidth
            size="lg"
            iconLeft="mic"
            isLoading={isSubmitting}
            disabled={!selectedFile || isSubmitting}
            onPress={submit}
          >
            Run Whisper Test
          </Button>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={18} color="#fecaca" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}
        </View>

        <View style={styles.outputPane}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Result</Text>
            <Text style={styles.endpointText}>
              {health?.model ?? "base"} · {health?.serviceUrl ?? "pending"}
            </Text>
          </View>

          <View style={styles.metricsRow}>
            <Metric
              label="Model"
              value={result?.model ?? health?.model ?? "base"}
            />
            <Metric
              label="Latency"
              value={result ? `${(result.durationMs / 1000).toFixed(2)}s` : "—"}
            />
            <Metric
              label="Segments"
              value={`${result?.segments.length ?? 0}`}
            />
          </View>

          <View style={styles.transcriptSurface}>
            <Text style={result ? styles.transcriptText : styles.emptyText}>
              {result?.text || "No transcript yet"}
            </Text>
          </View>

          <View style={styles.segmentList}>
            {(result?.segments ?? []).map((segment) => (
              <View
                key={`${segment.id}-${segment.startMs}`}
                style={styles.segmentRow}
              >
                <Text style={styles.segmentTime}>
                  {formatTimestamp(segment.startMs)} -{" "}
                  {formatTimestamp(segment.endMs)}
                </Text>
                <Text style={styles.segmentContent}>{segment.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseHealth(value: unknown): WhisperHealth {
  if (!isRecord(value)) {
    return {
      ok: false,
      serviceUrl: "unknown",
      model: "base",
    };
  }

  return {
    ok: value.ok === true,
    serviceUrl:
      typeof value.serviceUrl === "string" ? value.serviceUrl : "unknown",
    model: typeof value.model === "string" ? value.model : "base",
  };
}

function parseWhisperResult(value: unknown): WhisperResult {
  if (!isRecord(value)) {
    throw new Error("Invalid whisper.cpp response");
  }

  return {
    text: typeof value.text === "string" ? value.text : "",
    segments: parseSegments(value.segments),
    durationMs: toNumber(value.durationMs) ?? 0,
    model: typeof value.model === "string" ? value.model : "base",
    language: typeof value.language === "string" ? value.language : "ko",
    serviceUrl:
      typeof value.serviceUrl === "string" ? value.serviceUrl : "unknown",
  };
}

function parseSegments(value: unknown): WhisperSegment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((segment) => {
      if (!isRecord(segment)) {
        return null;
      }

      const text = typeof segment.text === "string" ? segment.text : "";

      return {
        id: toNumber(segment.id) ?? 0,
        startMs: toNullableNumber(segment.startMs),
        endMs: toNullableNumber(segment.endMs),
        text,
      };
    })
    .filter((segment): segment is WhisperSegment => segment !== null);
}

function extractErrorMessage(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  const message = value.message ?? value.error;

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === "string").join(", ");
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toNullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : toNumber(value);
}

function formatBytes(value: number): string {
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: number): string {
  return new Date(value).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

function formatTimestamp(value: number | null): string {
  if (value === null) {
    return "--:--";
  }

  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#111827",
  },
  content: {
    minHeight: "100%",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  header: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 26,
  },
  titleGroup: {
    flex: 1,
    gap: 8,
  },
  eyebrow: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: "#f8fafc",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: 0,
  },
  statusPill: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#334155",
  },
  statusPillOnline: {
    backgroundColor: "#166534",
  },
  statusPillOffline: {
    backgroundColor: "#7f1d1d",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#cbd5e1",
  },
  statusDotOnline: {
    backgroundColor: "#86efac",
  },
  statusDotOffline: {
    backgroundColor: "#fecaca",
  },
  statusText: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
  },
  workspace: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    gap: 18,
  },
  workspaceWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  workspaceNarrow: {
    flexDirection: "column",
  },
  inputPane: {
    flex: 0.95,
    gap: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#182132",
    padding: 18,
  },
  outputPane: {
    flex: 1.25,
    gap: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0f172a",
    padding: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0,
  },
  endpointText: {
    flexShrink: 1,
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "right",
  },
  uploadZone: {
    minHeight: 116,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#475569",
    backgroundColor: "#111827",
    padding: 16,
  },
  uploadZoneActive: {
    borderColor: "#38bdf8",
    backgroundColor: "#132033",
  },
  uploadIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0ea5e9",
  },
  uploadCopy: {
    flex: 1,
    gap: 4,
  },
  uploadTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
  },
  uploadMeta: {
    color: "#94a3b8",
    fontSize: 13,
  },
  controlBlock: {
    gap: 9,
  },
  label: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  segmentedControl: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    minWidth: 74,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#111827",
  },
  segmentActive: {
    borderColor: "#38bdf8",
    backgroundColor: "#0e7490",
  },
  segmentText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: "#f8fafc",
  },
  promptInput: {
    minHeight: 92,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#111827",
    color: "#f8fafc",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 8,
    backgroundColor: "#7f1d1d",
    padding: 12,
  },
  errorText: {
    flex: 1,
    color: "#fee2e2",
    fontSize: 13,
    lineHeight: 19,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metric: {
    minWidth: 126,
    flexGrow: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#111827",
    padding: 12,
    gap: 6,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  metricValue: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
  },
  transcriptSurface: {
    minHeight: 210,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
    padding: 16,
  },
  transcriptText: {
    color: "#f8fafc",
    fontSize: 20,
    lineHeight: 31,
    fontWeight: "700",
  },
  emptyText: {
    color: "#475569",
    fontSize: 20,
    lineHeight: 31,
    fontWeight: "700",
  },
  segmentList: {
    gap: 10,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 10,
  },
  segmentTime: {
    width: 96,
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "800",
  },
  segmentContent: {
    flex: 1,
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
  },
});
