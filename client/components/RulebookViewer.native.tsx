import React from "react";

interface RulebookViewerProps {
  visible: boolean;
  gameKey: string | null;
  initialPage: number;
  onClose: () => void;
}

export default function RulebookViewer({
  visible,
  gameKey,
  initialPage,
  onClose,
}: RulebookViewerProps) {
  return <></>;
}
