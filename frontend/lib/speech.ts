import { API_URL } from "./api";

export type SpeechGender = "female" | "male";

const MAX_CHUNK = 380;
const NATURAL_BROWSER_VOICE = /natural|neural|online|premium|enhanced|google/i;
const FEMALE = /female|samantha|victoria|karen|moira|tessa|zira|susan|serena|fiona|ava|allison|kate|aria|jenny/i;
const cache = new Map<string, Promise<string>>();

let audio: HTMLAudioElement | null = null;
let session = 0;

export function splitForSpeech(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*["')\]]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && (current + sentence).length > MAX_CHUNK) {
      chunks.push(current.trim());
      current = "";
    }
    if (sentence.length > MAX_CHUNK) {
      for (let i = 0; i < sentence.length; i += MAX_CHUNK) chunks.push(sentence.slice(i, i + MAX_CHUNK).trim());
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

function fetchSpeech(text: string, gender?: SpeechGender): Promise<string> {
  const key = `${gender ?? ""}|${text}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = fetch(`${API_URL}/speech`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, gender }),
  }).then(async (res) => {
    if (!res.ok) throw new Error("Natural voice unavailable");
    return URL.createObjectURL(await res.blob());
  });
  pending.catch(() => cache.delete(key));
  cache.set(key, pending);
  return pending;
}

function play(url: string): Promise<void> {
  audio ??= new Audio();
  const player = audio;
  return new Promise((resolve, reject) => {
    player.src = url;
    player.onended = () => resolve();
    player.onerror = () => reject(new Error("Playback failed"));
    player.play().catch(reject);
  });
}

function browserSpeak(text: string, gender: SpeechGender | undefined, onEnd: () => void) {
  const synth = window.speechSynthesis;
  if (!synth) return onEnd();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const byGender = gender ? voices.filter((v) => FEMALE.test(v.name) === (gender === "female")) : voices;
  const voice =
    byGender.find((v) => NATURAL_BROWSER_VOICE.test(v.name)) ??
    voices.find((v) => NATURAL_BROWSER_VOICE.test(v.name)) ??
    byGender[0] ??
    voices[0];
  if (voice) utterance.voice = voice;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  synth.speak(utterance);
}

export function stopSpeech() {
  session += 1;
  audio?.pause();
  window.speechSynthesis?.cancel();
}

export async function speak(
  text: string,
  options: { gender?: SpeechGender; onStart?: () => void; onEnd?: () => void } = {},
) {
  stopSpeech();
  const id = ++session;
  const chunks = splitForSpeech(text);
  const finish = () => {
    if (session === id) options.onEnd?.();
  };
  if (!chunks.length) return finish();

  let next = fetchSpeech(chunks[0], options.gender);
  for (let i = 0; i < chunks.length; i++) {
    let url: string;
    try {
      url = await next;
    } catch {
      if (session !== id) return;
      if (i === 0) {
        options.onStart?.();
        browserSpeak(text, options.gender, finish);
      } else {
        finish();
      }
      return;
    }
    if (session !== id) return;
    if (i + 1 < chunks.length) next = fetchSpeech(chunks[i + 1], options.gender);
    if (i === 0) options.onStart?.();
    try {
      await play(url);
    } catch {
      return finish();
    }
    if (session !== id) return;
  }
  finish();
}
