import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function GamesScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Board Games</ThemedText>
      <ThemedText>Discover and explore board games here!</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
});
