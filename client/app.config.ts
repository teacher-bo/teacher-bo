import "tsx/cjs"; // Add this to import TypeScript files
import { ExpoConfig } from "expo/config";
import { config as dotenvConfig } from "dotenv";
import { withProjectBuildGradle } from "@expo/config-plugins";
import { mergeContents } from "@expo/config-plugins/build/utils/generateCode";
import packageJson from "./package.json";

dotenvConfig();

const config: ExpoConfig = {
  name: "Board Game Assistant",
  slug: "board-game-assistant",
  version: packageJson.version,
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  primaryColor: "#0a7ea4",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.dongzoolee.boardgameassistant",
    buildNumber: "1",
    infoPlist: {
      UIBackgroundModes: [
        "background-fetch",
        "background-processing",
        "remote-notification",
      ],
      NSUserTrackingUsageDescription:
        "이 앱은 맞춤형 보드게임 추천을 위해 사용자 데이터를 수집합니다.",
      NSCameraUsageDescription:
        "보드게임 사진을 촬영하기 위해 카메라 접근이 필요합니다.",
      NSPhotoLibraryUsageDescription:
        "보드게임 이미지를 선택하기 위해 사진 라이브러리 접근이 필요합니다.",
      NSLocationWhenInUseUsageDescription:
        "주변 보드게임 카페를 찾기 위해 위치 정보가 필요합니다.",
      NSMicrophoneUsageDescription:
        "보드게임 규칙을 음성으로 검색하기 위해 마이크 접근이 필요합니다.",
    },
  },
  android: {
    package: "com.dongzoolee.boardgameassistant",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.RECORD_AUDIO",
      "android.permission.VIBRATE",
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.WAKE_LOCK",
    ],
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  scheme: "board-game-assistant",
  plugins: [
    "@siteed/expo-audio-studio",
    [
      "expo-audio",
      {
        microphonePermission:
          "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    "expo-router",
    "expo-dev-client",
    [
      "expo-camera",
      {
        cameraPermission:
          "보드게임 사진을 촬영하기 위해 카메라 권한이 필요합니다.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "보드게임 이미지를 선택하기 위해 사진 라이브러리 접근 권한이 필요합니다.",
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "주변 보드게임 카페를 찾기 위해 위치 정보가 필요합니다.",
        locationAlwaysPermission:
          "백그라운드에서 보드게임 이벤트 알림을 위해 위치 정보가 필요합니다.",
        locationWhenInUsePermission:
          "주변 보드게임 카페를 찾기 위해 위치 정보가 필요합니다.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    "expo-notifications",
    "expo-font",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: "board-game-assistant",
    },
  },
};

export default config;
