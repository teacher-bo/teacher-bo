import { StyleSheet, ScrollView } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function RulesScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="title" style={styles.title}>
          Game Rules
        </ThemedText>

        {/* 할리갈리 (Halli Galli) */}
        <ThemedView style={styles.gameSection}>
          <ThemedText type="subtitle" style={styles.gameTitle}>
            🔔 할리갈리 (Halli Galli)
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            게임 준비
          </ThemedText>
          <ThemedText style={styles.content}>
            • 플레이어: 2-6명{"\n"}• 카드 56장을 모든 플레이어에게 동일하게
            나눠줍니다{"\n"}• 각자 앞에 뒤집어진 카드 더미를 놓고 시작합니다
            {"\n"}• 가운데 벨을 놓습니다
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            게임 진행
          </ThemedText>
          <ThemedText style={styles.content}>
            • 시계 방향으로 돌아가며 자신의 카드 더미에서 한 장씩 뒤집어
            놓습니다{"\n"}• 카드에는 과일(바나나, 딸기, 라임, 자두)과 개수가
            그려져 있습니다{"\n"}• 뒤집힌 카드들을 보며 같은 종류의 과일이
            정확히 5개가 되는 순간을 기다립니다
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            벨 치기
          </ThemedText>
          <ThemedText style={styles.content}>
            • 같은 과일이 정확히 5개가 보이면 재빨리 벨을 칩니다{"\n"}• 가장
            먼저 벨을 친 사람이 테이블 위의 모든 뒤집힌 카드를 가져갑니다{"\n"}•
            잘못 벨을 친 사람은 다른 모든 플레이어에게 카드를 1장씩 줍니다
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            승리 조건
          </ThemedText>
          <ThemedText style={styles.content}>
            • 모든 카드를 가져간 사람이 승리합니다{"\n"}• 카드가 떨어진
            플레이어는 탈락합니다
          </ThemedText>
        </ThemedView>

        {/* 스플렌더 (Splendor) */}
        <ThemedView style={styles.gameSection}>
          <ThemedText type="subtitle" style={styles.gameTitle}>
            💎 스플렌더 (Splendor)
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            게임 목표
          </ThemedText>
          <ThemedText style={styles.content}>
            • 보석상이 되어 15점을 먼저 획득하는 것이 목표입니다{"\n"}• 보석을
            수집하고 개발 카드를 구매하여 점수를 얻습니다
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            게임 준비
          </ThemedText>
          <ThemedText style={styles.content}>
            • 플레이어: 2-4명{"\n"}• 보석 토큰을 색깔별로 분류하여 놓습니다
            {"\n"}• 개발 카드 3단계를 각각 4장씩 공개합니다{"\n"}• 귀족 카드를
            플레이어 수 + 1장 공개합니다
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            턴 진행
          </ThemedText>
          <ThemedText style={styles.content}>
            자신의 턴에 다음 중 하나를 선택:{"\n"}
            1. 보석 토큰 3개 가져오기 (서로 다른 색){"\n"}
            2. 같은 색 보석 토큰 2개 가져오기{"\n"}
            3. 개발 카드 구매하기{"\n"}
            4. 개발 카드 예약하기 (황금 토큰 1개 획득)
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            개발 카드
          </ThemedText>
          <ThemedText style={styles.content}>
            • 카드에 표시된 보석 비용을 지불하고 구매합니다{"\n"}• 구매한 카드는
            영구적인 보석 할인을 제공합니다{"\n"}• 일부 카드는 점수를 제공합니다
            {"\n"}• 토큰은 최대 10개까지만 보유 가능합니다
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            승리 조건
          </ThemedText>
          <ThemedText style={styles.content}>
            • 15점 이상을 획득하면 게임이 종료됩니다{"\n"}• 해당 라운드를 마저
            진행한 후 가장 높은 점수를 얻은 플레이어가 승리합니다
          </ThemedText>
        </ThemedView>

        {/* 마피아 게임 (Mafia Game) */}
        <ThemedView style={styles.gameSection}>
          <ThemedText type="subtitle" style={styles.gameTitle}>
            🕵️ 마피아 게임 (Mafia Game)
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            게임 준비
          </ThemedText>
          <ThemedText style={styles.content}>
            • 플레이어: 6명 이상 (8-12명 권장){"\n"}• 진행자(GM) 1명 필요{"\n"}•
            역할 카드: 마피아, 시민, 경찰, 의사 등{"\n"}• 마피아는 전체 인원의
            1/3 정도로 설정
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            역할 설명
          </ThemedText>
          <ThemedText style={styles.content}>
            • 마피아: 밤에 시민을 제거, 낮에는 시민인 척{"\n"}• 시민: 토론을
            통해 마피아를 찾아 투표로 제거{"\n"}• 경찰: 밤에 한 명을 지목하여
            마피아 여부 확인{"\n"}• 의사: 밤에 한 명을 지목하여 마피아
            공격으로부터 보호
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            게임 진행
          </ThemedText>
          <ThemedText style={styles.content}>
            <ThemedText style={styles.bold}>밤 시간:</ThemedText>
            {"\n"}• 모든 플레이어가 눈을 감습니다{"\n"}• 마피아들이 눈을 뜨고
            제거할 시민을 선택합니다{"\n"}• 경찰이 조사할 대상을 선택합니다
            {"\n"}• 의사가 보호할 대상을 선택합니다{"\n\n"}
            <ThemedText style={styles.bold}>낮 시간:</ThemedText>
            {"\n"}• 진행자가 밤에 일어난 일을 발표합니다{"\n"}• 모든 플레이어가
            토론을 진행합니다{"\n"}• 투표를 통해 마피아로 의심되는 사람을
            제거합니다
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            승리 조건
          </ThemedText>
          <ThemedText style={styles.content}>
            • 마피아 승리: 마피아 수 = 시민 수가 되면 승리{"\n"}• 시민 승리:
            모든 마피아를 제거하면 승리
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            게임 팁
          </ThemedText>
          <ThemedText style={styles.content}>
            • 마피아: 의심받지 않도록 자연스럽게 행동{"\n"}• 시민: 논리적으로
            추리하고 투표에 신중하게 참여{"\n"}• 경찰: 조사 결과를 적절한
            타이밍에 공개{"\n"}• 의사: 중요한 역할을 보호하되 자신도 노출되지
            않도록 주의
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
  },
  gameSection: {
    marginBottom: 30,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  gameTitle: {
    marginBottom: 15,
    textAlign: "center",
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  content: {
    lineHeight: 22,
    marginBottom: 10,
  },
  bold: {
    fontWeight: "bold",
  },
});
