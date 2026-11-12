import type { PublicSettings } from "./site";
import type { AdminTeacher, Teacher } from "./teachers";
import type { Message, StreamEvent } from "./types";
import { messageText } from "./utils";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const LEVEL_NAMES: Record<CefrLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper intermediate",
  C1: "Advanced",
  C2: "Proficient",
};

export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  level?: CefrLevel | null;
  level_tested_at?: string | null;
  goal?: LearnerGoal | null;
};

export type LearnerGoal = "speaking" | "work" | "exams" | "grammar" | "vocabulary";

export type Recommendation = {
  teacher_id: string | null;
  goal: LearnerGoal | null;
  weak_skill: { skill: "grammar" | "vocabulary" | "speaking"; source: string; detail: string } | null;
  level: CefrLevel | null;
  reasons: { kind: "goal" | "weak" | "level" | "default"; text: string; detail: string }[];
  goal_options: { id: LearnerGoal; label: string }[];
};

export type SkillScores = { grammar: CefrLevel; vocabulary: CefrLevel; fluency: CefrLevel; comprehension: CefrLevel };

export type LevelResult = {
  level: CefrLevel;
  scores: SkillScores;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommended_teacher_id: string | null;
  recommendation_reason: string;
  answer_feedback: { improved: string; tip: string }[];
  plan: { title: string; detail: string; teacher_id: string | null; practice_prompt: string }[];
  quiz_correct: number | null;
  quiz_total: number | null;
  quiz_level: CefrLevel | null;
};

export type QuizFormat = "fill" | "listen" | "judge";

export type QuizQuestion = {
  id: string;
  skill: "grammar" | "vocabulary";
  format: QuizFormat;
  question: string;
  options: string[];
  shown: string | null;
  audio: string | null;
  answer: number;
  answer_text: string;
  sentence: string;
};

export type QuizFeedback = { correct: boolean; answer: string; sentence: string };

export type QuizReviewItem = {
  level: CefrLevel;
  skill: "grammar" | "vocabulary";
  format: QuizFormat;
  shown: number | null;
  question: string;
  options: string[];
  answer_index: number;
  chosen: number;
  correct: boolean;
};

export type LevelTest = {
  id: string;
  status: "in_progress" | "completed";
  phase: "quiz" | "chat" | "done";
  topic: string;
  quiz: {
    total: number;
    answered: number;
    correct: number;
    streak: number;
    results: boolean[];
    climb: CefrLevel;
    current: QuizQuestion | null;
    last: QuizFeedback | null;
  } | null;
  question_count: number;
  answered: number;
  messages: { role: "examiner" | "learner"; content: string; mode?: "typed" | "voice" | null }[];
  result: LevelResult | null;
  quiz_review: QuizReviewItem[];
  created_at: string;
  completed_at: string | null;
};

export type LevelHistoryItem = { id: string; level: CefrLevel; scores: SkillScores; completed_at: string };

export type LevelTestState = {
  config: { enabled: boolean; topics: string[]; quiz_enabled: boolean; quiz_count: number; question_count: number };
  current: LevelTest | null;
  latest: LevelTest | null;
  previous: LevelHistoryItem | null;
  history: LevelHistoryItem[];
};

export type LevelTestConfig = {
  enabled: boolean;
  topics: string[];
  quiz_enabled: boolean;
  quiz_count: number;
  question_count: number;
  examiner_prompt: string;
  grading_prompt: string;
};

export type QuizBank = {
  counts: Record<CefrLevel, number>;
  generating: boolean;
  questions: (QuizQuestion & { level: CefrLevel; answer_index: number })[];
};

export type Badge = { id: string; name: string; description: string; earned_at: string | null };

export type Progress = {
  enabled: boolean;
  placed: boolean;
  rating: number;
  level: CefrLevel;
  band_progress: number;
  confidence: number;
  official_level: CefrLevel | null;
  official_at: string | null;
  streak: {
    current: number;
    best: number;
    freezes: number;
    max_freezes: number;
    freeze_progress: number;
    freeze_every: number;
    done_today: boolean;
    used_freeze_today: boolean;
  };
  today: { xp: number; goal: number; challenges: number };
  xp_week: number;
  xp_total: number;
  badges: Badge[];
  catalog: Badge[];
  calendar: { day: string; xp: number }[];
  check: {
    available: boolean;
    reason: "first" | "level_up" | "weekly" | "wait";
    next_at: string | null;
    last_at: string | null;
  };
  league_enabled: boolean;
  league_opt_in: boolean;
};

