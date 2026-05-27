import { type ReactNode, useEffect, useState } from "react";
import { Platform } from "react-native";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isMounted, setIsMounted] = useState(Platform.OS !== "web");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return <>{isMounted ? children : fallback}</>;
}
