import { settleParts } from "./events";
import type { Conversation } from "./types";

const KEY = "agent-chat:conversations";

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as Conversation[];
    return data.map((c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.status === "streaming" ? { ...m, status: "stopped", parts: settleParts(m.parts) } : m,
      ),
    }));
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(conversations));
  } catch {}
}
