import { Button } from "@/components/Button";
import { Typography } from "@/components/typography";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TypographyPage() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#fafaf8",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
      }}
    >
      <Typography text="오늘은 무슨\n보드게임이 좋을까요?" />
      <Button>시작하기</Button>
    </SafeAreaView>
  );
}
