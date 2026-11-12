export type TeacherLevel = "Beginner" | "Intermediate" | "Advanced" | "All levels";
export type TeacherVoice = "female" | "male";

export type Teacher = {
  id: string;
  name: string;
  specialty: string;
  tagline: string;
  personality: string;
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
    level: "Advanced",
    voice: "male",
    color: "#0369a1",
    enabled: true,
  },
];
