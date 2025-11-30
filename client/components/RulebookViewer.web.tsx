import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';

// 1. PDF 파일 매핑
export const RULEBOOK_FILES: Record<string, any> = {
  rummikub: require('../assets/rulebooks/rummikub.rulebook.pdf'),
  halligalli: require('../assets/rulebooks/halligalli.rulebook.pdf'),
  sabotage: require('../assets/rulebooks/sabotage.rulebook.pdf'),
};

// 2. 게임 키 -> 게임 이름 매핑 (사실 비슷하긴 함 ㅋ)
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

export default function RulebookViewer({ visible, gameKey, initialPage, onClose }: RulebookViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (gameKey && RULEBOOK_FILES[gameKey]) {
      const asset = Asset.fromModule(RULEBOOK_FILES[gameKey]);
      if (asset.uri) {
        setPdfUrl(asset.uri);
      } else {
        asset.downloadAsync().then(() => {
          setPdfUrl(asset.uri);
        });
      }
    }
  }, [gameKey]);

  if (!visible || !pdfUrl) return null;

  const srcWithPage = `${pdfUrl}#page=${initialPage}`;

  const gameName = gameKey 
    ? (GAME_NAMES[gameKey] || gameKey.charAt(0).toUpperCase() + gameKey.slice(1)) 
    : "Game";

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{gameName} Rulebook </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.webviewContainer}>
          <iframe
            src={srcWithPage}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title={`${gameName} Rulebook`}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0,
    zIndex: 1000,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#1a1f29',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    cursor: 'pointer',
  } as any,
  webviewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
});