export type ChallengeResult = {
  xp: number;
  breakdown: { label: string; xp: number }[];
  correct: number;
  total: number;
  rating_before: number;
  rating_after: number;
  level_before: CefrLevel;
  level_after: CefrLevel;
  band_progress: number;
  streak: number;
  streak_extended: boolean;
  today_xp: number;
  goal: number;
  goal_reached: boolean;
  new_badges: Badge[];
};

export type Challenge = {
  id: string;
  kind: "placement" | "daily";
  status: "quiz" | "speaking" | "completed";
  quiz: LevelTest["quiz"];
  speaking: {
    prompt: string;
    answer: string | null;
    mode: "typed" | "voice" | null;
    score: number | null;
    feedback: string;
    improved: string;
  } | null;
  result: ChallengeResult | null;
};

export type League = {
  enabled: boolean;
  opt_in: boolean;
  week: string;
  ends_at: string;
  entries: { rank: number; name: string; xp: number; me: boolean }[];
  me: { rank: number; name: string; xp: number; me: boolean } | null;
  total: number;
};

export type ProgressConfig = {
  enabled: boolean;
  daily_goal_xp: number;
  placement_rounds: number;
  daily_rounds: number;
  xp_correct: number;
  xp_hard_bonus: number;
  xp_spoken: number;
  xp_level_check: number;
  freeze_every_days: number;
  max_freezes: number;
  check_every_days: number;
  league_enabled: boolean;
  speaking_model: string;
};

export const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

export type AdminLevelTests = {
  distribution: Record<CefrLevel, number>;
  average_quiz_score: number | null;
  spoken_share: number | null;
  tests: {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    level: CefrLevel;
    scores: SkillScores;
    recommended_teacher_id: string | null;
    quiz_correct: number | null;
    quiz_total: number | null;
    spoken_answers: number;
    completed_at: string;
  }[];
};

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
  receipt?: "sent" | "read" | null;
  sig?: string | null;
};

export type GuardrailsConfig = {
  daily_messages: number;
  max_message_chars: number;
  safety_check: boolean;
  steer_off_topic: boolean;
  safety_model: string;
  block_reply: string;
  self_harm_reply: string;
};

export type SafetyFlag = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  teacher_id: string;
  teacher_name: string;
  conversation_id: string | null;
  category: "off_topic" | "jailbreak" | "harmful" | "self_harm";
  reason: string;
  message: string;
  action: "blocked" | "steered" | "allowed";
  reviewed: boolean;
  created_at: string;
};

export type GuardrailsSummary = {
  messages_today: number;
  learners_today: number;
  at_limit_today: number;
  flags_week: Record<string, number>;
  open_flags: number;
  flags: SafetyFlag[];
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
  tts_model: string;
  tts_voice: string;
  default_teacher_id: string;
  signup_enabled: boolean;
  memory_enabled: boolean;
  mistakes_enabled: boolean;
};

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

export const MISTAKE_CATEGORIES = [
  "tense",
  "verb form",
  "agreement",
  "article",
  "preposition",
  "plural",
  "word order",
  "word choice",
  "spelling",
  "punctuation",
  "other",
] as const;

export type MistakeCategory = (typeof MISTAKE_CATEGORIES)[number];

export type Mistake = {
  id: string;
  teacher_id: string;
  message_id: string;
  original: string;
  correction: string;
  category: MistakeCategory;
  rule: string;
  explanation: string;
  mastered: boolean;
  created_at: string;
};

export type MistakeSummary = {
  enabled: boolean;
  total: number;
  open: number;
  mastered: number;
  this_week: number;
  categories: { category: MistakeCategory; count: number }[];
  top_rules: { rule: string; category: MistakeCategory; count: number; original: string; correction: string }[];
};

