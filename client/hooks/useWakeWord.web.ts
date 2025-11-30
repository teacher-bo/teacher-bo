import { useWakeWord as useWakeWordDesktop } from "./useWakeWord.web-desktop";
import { useWakeWord as useWakeWordMobile } from "./useWakeWord.web-mobile";

const isMobile = navigator.userAgent.match(
  /(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i
);

export const useWakeWord = isMobile ? useWakeWordMobile : useWakeWordDesktop;
