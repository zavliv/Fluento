import type { CSSProperties } from "react";

export type TeacherLevel = "Beginner" | "Intermediate" | "Advanced" | "All levels";
export type TeacherVoice = "female" | "male";

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
  personality: string;
  starters: string[];
  tags: string[];
  goals: TeacherGoal[];
  level: TeacherLevel;
  voice: TeacherVoice;
  color: string;
  enabled: boolean;
};

export const TEACHERS: Teacher[] = [
  {
    id: "maya",
    name: "Maya",
    specialty: "Everyday conversation",
    tagline: "Chat like a friend, learn without pressure.",
    personality: "Warm, patient and encouraging. Corrects gently and keeps the conversation flowing.",
    starters: [
      "Hi Maya! Can we just chat about my day?",
      "Help me practise small talk with a new colleague.",
      "What's a natural way to say I'm really tired?",
    ],
    tags: ["Small talk", "Confidence", "Daily life"],
    goals: ["speaking", "beginners"],
    level: "Beginner",
    voice: "female",
    color: "#e11d48",
    enabled: true,
  },
  {
    id: "arjun",
    name: "Arjun",
    specialty: "Job interviews",
    tagline: "Practice real interview questions with honest feedback.",
    personality: "Professional and direct. Asks realistic questions and scores each answer.",
    starters: [
      "Can you take my mock interview for a frontend developer role?",
      'Help me answer "Tell me about yourself".',
      'How should I answer "What is your biggest weakness?"',
    ],
    tags: ["Mock interviews", "STAR answers", "Feedback scores"],
    goals: ["speaking", "work"],
    level: "Intermediate",
    voice: "male",
    color: "#4f46e5",
    enabled: true,
  },
  {
    id: "emma",
    name: "Emma",
    specialty: "Grammar",
    tagline: "Understand the rule behind every mistake.",
    personality: "Precise and clear. Explains grammar rules with simple examples.",
    starters: [
      'When do I use "the" and when do I use "a"?',
      "Check this sentence: She don't like coffee.",
      "Explain present perfect vs past simple, simply.",
    ],
    tags: ["Tenses", "Articles", "Clear rules"],
    goals: ["grammar"],
    level: "All levels",
    voice: "female",
    color: "#0d9488",
    enabled: true,
  },
  {
    id: "leo",
    name: "Leo",
    specialty: "Vocabulary and idioms",
    tagline: "New words, idioms and quick word games.",
    personality: "Playful and fun. Teaches words through games, stories and mini quizzes.",
    starters: [
      "Teach me 5 useful words for work.",
      "Give me an idiom for today, with a quick quiz.",
      'What\'s a better word than "very good"?',
    ],
    tags: ["New words", "Idioms", "Word games"],
    goals: ["vocabulary"],
    level: "Intermediate",
    voice: "male",
    color: "#d97706",
    enabled: true,
  },
  {
    id: "sophia",
    name: "Sophia",
    specialty: "IELTS and exams",
    tagline: "Timed exam practice with band-score estimates.",
    personality: "Structured and focused. Runs exam-style practice and gives band estimates.",
    starters: [
      "Let's practise IELTS Speaking Part 1.",
      "Give me a Part 2 cue card and time me.",
      "How can I move from band 6 to band 7?",
    ],
    tags: ["IELTS speaking", "Band scores", "Exam tips"],
    goals: ["exams"],
    level: "Advanced",
    voice: "female",
    color: "#7c3aed",
    enabled: true,
  },
  {
    id: "riya",
    name: "Riya",
    specialty: "Hinglish helper",
    tagline: "Explains in Hindi or Hinglish when you're stuck.",
    personality: "Super friendly and patient. Switches to Hindi or Hinglish to explain tricky points.",
    starters: [
      "Mujhe English bolne mein dar lagta hai, help karo.",
      '"I am having a car" sahi hai ya galat?',
      "Daily use ke 5 simple English sentences sikhao.",
    ],
    tags: ["Hindi support", "Basics", "Confidence"],
    goals: ["beginners", "speaking"],
    level: "Beginner",
    voice: "female",
    color: "#db2777",
    enabled: true,
  },
  {
    id: "james",
    name: "James",
    specialty: "Business writing",
    tagline: "Polish your emails, messages and reports.",
    personality: "Polished and practical. Improves tone, clarity and structure for work writing.",
    starters: [
      "Help me write a leave request email to my manager.",
      "Make this more professional: pls send the file asap",
      "How do I politely follow up on an unanswered email?",
    ],
    tags: ["Emails", "Tone", "Clarity"],
    goals: ["work"],
    level: "Advanced",
    voice: "male",
    color: "#0369a1",
    enabled: true,
  },
];

export function teacherTheme(color: string) {
  return {
    "--accent": `color-mix(in srgb, ${color} 82%, var(--ink))`,
    "--accent-soft": `color-mix(in srgb, ${color} 14%, var(--bg))`,
    "--accent-ink": "var(--bg)",
  } as CSSProperties;
}
