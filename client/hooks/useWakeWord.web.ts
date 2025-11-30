import { useWakeWord as useWakeWordDesktop } from "./useWakeWord.web-desktop";
import { useWakeWord as useWakeWordMobile } from "./useWakeWord.web-mobile";

function isMobile() {
  const userAgent = navigator.userAgent;

  // 1. 기존 방식의 모바일 문자열 체크
  const isMobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent
    );

  // 2. iOS 13+ iPad 체크 (Mac으로 인식되지만 터치 포인트가 있는 경우)
  const isIPad =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return isMobileUA || isIPad;
}

export const useWakeWord = isMobile() ? useWakeWordMobile : useWakeWordDesktop;
