import { useMemo, useEffect } from "react";
import { Platform, Dimensions } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import {
  useSharedValue,
  useDerivedValue,
  Easing,
  cancelAnimation,
  withRepeat,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import {
  BlurMask,
  vec,
  Canvas,
  Circle,
  Fill,
  Group,
  polar2Canvas,
  mix,
} from "@shopify/react-native-skia";

const c1 = "#61bea2";
const c2 = "#529ca0";

interface TRingProps {
  index: number;
  progress: SharedValue<number>;
  scale: SharedValue<number>;
  ringWidth: number;
  canvasWidth: number;
  canvasHeight: number;
  offsetY: number;
}

const Ring = ({
  index,
  progress,
  scale,
  ringWidth,
  canvasWidth,
  canvasHeight,
  offsetY,
}: TRingProps) => {
  const R = ringWidth / 8;
  const animatedOffsetY = useSharedValue(offsetY);

  // Animate offsetY changes smoothly
  useEffect(() => {
    animatedOffsetY.value = withSpring(offsetY, {
      damping: 20,
      stiffness: 90,
    });
  }, [offsetY, animatedOffsetY]);

  const center = useDerivedValue(
    () => vec(canvasWidth / 2, canvasHeight / 2 + animatedOffsetY.value),
    [canvasHeight, canvasWidth, animatedOffsetY]
  );

  const theta = (index * (2 * Math.PI)) / 6;
  const transform = useDerivedValue(() => {
    const baseExpansion = 0.17; // Minimum separation
    const expansionFactor = baseExpansion + progress.value * scale.value * 0.7;

    const { x, y } = polar2Canvas(
      { theta, radius: 2.8 * R * expansionFactor },
      { x: 0, y: 0 }
    );
    const ringScale = mix(progress.value * scale.value, 0.8, 1);
    return [{ translateX: x }, { translateY: y }, { scale: ringScale }];
  }, [progress, scale]);

  return (
    <Group origin={center} transform={transform}>
      <Circle c={center} r={R} color={index % 2 ? c1 : c2} />
    </Group>
  );
};

export const Breathe = ({
  width,
  offsetY = 0,
}: {
  width: number;
  offsetY?: number;
}) => {
  const wind = Dimensions.get("window");
  const canvasWidth =
    Platform.OS === "web" ? Math.min(wind.width, 440) : wind.width;
  const canvasHeight = wind.height;

  const center = useMemo(
    () => vec(canvasWidth / 2, canvasHeight / 2 + offsetY),
    [canvasHeight, canvasWidth, offsetY]
  );

  const progress = useLoop({ duration: 2400 });
  const pitchScale = useSharedValue(1);

  const transform = useDerivedValue(
    () => [{ rotate: mix(progress.value, -Math.PI, 0) }],
    [progress]
  );

  // Setup audio pitch detection for web only
  useEffect(() => {
    if (Platform.OS !== "web") return;

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let rafId: number | null = null;

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        microphone.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Analyze pitch and update scale
        const detectPitch = () => {
          analyser!.getByteFrequencyData(dataArray);

          // Calculate average frequency intensity
          let sum = 0;
          let maxFreq = 0;
          let maxIndex = 0;

          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
            if (dataArray[i] > maxFreq) {
              maxFreq = dataArray[i];
              maxIndex = i;
            }
          }

          const average = sum / bufferLength;

          // Convert to pitch scale (0 to 1)
          // Higher frequency = larger scale
          const normalizedPitch = Math.min(average / 128, 1);
          const targetScale = normalizedPitch;

          // Smooth animation using spring
          pitchScale.value = withSpring(targetScale, {
            damping: 15,
            stiffness: 150,
          });

          rafId = requestAnimationFrame(detectPitch);
        };

        detectPitch();
      } catch (error) {
        console.error("Error accessing microphone:", error);
      }
    };

    initAudio();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (microphone) microphone.disconnect();
      if (audioContext) audioContext.close();
    };
  }, [pitchScale]);

  return (
    <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
      <Fill color="#242b38" />
      <Group origin={center} transform={transform} blendMode="screen">
        <BlurMask style="solid" blur={40} />
        {new Array(6).fill(0).map((_, index) => {
          return (
            <Ring
              key={index}
              index={index}
              progress={progress}
              scale={pitchScale}
              ringWidth={width}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              offsetY={offsetY}
            />
          );
        })}
      </Group>
    </Canvas>
  );
};

// Export Breathe as default, we can lazy-load this way easier.
export default Breathe;

const useLoop = ({ duration }: { duration: number }) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [duration, progress]);
  return progress;
};
