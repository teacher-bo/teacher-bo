import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  Dimensions,
} from "react-native";
import Pdf from "react-native-pdf";
import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";

// 1. PDF 파일 매핑
export const RULEBOOK_FILES: Record<string, any> = {
  rummikub: require("../assets/rulebooks/rummikub.rulebook.pdf"),
  halligalli: require("../assets/rulebooks/halligalli.rulebook.pdf"),
  sabotage: require("../assets/rulebooks/sabotage.rulebook.pdf"),
};

// 2. 게임 키 -> 영어 이름 매핑
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
  const source =
    gameKey && RULEBOOK_FILES[gameKey]
      ? { uri: Asset.fromModule(RULEBOOK_FILES[gameKey]).uri, cache: true }
      : null;

  if (!source) return null;

  const gameName = gameKey
    ? GAME_NAMES[gameKey] || gameKey.charAt(0).toUpperCase() + gameKey.slice(1)
    : "Game";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{gameName} Rulebook</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <Pdf
          source={source}
          page={initialPage} // 페이지 이동
          style={styles.pdf}
          fitPolicy={0} // 너비 맞춤
          spacing={10}
          onError={(error) => {
            console.log("PDF Load Error:", error);
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#242b38",
  },
  header: {
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#1a1f29",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  pdf: {
    flex: 1,
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    backgroundColor: "#f5f5f5",
  },
});
