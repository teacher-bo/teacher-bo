import { Dimensions, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Breathe from "@/components/Breathe";

export default function BreathePage() {
  const wind = Dimensions.get("window");
  const width = Platform.OS === "web" ? 440 : wind.width;
  return (
    <SafeAreaView style={styles.container}>
      <Breathe width={width} height={wind.height} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});
