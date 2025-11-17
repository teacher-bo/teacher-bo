import "tsx/cjs"; // Add this to import TypeScript files
import { ExpoConfig } from "expo/config";
import { config as dotenvConfig } from "dotenv";
import { withProjectBuildGradle } from "@expo/config-plugins";
import { mergeContents } from "@expo/config-plugins/build/utils/generateCode";
import packageJson from "./package.json";

dotenvConfig();

const PACKAGE_NAME = "at.leed.teacherbo";
const buildVersion = packageJson.version;

const config: ExpoConfig = {
  scheme: PACKAGE_NAME,
  name: "TeacherBo",
  slug: "teacher-bo-xqj8z4chyh60b5dwb6ih",
  version: buildVersion,
  platforms: ["ios", "android", "web"],
  orientation: "portrait",
  icon: "./assets/icons/ios-light.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  primaryColor: "#0a7ea4",
  assetBundlePatterns: ["**/*"],
  ios: {
    icon: "./assets/icons/ios-light.png",
    supportsTablet: true,
    bundleIdentifier: PACKAGE_NAME,
    infoPlist: {
      NSMicrophoneUsageDescription:
        "보드게임 규칙을 음성으로 검색하기 위해 마이크 접근이 필요합니다.",
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
      },
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: PACKAGE_NAME,
    adaptiveIcon: {
      foregroundImage: "./assets/icons/ios-light.png",
      backgroundColor: "#fafaf8",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.RECORD_AUDIO",
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/icons/favicon.png",
  },
  plugins: [
    "@siteed/expo-audio-studio",
    [
      "expo-speech-recognition",
      {
        microphonePermission:
          "CUSTOM: Allow $(PRODUCT_NAME) to access the microphone",
        speechRecognitionPermission:
          "CUSTOM: Allow $(PRODUCT_NAME) to securely recognize user speech",
        androidSpeechServicePackages: [
          "com.google.android.googlequicksearchbox",
        ],
      },
    ],
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
    [
      "expo-splash-screen",
      {
        image: "./assets/icons/splash-icon-light.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#fafaf8",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: "b36d2ffb-4305-41c3-a7a3-a204b6d29862",
    },
  },
};

/* BEGIN: https://github.com/expo/expo/issues/36461#issuecomment-2846152663 */
const minSdkPatchCode = `
  ext {
    buildToolsVersion = findProperty('android.buildToolsVersion') ?: '36.0.0'
    compileSdkVersion = Integer.parseInt(findProperty('android.compileSdkVersion') ?: '36')
    targetSdkVersion = Integer.parseInt(findProperty('android.targetSdkVersion') ?: '36')
    kotlinVersion = '2.0.21'
  }
`;
// kotlinVersion = findProperty('android.kotlinVersion') ?: '2.0.21'

function withMinSdkProjectGradlePatch(config: ExpoConfig) {
  return withProjectBuildGradle(config, async (config) => {
    if (config.modResults.contents.includes(minSdkPatchCode)) {
      return config;
    }

    const addCode = mergeContents({
      newSrc: minSdkPatchCode,
      tag: "minSdkPatchCode",
      src: config.modResults.contents,
      anchor: "buildscript {",
      comment: "//",
      offset: 1,
    });

    config.modResults.contents = addCode.contents;

    console.log(
      "[minSdkProjectGradlePatch] Gradle patch applied successfully!"
    );

    return config;
  });
}
/* END: https://github.com/expo/expo/issues/36461#issuecomment-2846152663 */

export default withMinSdkProjectGradlePatch(config);
