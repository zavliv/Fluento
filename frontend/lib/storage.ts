import { settleParts } from "./events";
import type { TeacherChats } from "./types";

const CHATS_KEY = "fluento:teacher-chats";
const ACTIVE_KEY = "fluento:active-teacher";
const OLD_CHATS_KEY = "orbit:teacher-chats";
const OLD_ACTIVE_KEY = "orbit:active-teacher";

export function loadTeacherChats(): TeacherChats {
  if (typeof window === "undefined") return {};
  try {
    const data = JSON.parse(
      localStorage.getItem(CHATS_KEY) ?? localStorage.getItem(OLD_CHATS_KEY) ?? "{}",
    ) as TeacherChats;
    return Object.fromEntries(
      Object.entries(data).map(([id, messages]) => [
        id,
        messages.map((m) => (m.status === "streaming" ? { ...m, status: "stopped", parts: settleParts(m.parts) } : m)),
      ]),
    );
  } catch {
    return {};
  }
}

export function saveTeacherChats(chats: TeacherChats) {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch {}
}

export function loadActiveTeacher(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY) ?? localStorage.getItem(OLD_ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveTeacher(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}
