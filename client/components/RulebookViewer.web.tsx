import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';

// 1. PDF 파일 매핑
export const RULEBOOK_FILES: Record<string, any> = {
  rummikub: require('../assets/rulebooks/rummikub.rulebook.pdf'),
  halligalli: require('../assets/rulebooks/halligalli.rulebook.pdf'),
  sabotage: require('../assets/rulebooks/sabotage.rulebook.pdf'),
};

interface RulebookViewerProps {
  visible: boolean;
  gameKey: string | null;
  initialPage: number;
  onClose: () => void;
}

export default function RulebookViewer({ visible, gameKey, initialPage, onClose }: RulebookViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // [추가] 화면 너비를 실시간으로 감지
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const isMobile = windowWidth < 600; // 600px 미만이면 모바일로 간주

  useEffect(() => {
    const onChange = ({ window }: { window: any }) => {
      setWindowWidth(window.width);
    };
    // 화면 크기 변경 감지 리스너 (가로모드 전환 등 대응)
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

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

  const srcWithPage = `${pdfUrl}#page=${initialPage}&toolbar=0&view=FitH`;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[
          styles.modalContainer,
          // [핵심] 모바일이면 너비 96% / 높이 94% (거의 꽉 차게)
          //       PC면 너비 85% / 높이 92% (여백 있게)
          { 
            width: isMobile ? '96%' : '85%', 
            height: isMobile ? '94%' : '92%' 
          }
        ]}>
          <TouchableOpacity onPress={onClose} style={styles.floatingCloseButton}>
            <Ionicons name="close" size={24} color="#555" />
          </TouchableOpacity>

          <View style={styles.webviewContainer}>
            <iframe
              src={srcWithPage}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title="Rulebook Viewer"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10, // 모바일에서도 최소한의 바깥 여백은 유지
  },
  modalContainer: {
    // 기본값 (PC 기준) - 위에서 style prop으로 덮어씌워짐
    width: '85%',
    maxWidth: 600,       
    height: '92%',       
    backgroundColor: '#fff',
    borderRadius: 12, // 모바일에서는 둥근 정도를 살짝 줄임
    overflow: 'hidden',
    
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  floatingCloseButton: {
    position: 'absolute',
    top: 10,  // 모바일에서 공간 확보를 위해 조금 더 위로
    right: 10,
    width: 32, // 버튼 크기 살짝 조정
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(230, 230, 230, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000, 
    cursor: 'pointer',
  } as any,
  webviewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
});