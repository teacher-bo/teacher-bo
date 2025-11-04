import { StatusBar } from "expo-status-bar";
import { useRef, useEffect, useMemo } from "react";
import { StyleSheet, View, Animated } from "react-native";

type TOptions = {
  fadeDuration?: number;
  staggerDelay?: number;
  pauseDuration?: number;
  cycleInterval?: number;
};

const DEFAULT_CONF: TOptions = {
  fadeDuration: 300, // Duration of fade in/out animation per word (ms)
  staggerDelay: 100, // Delay between each word's animation start (ms)
  pauseDuration: 2000, // Pause time after all words are fully visible (ms)
  cycleInterval: 4000, // Time between animation cycle repeats (ms)
};

export const Typography = ({
  text,
  options = {
    fadeDuration: DEFAULT_CONF.fadeDuration,
    staggerDelay: DEFAULT_CONF.staggerDelay,
    pauseDuration: DEFAULT_CONF.pauseDuration,
    cycleInterval: DEFAULT_CONF.cycleInterval,
  },
}: {
  text: string;
  options?: TOptions;
}) => {
  // Split by newlines first, then by spaces, keeping track of line breaks
  const segments = useMemo(() => {
    const lines = text.split("\\n");
    const result: Array<{ word: string; isLineBreak: boolean }> = [];

    lines.forEach((line, lineIndex) => {
      const words = line.split(" ");
      words.forEach((word) => {
        if (word) {
          result.push({ word, isLineBreak: false });
        }
      });
      // Add line break marker except for the last line
      if (lineIndex < lines.length - 1) {
        result.push({ word: "", isLineBreak: true });
      }
    });

    return result;
  }, [text]);

  // Create animated values for each word
  const animatedOpacities = useRef(
    Array.from({ length: segments.length }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Create fade in animation for all words
    const createFadeInAnimations = () =>
      animatedOpacities.map((opacity) =>
        Animated.timing(opacity, {
          toValue: 1,
          duration: options.fadeDuration,
          useNativeDriver: true,
        })
      );

    // Create fade out animation for all words
    const createFadeOutAnimations = () =>
      animatedOpacities.map((opacity) =>
        Animated.timing(opacity, {
          toValue: 0,
          duration: options.fadeDuration,
          useNativeDriver: true,
        })
      );

    // Run complete animation cycle
    const runAnimationCycle = () => {
      const fadeInAnimations = createFadeInAnimations();

      Animated.stagger(options.staggerDelay!, fadeInAnimations).start(() => {
        // Wait before fading out
        setTimeout(() => {
          const fadeOutAnimations = createFadeOutAnimations();
          Animated.stagger(
            options.staggerDelay!,
            fadeOutAnimations.reverse()
          ).start();
        }, options.pauseDuration);
      });
    };

    // Start animation immediately on mount
    runAnimationCycle();

    // Then repeat with interval
    const timer = setInterval(runAnimationCycle, options.cycleInterval);

    return () => {
      clearInterval(timer);
    };
  }, [animatedOpacities]);

  return (
    <View style={styles.textContainer}>
      {segments.map((segment, index) =>
        segment.isLineBreak ? (
          <View key={index} style={styles.lineBreak} />
        ) : (
          <Animated.Text
            key={index}
            style={[
              styles.word,
              {
                opacity: animatedOpacities[index],
              },
            ]}
          >
            {segment.word}{" "}
          </Animated.Text>
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  textContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  word: {
    fontSize: 40,
    fontWeight: "bold",
  },
  lineBreak: {
    width: "100%",
    height: 0,
  },
});
