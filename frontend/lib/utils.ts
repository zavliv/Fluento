import { isValidElement, type ReactNode } from "react";
import type { Conversation, Message, TextPart } from "./types";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function makeTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 48).trimEnd()}…` : clean;
}

export function messageText(message: Message) {
  return message.parts
    .filter((p): p is TextPart => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return extractText(node.props.children);
  return "";
}

export function modKey() {
  if (typeof navigator === "undefined") return "Ctrl";
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Up late?";
  if (hour < 12) return "Good morning.";
  if (hour < 18) return "Good afternoon.";
  return "Good evening.";
}

const DAY = 24 * 60 * 60 * 1000;

export function groupConversations(conversations: Conversation[]) {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const buckets: { label: string; test: (t: number) => boolean }[] = [
    { label: "Today", test: (t) => t >= startOfToday },
    { label: "Yesterday", test: (t) => t >= startOfToday - DAY },
    { label: "Previous 7 days", test: (t) => t >= startOfToday - 7 * DAY },
    { label: "Previous 30 days", test: (t) => t >= startOfToday - 30 * DAY },
    { label: "Older", test: () => true },
  ];
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const groups = buckets.map((b) => ({ label: b.label, items: [] as Conversation[] }));
  for (const c of sorted) {
    const i = buckets.findIndex((b) => b.test(c.updatedAt));
    groups[i].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}
