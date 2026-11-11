type RecognitionAlternative = { transcript: string };

type RecognitionResult = { isFinal: boolean; 0: RecognitionAlternative };

export type RecognitionResultEvent = { results: ArrayLike<RecognitionResult> };

export type RecognitionErrorEvent = { error: string };

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export const IGNORED_RECOGNITION_ERRORS = ["no-speech", "aborted"];

export function createSpeechRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-US";
  return recognition;
}

export function readTranscript(event: RecognitionResultEvent) {
  let finalText = "";
  let interimText = "";
  for (let i = 0; i < event.results.length; i++) {
    const result = event.results[i];
    if (result.isFinal) finalText += result[0].transcript;
    else interimText += result[0].transcript;
  }
  return { finalText: finalText.trim(), fullText: `${finalText}${interimText}`.trim() };
}
