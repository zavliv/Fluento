import type { Message } from "./types";
import { messageText } from "./utils";

export function exportConversation(teacherName: string, messages: Message[]) {
  const lines = [`# Conversation with ${teacherName}`, ""];
  for (const message of messages) {
    const text = messageText(message).trim();
    if (text) lines.push(`### ${message.role === "user" ? "You" : teacherName}`, "", text, "");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fluento-${teacherName.toLowerCase()}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

export function toSpeakableText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " Code block omitted. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
