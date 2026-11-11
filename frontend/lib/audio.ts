export const LEVEL_BARS = 36;

const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export function pickMimeType() {
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function extensionFor(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export function microphoneError(err: unknown) {
  if (err instanceof DOMException && err.name === "NotAllowedError") {
    return "Microphone access is blocked. Allow it in your browser settings.";
  }
  if (err instanceof DOMException && err.name === "NotFoundError") return "No microphone was found.";
  return "Couldn't start the microphone.";
}

export function joinText(before: string, after: string) {
  return [before.trimEnd(), after.trim()].filter(Boolean).join(" ");
}

export function startLevelMeter(stream: MediaStream, onFrame: (level: number, elapsedMs: number) => void) {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  audioContext.createMediaStreamSource(stream).connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);

  const startedAt = performance.now();
  let lastPaint = 0;
  let frame = 0;

  const tick = (now: number) => {
    if (now - lastPaint > 60) {
      lastPaint = now;
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const s of samples) sum += ((s - 128) / 128) ** 2;
      onFrame(Math.min(1, Math.sqrt(sum / samples.length) * 4), now - startedAt);
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    audioContext.close().catch(() => {});
  };
}
