export type PublicSettings = {
  app_name: string;
  default_teacher_id: string;
  signup_enabled: boolean;
  mistakes_enabled: boolean;
};

export const DEFAULT_SETTINGS: PublicSettings = {
  app_name: "Fluento",
  default_teacher_id: "",
  signup_enabled: true,
  mistakes_enabled: true,
};

export const SITE = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  keywords: [
    "learn English",
    "English speaking practice",
    "AI English teacher",
    "English conversation practice",
    "spoken English",
    "English grammar correction",
    "IELTS speaking practice",
    "job interview English",
    "business English writing",
    "English vocabulary",
    "learn English in Hindi",
  ],
};

export const TAGLINE = "Learn English by talking with AI teachers";

export function siteTitle(appName: string) {
  return `${appName} – ${TAGLINE}`;
}

export function siteDescription(teacherCount: number, specialties: string[] = []) {
  const who = teacherCount > 0 ? `${teacherCount} AI teacher${teacherCount === 1 ? "" : "s"}` : "AI teachers";
  const focus = specialties.length ? ` Specialties include ${listJoin(specialties.map(lowerFirst))}.` : "";
  return `Practice English with ${who}. Speak or type and get instant, friendly corrections.${focus}`;
}

export function lowerFirst(text: string) {
  return /^[A-Z][a-z]/.test(text) ? text[0].toLowerCase() + text.slice(1) : text;
}

export function listJoin(items: string[], word = "and") {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${word} ${items[items.length - 1]}`;
}
