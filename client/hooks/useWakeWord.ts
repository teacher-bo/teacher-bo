// Platform-specific implementation will be automatically resolved
// by the bundler (.web.ts for web, .native.ts for iOS/Android)
export * from "./useWakeWord.types";
export { useWakeWord } from "./useWakeWord.native";
