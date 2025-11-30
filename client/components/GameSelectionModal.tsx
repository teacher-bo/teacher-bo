import React from "react";
import {
  Image,
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
  selectedGameKey?: string | null;
}

export interface Game {
  key: string;
  name: string;
  image?: { uri: string; width: number; height: number };
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  disabled?: boolean;
}

export const GAMES: Game[] = [
  {
    key: "sabotage",
    name: "사보타지",
    image: require("./assets/game-icons/sabotage.png"),
    icon: "hammer-outline",
    color: "#8B4513",
  },
  {
    key: "rummikub",
    name: "루미큐브",
    image: require("./assets/game-icons/rummikub.png"),
    icon: "grid-outline",
    color: "#FF6B6B",
  },
  {
    key: "halligalli",
    name: "할리갈리",
    image: require("./assets/game-icons/halligalli.png"),
    icon: "notifications-outline",
    color: "#4ECDC4",
  },
  {
    key: "bang",
    name: "뱅",
    image: require("./assets/game-icons/bang.png"),
    icon: "flash-outline",
    color: "#FFD93D",
    disabled: true,
  },
];

export default function GameSelectionModal({
  visible,
  onSelect,
  selectedGameKey,
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
          <ModalContent onSelect={onSelect} selectedGameKey={selectedGameKey} />
        </View>
      </View>
    </Modal>
  );
}

function ModalContent({
  onSelect,
  selectedGameKey,
}: {
  onSelect: (gameKey: string) => void;
  selectedGameKey?: string | null;
}) {
  return (
    <>
      <Text style={styles.title}>어떤 게임을 질문하시겠어요?</Text>

      <View style={styles.gamesGrid}>
        {GAMES.map((game) => (
          <TouchableOpacity
            key={game.key}
            style={[
              styles.gameCard,
              game.disabled && styles.gameCardDisabled,
              selectedGameKey === game.key && styles.gameCardSelected,
            ]}
            onPress={() => !game.disabled && onSelect(game.key)}
            activeOpacity={game.disabled ? 1 : 0.7}
            disabled={game.disabled}
          >
            {game.image ? (
              <Image
                source={game.image}
                style={{
                  width: "100%",
                  height: "100%",
                  resizeMode: "contain",
                }}
              />
            ) : (
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
            )}
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
    overflow: "hidden",
    width: 140,
    height: 140,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  gameCardDisabled: {
    opacity: 0.5,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  gameCardSelected: {
    borderColor: "#4A9EFF",
    borderWidth: 3,
    backgroundColor: "rgba(74, 158, 255, 0.15)",
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
    marginTop: -32,
    backgroundColor: "#171717ba",
    paddingInline: 12,
    paddingBlock: 4,
    borderRadius: 8,
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
});
