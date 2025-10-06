// Reexport the native module. On web, it will be resolved to StreamingMicrophoneModule.web.ts
// and on native platforms to StreamingMicrophoneModule.ts
export { default } from "./src/StreamingMicrophoneModule";
export * from "./src/StreamingMicrophoneModule";
