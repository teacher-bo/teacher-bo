import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface GameSelectionModalProps {
  visible: boolean;
  onSelect: (gameKey: string) => void;
}

interface Game {
  key: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  disabled?: boolean;
}

const GAMES: Game[] = [
  {
    key: "sabotage",
    name: "사보타지",
    icon: "hammer-outline",
    color: "#8B4513",
  },
  {
    key: "rummikub",
    name: "루미큐브",
    icon: "grid-outline",
    color: "#FF6B6B",
  },
  {
    key: "halligalli",
    name: "할리갈리",
    icon: "notifications-outline",
    color: "#4ECDC4",
  },
  {
    key: "bang",
    name: "뱅",
    icon: "flash-outline",
    color: "#FFD93D",
    disabled: true,
  },
];

export default function GameSelectionModal({
  visible,
  onSelect,
}: GameSelectionModalProps) {
  const { width } = Dimensions.get("window");
  const modalWidth =
    Platform.OS === "web" ? Math.min(400, width - 40) : width - 40;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      statusBarTranslucent
    >
      <View style={styles.centeredView}>
        <View style={styles.backdrop} />

        <View style={[styles.modalView, { width: modalWidth }]}>
          <ModalContent onSelect={onSelect} />
        </View>
      </View>
    </Modal>
  );
}

function ModalContent({ onSelect }: { onSelect: (gameKey: string) => void }) {
  return (
    <>
      <Text style={styles.title}>어떤 게임을 질문하시겠어요?</Text>

      <View style={styles.gamesGrid}>
        {GAMES.map((game) => (
          <TouchableOpacity
            key={game.key}
            style={[styles.gameCard, game.disabled && styles.gameCardDisabled]}
            onPress={() => !game.disabled && onSelect(game.key)}
            activeOpacity={game.disabled ? 1 : 0.7}
            disabled={game.disabled}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: game.color + "20" },
                game.disabled && styles.iconContainerDisabled,
              ]}
            >
              <Ionicons
                name={game.icon}
                size={48}
                color={game.disabled ? "#666" : game.color}
              />
            </View>
            <Text
              style={[
                styles.gameName,
                game.disabled && styles.gameNameDisabled,
              ]}
            >
              {game.name}
            </Text>
            {game.disabled && (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>준비중</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.hint}>게임을 선택하면 질문을 시작할 수 있어요</Text>
    </>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalView: {
    backgroundColor: "rgba(30, 30, 30, 0.98)",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    overflow: "hidden",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 32,
    textAlign: "center",
  },
  gamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },
  gameCard: {
    width: 140,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  gameCardDisabled: {
    opacity: 0.5,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainerDisabled: {
    backgroundColor: "rgba(100, 100, 100, 0.2) !important" as any,
  },
  gameName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  gameNameDisabled: {
    color: "#999",
  },
  comingSoonBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 165, 0, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 165, 0, 0.4)",
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFA500",
  },
  hint: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    fontStyle: "italic",
  },
});
