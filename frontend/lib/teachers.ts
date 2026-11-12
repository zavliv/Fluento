import type { CSSProperties } from "react";

export type TeacherLevel = "Beginner" | "Intermediate" | "Advanced" | "All levels";
export type TeacherVoice = "female" | "male";

export const LEVELS: TeacherLevel[] = ["Beginner", "Intermediate", "Advanced", "All levels"];

export const GOALS = [
  { id: "speaking", label: "Speaking" },
  { id: "grammar", label: "Grammar" },
  { id: "vocabulary", label: "Vocabulary" },
  { id: "exams", label: "Exams" },
  { id: "work", label: "Work" },
  { id: "beginners", label: "Beginners" },
] as const;

export type TeacherGoal = (typeof GOALS)[number]["id"];

export type Teacher = {
  id: string;
  name: string;
  specialty: string;
  tagline: string;
  description: string;
  quote: string;
  level: TeacherLevel;
  voice: TeacherVoice;
  color: string;
  starters: string[];
  tags: string[];
  goals: TeacherGoal[];
  languages: string[];
  online: boolean;
};

export type Persona = {
  background: string;
  personality: string[];
  teaching_style: string[];
  correction_style: string;
  focus: string[];
  boundaries: string[];
  sample_phrases: string[];
  languages: string[];
  temperature: number;
};

export type AdminTeacher = Omit<Teacher, "languages"> & {
  role: string;
  enabled: boolean;
  order: number;
  persona: Persona;
  created_at?: string;
  updated_at?: string;
};

export function teacherTheme(color: string) {
  return {
    "--accent": `color-mix(in srgb, ${color} 82%, var(--ink))`,
    "--accent-soft": `color-mix(in srgb, ${color} 14%, var(--bg))`,
    "--accent-ink": "var(--bg)",
  } as CSSProperties;
}

export function pickGuide(teachers: Teacher[], defaultId: string) {
  return teachers.find((t) => t.id === defaultId) ?? teachers[0];
}

export function otherLanguages(teacher: Teacher) {
  return teacher.languages.filter((l) => l.trim() && l.trim().toLowerCase() !== "english");
}
