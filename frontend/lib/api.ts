import type { PublicSettings } from "./site";
import type { AdminTeacher, Teacher } from "./teachers";
import type { Message, StreamEvent } from "./types";
import { messageText } from "./utils";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type User = { id: string; name: string; email: string; created_at: string };

export type AdminRole = "owner" | "admin";

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  created_at: string;
  last_seen_at: string | null;
};

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: number;
  feedback?: "up" | "down" | null;
};

export type ConversationSummary = { teacher_id: string; last_message: StoredMessage | null; updated_at: string };

export type RuleSection = { id: string; title: string; rules: string[]; enabled: boolean; order: number };

export type AppSettings = {
  app_name: string;
  llm_model: string;
  llm_temperature: number;
  llm_max_tokens: number;
  history_limit: number;
  stt_model: string;
  default_teacher_id: string;
  signup_enabled: boolean;
  memory_enabled: boolean;
};

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type MemoryMistake = { pattern: string; example: string; correction: string; count: number };

export type MemoryFields = {
  summary: string;
  level: CefrLevel | null;
  goals: string[];
  interests: string[];
  facts: string[];
  strengths: string[];
  mistakes: MemoryMistake[];
};

export type LearnerMemory = MemoryFields & { updated_at: string | null };

export type MemoryResponse = { enabled: boolean; available: boolean; memory: LearnerMemory | null };

export type Stats = {
  learners: number;
  new_learners_7d: number;
  conversations: number;
  active_conversations_7d: number;
  messages: number;
  feedback_up: number;
  feedback_down: number;
  teacher_usage: { teacher_id: string; conversations: number; messages: number }[];
  recent: { id: string; user_name: string; teacher_id: string; last_message: string; updated_at: string }[];
};

export type AdminUser = User & { last_seen_at: string | null; conversations: number; messages: number };

export type AdminConversationSummary = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  teacher_id: string;
  message_count: number;
  last_message: string;
  updated_at: string;
};

export type AdminConversation = AdminConversationSummary & { messages: StoredMessage[]; created_at: string | null };

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function errorMessage(detail: unknown, status: number) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg).replace(/^Value error, /, "");
  return `Request failed (${status}).`;
}

async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(`Can't reach the backend at ${API_URL}. Make sure it's running.`, 0);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(errorMessage(data?.detail, res.status), res.status);
  return data as T;
}

