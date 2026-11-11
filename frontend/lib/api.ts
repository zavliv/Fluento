import type { Message, StreamEvent } from "./types";
import { messageText } from "./utils";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ApiMessage = { role: "user" | "assistant"; content: string };

export function toApiMessages(messages: Message[]): ApiMessage[] {
  return messages
    .map((m) => ({ role: m.role, content: messageText(m) }))
    .filter((m) => m.content.trim().length > 0);
}

export async function streamChat(
  body: { conversation_id: string; messages: ApiMessage[] },
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal,
) {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`The backend responded with status ${res.status}.`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = chunk
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data) onEvent(JSON.parse(data) as StreamEvent);
    }
  }
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
