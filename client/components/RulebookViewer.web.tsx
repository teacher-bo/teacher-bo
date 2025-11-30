import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";

// -----------------------------------------------------------
export const RULEBOOK_FILES: Record<string, any> = {
  rummikub: require("../assets/rulebooks/rummikub.rulebook.pdf"),
  halligalli: require("../assets/rulebooks/halligalli.rulebook.pdf"),
  sabotage: require("../assets/rulebooks/sabotage.rulebook.pdf"),
};

const GAME_NAMES: Record<string, string> = {
  rummikub: "Rummikub",
  halligalli: "Halli Galli",
  sabotage: "Sabotage",
};

interface RulebookViewerProps {
  visible: boolean;
  gameKey: string | null;
  initialPage: number;
  onClose: () => void;
}

export default function RulebookViewer({
  visible,
  gameKey,
  initialPage,
  onClose,
}: RulebookViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  // 라이브러리와 PDF 데이터를 담을 State
  const [PdfLib, setPdfLib] = useState<any>(null);
  const [pdfData, setPdfData] = useState<any>(null);
  const [status, setStatus] = useState("준비 중...");

  useEffect(() => {
    if (!visible || !gameKey) return;

    // 초기화
    setStatus("로딩 중...");
    setPdfData(null);
    setPageNumber(initialPage);

    const load = async () => {
      try {
        // 1. 라이브러리 로드 (v6 방식)
        const reactPdf = require("react-pdf");

        // 2. Worker 설정 (반드시 설치한 버전 2.16.105와 맞춰야 함)
        reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

        setPdfLib(reactPdf);

        // 3. 파일 다운로드 & 변환 (CORS 에러 방지용 필수 단계)
        const asset = Asset.fromModule(RULEBOOK_FILES[gameKey]);
        await asset.downloadAsync();

        const response = await fetch(asset.uri);
        const blob = await response.blob();
        setPdfData(blob);
      } catch (e) {
        console.error("PDF Load Error:", e);
        setStatus("오류 발생");
      }
    };

    load();
  }, [visible, gameKey, initialPage]);

  if (!visible) return null;

  const gameName = gameKey
    ? GAME_NAMES[gameKey] || gameKey.charAt(0).toUpperCase() + gameKey.slice(1)
    : "Game";

  // 라이브러리나 데이터가 준비 안 됐으면 로딩 화면
  if (!PdfLib || !pdfData) {
    return (
      <Modal visible={visible} transparent={true}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "white", marginTop: 10 }}>{status}</Text>
        </View>
      </Modal>
    );
  }

  // 컴포넌트 꺼내기
  const { Document, Page } = PdfLib;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>{gameName} Rulebook</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* PDF 뷰어 */}
        <View style={styles.contentContainer}>
          <Document
            file={pdfData}
            onLoadSuccess={({ numPages }: any) => setNumPages(numPages)}
            loading={<ActivityIndicator size="large" color="#fff" />}
            className="pdf-document"
          >
            <Page
              pageNumber={pageNumber}
              height={600}
              // 중요: CSS 파일 없이도 깨지지 않게 하는 옵션
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>

          {/* 페이지 컨트롤러 */}
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              style={[
                styles.controlButton,
                pageNumber <= 1 && styles.disabledButton,
              ]}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.pageInfo}>
              {pageNumber} / {numPages || "-"}
            </Text>

            <TouchableOpacity
              onPress={() =>
                setPageNumber((p) => Math.min(numPages || 1, p + 1))
              }
              disabled={!numPages || pageNumber >= numPages}
              style={[
                styles.controlButton,
                (!numPages || pageNumber >= numPages) && styles.disabledButton,
              ]}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#1a1f29",
    zIndex: 10,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "600" },
  closeButton: { padding: 8, cursor: "pointer" } as any,
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingTop: 60,
    paddingBottom: 80,
    overflow: "hidden",
  },
  controls: {
    position: "absolute",
    bottom: 30,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#242b38",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 20,
    // @ts-ignore
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.3)",
  } as any,
  controlButton: { padding: 5, cursor: "pointer" } as any,
  disabledButton: { opacity: 0.3, cursor: "default" } as any,
  pageInfo: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    minWidth: 50,
    textAlign: "center",
  },
});