export type Stats = {
  learners: number;
  new_learners_7d: number;
  conversations: number;
  active_conversations_7d: number;
  messages: number;
  feedback_up: number;
  feedback_down: number;
  mistakes: number;
  mistake_categories: { category: string; count: number }[];
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

  recommendation: () => request<Recommendation>("/me/recommendation"),
  setGoal: (goal: LearnerGoal | null) => request<Recommendation>("/me/goal", { method: "PUT", json: { goal } }),
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

  mistakes: (filters: { status?: "open" | "mastered" | "all"; category?: MistakeCategory } = {}) => {
    const params = new URLSearchParams({ status: filters.status ?? "open" });
    if (filters.category) params.set("category", filters.category);
    return request<Mistake[]>(`/me/mistakes?${params}`);
  },
  mistakeSummary: () => request<MistakeSummary>("/me/mistakes/summary"),
  progress: () => request<Progress>(`/me/progress?tz=${encodeURIComponent(timeZone())}`),
  startChallenge: () => request<Challenge>("/me/challenges", { method: "POST", json: { tz: timeZone() } }),
  answerChallenge: (id: string, choice: number) =>
    request<Challenge>(`/me/challenges/${id}/answer`, { method: "POST", json: { choice } }),
  speakChallenge: (id: string, body: { text?: string; mode?: "typed" | "voice"; skip?: boolean }) =>
    request<Challenge>(`/me/challenges/${id}/speak`, { method: "POST", json: body }),
  league: () => request<League>("/me/league"),
  setLeague: (optIn: boolean) => request<League>("/me/league", { method: "PUT", json: { opt_in: optIn } }),
  levelTest: () => request<LevelTestState>("/me/level-test"),
  startLevelTest: (topic?: string) => request<LevelTest>("/me/level-test", { method: "POST", json: { topic } }),
  answerLevelTest: (id: string, text: string, mode: "typed" | "voice") =>
    request<LevelTest>(`/me/level-test/${id}/answer`, { method: "POST", json: { text, mode } }),
  answerLevelQuiz: (id: string, choice: number) =>
    request<LevelTest>(`/me/level-test/${id}/quiz`, { method: "POST", json: { choice } }),
  gradeLevelTest: (id: string) => request<LevelTest>(`/me/level-test/${id}/grade`, { method: "POST" }),
  cancelLevelTest: (id: string) => request<{ ok: true }>(`/me/level-test/${id}`, { method: "DELETE" }),
  setMistakeMastered: (id: string, mastered: boolean) =>
    request<Mistake>(`/me/mistakes/${id}`, { method: "PATCH", json: { mastered } }),
  deleteMistake: (id: string) => request<{ ok: true }>(`/me/mistakes/${id}`, { method: "DELETE" }),

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
    guardrailsConfig: () => request<GuardrailsConfig>("/admin/guardrails/config"),
    saveGuardrailsConfig: (body: GuardrailsConfig) =>
      request<GuardrailsConfig>("/admin/guardrails/config", { method: "PUT", json: body }),
    guardrailsSummary: (reviewed: boolean) =>
      request<GuardrailsSummary>(`/admin/guardrails/summary?reviewed=${reviewed}`),
    reviewFlag: (id: string, reviewed: boolean) =>
      request<{ ok: true }>(`/admin/guardrails/flags/${id}`, { method: "PUT", json: { reviewed } }),
    progressConfig: () => request<ProgressConfig>("/admin/progress/config"),
    saveProgressConfig: (body: ProgressConfig) =>
      request<ProgressConfig>("/admin/progress/config", { method: "PUT", json: body }),
    levelTestConfig: () => request<LevelTestConfig>("/admin/level-test/config"),
    saveLevelTestConfig: (body: LevelTestConfig) =>
      request<LevelTestConfig>("/admin/level-test/config", { method: "PUT", json: body }),
    resetLevelTestConfig: () => request<LevelTestConfig>("/admin/level-test/config/reset", { method: "POST" }),
    levelTests: () => request<AdminLevelTests>("/admin/level-tests"),
    quizBank: () => request<QuizBank>("/admin/level-test/questions"),
    deleteQuizQuestion: (id: string) =>
      request<{ ok: true }>(`/admin/level-test/questions/${id}`, { method: "DELETE" }),
    resetQuizBank: () => request<{ ok: true }>("/admin/level-test/questions/reset", { method: "POST" }),
    generateQuizQuestions: () => request<{ ok: true }>("/admin/level-test/questions/generate", { method: "POST" }),
    addQuizQuestion: (body: {
      level: CefrLevel;
      skill: "grammar" | "vocabulary";
      question: string;
      options: string[];
      answer_index: number;
    }) =>
      request<QuizQuestion & { level: CefrLevel; answer_index: number }>("/admin/level-test/questions", {
        method: "POST",
        json: body,
      }),
    levelTestDetail: (id: string) => request<LevelTest>(`/admin/level-tests/${id}`),
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
  return {
    id: m.id,
    role: m.role,
    content: messageText(m),
    created_at: m.createdAt,
    feedback: m.feedback ?? null,
    receipt: m.receipt ?? null,
    sig: m.sig ?? null,
  };
}

export function fromStoredMessage(m: StoredMessage): Message {
  return {
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.content }],
    status: "done",
    createdAt: m.created_at,
    feedback: m.feedback ?? undefined,
    receipt: m.receipt ?? undefined,
    sig: m.sig ?? undefined,
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
