import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, Dimensions } from 'react-native';
import Pdf from 'react-native-pdf';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';

// 1. 게임 키와 실제 PDF 파일을 매핑합니다.
// assets/rulebooks 폴더에 실제 파일이 있어야 합니다.
export const RULEBOOK_FILES: Record<string, any> = {
  rummikub: require('../assets/rulebooks/rummikub.pdf'),
  halligalli: require('../assets/rulebooks/halligalli.pdf'),
  sabotage: require('../assets/rulebooks/sabotage.pdf'),
};

interface RulebookViewerProps {
  visible: boolean;
  gameKey: string | null;
  initialPage: number;
  onClose: () => void;
}

export default function RulebookViewer({ visible, gameKey, initialPage, onClose }: RulebookViewerProps) {
  // 선택된 게임의 PDF 자원 가져오기
  const source = gameKey && RULEBOOK_FILES[gameKey] 
    ? { uri: Asset.fromModule(RULEBOOK_FILES[gameKey]).uri, cache: true } 
    : null;

  if (!source) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>규칙 설명서 (p.{initialPage})</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* PDF 뷰어 */}
        <Pdf
          source={source}
          page={initialPage} // 여기서 특정 페이지로 엽니다
          onLoadComplete={(numberOfPages, filePath) => {
            console.log(`Number of pages: ${numberOfPages}`);
          }}
          onPageChanged={(page, numberOfPages) => {
            console.log(`Current page: ${page}`);
          }}
          onError={(error) => {
            console.log(error);
          }}
          style={styles.pdf}
          fitPolicy={0} // 0:Width, 1:Height, 2:Both
          spacing={10}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#242b38',
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
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: '#f5f5f5',
  }
});