export const api = {
  me: () => request<{ user: User | null }>("/auth/me"),
  signup: (body: { name: string; email: string; password: string }) =>
    request<User>("/auth/signup", { method: "POST", json: body }),
  login: (body: { email: string; password: string }) => request<User>("/auth/login", { method: "POST", json: body }),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),

  teachers: () => request<Teacher[]>("/teachers"),
  publicSettings: () => request<PublicSettings>("/app-settings"),
  health: () => request<{ status: string; model: string }>("/health"),

  myTeachers: () => request<string[]>("/me/teachers"),
  setMyTeachers: (teacherIds: string[]) =>
    request<string[]>("/me/teachers", { method: "PUT", json: { teacher_ids: teacherIds } }),
  myConversations: () => request<ConversationSummary[]>("/me/conversations"),
  conversation: (teacherId: string) => request<StoredMessage[]>(`/me/conversations/${teacherId}`),
  saveConversation: (teacherId: string, messages: StoredMessage[]) =>
    request<{ ok: true }>(`/me/conversations/${teacherId}`, { method: "PUT", json: { messages } }),
  deleteConversation: (teacherId: string) =>
    request<{ ok: true }>(`/me/conversations/${teacherId}`, { method: "DELETE" }),

  memory: () => request<MemoryResponse>("/me/memory"),
  saveMemory: (body: MemoryFields) => request<MemoryResponse>("/me/memory", { method: "PUT", json: body }),
  clearMemory: () => request<{ ok: true }>("/me/memory", { method: "DELETE" }),
  setMemoryEnabled: (enabled: boolean) =>
    request<MemoryResponse>("/me/memory/settings", { method: "PUT", json: { enabled } }),

  admin: {
    login: (body: { email: string; password: string }) =>
      request<AdminAccount>("/admin/auth/login", { method: "POST", json: body }),
    logout: () => request<{ ok: true }>("/admin/auth/logout", { method: "POST" }),
    me: () => request<{ admin: AdminAccount | null }>("/admin/auth/me"),
    changePassword: (body: { current_password: string; new_password: string }) =>
      request<{ ok: true }>("/admin/auth/password", { method: "PUT", json: body }),
    team: () => request<AdminAccount[]>("/admin/team"),
    addMember: (body: { name: string; email: string; password: string; role: AdminRole }) =>
      request<AdminAccount>("/admin/team", { method: "POST", json: body }),
    setMemberRole: (id: string, role: AdminRole) =>
      request<AdminAccount>(`/admin/team/${id}`, { method: "PATCH", json: { role } }),
    removeMember: (id: string) => request<{ ok: true }>(`/admin/team/${id}`, { method: "DELETE" }),
    stats: () => request<Stats>("/admin/stats"),
    teachers: () => request<AdminTeacher[]>("/admin/teachers"),
    teacher: (id: string) => request<AdminTeacher>(`/admin/teachers/${id}`),
    createTeacher: (body: AdminTeacher) => request<AdminTeacher>("/admin/teachers", { method: "POST", json: body }),
    updateTeacher: (id: string, body: Omit<AdminTeacher, "id">) =>
      request<AdminTeacher>(`/admin/teachers/${id}`, { method: "PUT", json: body }),
    deleteTeacher: (id: string) => request<{ ok: true }>(`/admin/teachers/${id}`, { method: "DELETE" }),
    previewPrompt: (body: AdminTeacher) =>
      request<{ prompt: string }>("/admin/teachers/preview-prompt", { method: "POST", json: body }),
    rules: () => request<RuleSection[]>("/admin/rules"),
    createRuleSection: (body: RuleSection) => request<RuleSection>("/admin/rules", { method: "POST", json: body }),
    updateRuleSection: (id: string, body: Omit<RuleSection, "id">) =>
      request<RuleSection>(`/admin/rules/${id}`, { method: "PUT", json: body }),
    deleteRuleSection: (id: string) => request<{ ok: true }>(`/admin/rules/${id}`, { method: "DELETE" }),
    settings: () => request<AppSettings>("/admin/settings"),
    saveSettings: (body: AppSettings) => request<AppSettings>("/admin/settings", { method: "PUT", json: body }),
    users: () => request<AdminUser[]>("/admin/users"),
    userMemory: (id: string) => request<MemoryResponse>(`/admin/users/${id}/memory`),
    deleteUser: (id: string) => request<{ ok: true }>(`/admin/users/${id}`, { method: "DELETE" }),
    conversations: (filters: { teacherId?: string; userId?: string } = {}) => {
      const params = new URLSearchParams();
      if (filters.teacherId) params.set("teacher_id", filters.teacherId);
      if (filters.userId) params.set("user_id", filters.userId);
      const query = params.toString();
      return request<AdminConversationSummary[]>(`/admin/conversations${query ? `?${query}` : ""}`);
    },
    conversation: (id: string) => request<AdminConversation>(`/admin/conversations/${id}`),
    deleteConversation: (id: string) => request<{ ok: true }>(`/admin/conversations/${id}`, { method: "DELETE" }),
  },
};

export function toStoredMessage(m: Message): StoredMessage {
  return { id: m.id, role: m.role, content: messageText(m), created_at: m.createdAt, feedback: m.feedback ?? null };
}

export function fromStoredMessage(m: StoredMessage): Message {
  return {
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.content }],
    status: "done",
    createdAt: m.created_at,
    feedback: m.feedback ?? undefined,
  };
}

export async function streamChat(
  teacherId: string,
  messages: StoredMessage[],
  replyId: string,
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal,
) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacher_id: teacherId, messages, reply_id: replyId }),
      signal,
    });
  } catch (err) {
    if (signal.aborted) throw err;
    throw new ApiError(`Can't reach the backend at ${API_URL}. Make sure it's running.`, 0);
  }
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new ApiError(errorMessage(data?.detail, res.status), res.status);
  }

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

export async function checkHealth(): Promise<{ online: boolean; model: string | null }> {
  try {
    const data = await api.health();
    return { online: true, model: data.model };
  } catch {
    return { online: false, model: null };
  }
}

export async function transcribeAudio(audio: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  const data = await request<{ text: string }>("/transcribe", { method: "POST", body: form });
  return data.text ?? "";
}
