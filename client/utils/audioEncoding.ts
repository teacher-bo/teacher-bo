export type StreamAudioData = string | Float32Array | Int16Array;

export const encodeInt16PcmToBase64 = (pcmData: Int16Array): string => {
  const uint8Array = new Uint8Array(
    pcmData.buffer,
    pcmData.byteOffset,
    pcmData.byteLength
  );
  const chunkSize = 8192;
  let binary = "";

  for (let offset = 0; offset < uint8Array.length; offset += chunkSize) {
    const chunk = uint8Array.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

export const encodeFloat32PcmToBase64 = (data: Float32Array): string => {
  const pcmData = new Int16Array(data.length);

  for (let i = 0; i < data.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, data[i] ?? 0));
    pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return encodeInt16PcmToBase64(pcmData);
};
