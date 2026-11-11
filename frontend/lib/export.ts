import type { Conversation } from "./types";
import { messageText } from "./utils";

export function conversationToMarkdown(conversation: Conversation) {
  const lines = [`# ${conversation.title}`, ""];
  for (const message of conversation.messages) {
    const text = messageText(message).trim();
    if (!text) continue;
    lines.push(`### ${message.role === "user" ? "You" : "Orbit AI"}`, "", text, "");
  }
  return lines.join("\n");
}

export function exportConversation(conversation: Conversation) {
  const slug =
    conversation.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "chat";
  const blob = new Blob([conversationToMarkdown(conversation)], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug}.md`;
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
