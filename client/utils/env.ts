import { Platform } from "react-native";

const CLIENT_PORT = process.env.EXPO_PUBLIC_CLIENT_PORT || "1001";
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || "1002";
const DEV_LOCAL_IP = process.env.EXPO_PUBLIC_DEV_LOCAL_IP || "192.168.0.1";

function getApiUrl(): string {
  if (__DEV__) {
    const host = Platform.OS === "web" ? "localhost" : DEV_LOCAL_IP;
    return `http://${host}:${CLIENT_PORT}`;
  }

  return process.env.EXPO_PUBLIC_URL || `http://localhost:${CLIENT_PORT}`;
}

function getApiBaseUrl(): string {
  if (__DEV__) {
    const host = Platform.OS === "web" ? "localhost" : DEV_LOCAL_IP;
    return `http://${host}:${API_PORT}`;
  }

  return process.env.EXPO_PUBLIC_API_URL || `http://localhost:${API_PORT}`;
}

function getSocketUrl(): string {
  if (__DEV__) {
    return getApiBaseUrl();
  }

  return process.env.EXPO_PUBLIC_SOCKET_URL || getApiUrl();
}

export const ENV = {
  API_URL: getApiUrl(),
  API_BASE_URL: getApiBaseUrl(),
  SOCKET_URL: getSocketUrl(),
  IS_DEV: __DEV__,
  PLATFORM: Platform.OS,
  CLIENT_PORT,
  API_PORT,
} as const;
