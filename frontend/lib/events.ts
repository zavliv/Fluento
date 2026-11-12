import type { Message, MessagePart, StreamEvent } from "./types";

export function settleParts(parts: MessagePart[]): MessagePart[] {
  return parts.map((p) =>
    p.type === "tool" && p.status === "running"
      ? { ...p, status: "error", output: p.output ?? "Cancelled", endedAt: Date.now() }
      : p,
  );
}

export function applyEvent(message: Message, event: StreamEvent): Message {
  switch (event.type) {
    case "text": {
      const parts = [...message.parts];
      const last = parts[parts.length - 1];
      if (last?.type === "text") parts[parts.length - 1] = { ...last, text: last.text + event.text };
      else parts.push({ type: "text", text: event.text });
      return { ...message, parts };
    }
    case "tool_call":
      return {
        ...message,
        parts: [
          ...message.parts,
          {
            type: "tool",
            id: event.id,
            name: event.name,
            input: event.input,
            status: "running",
            startedAt: Date.now(),
          },
        ],
      };
    case "tool_result":
      return {
        ...message,
        parts: message.parts.map((p) =>
          p.type === "tool" && p.id === event.id
            ? { ...p, output: event.output, status: event.is_error ? "error" : "done", endedAt: Date.now() }
            : p,
        ),
      };
    case "error":
      return { ...message, status: "error", error: event.message, parts: settleParts(message.parts) };
    case "done":
      return { ...message, status: "done", parts: settleParts(message.parts) };
    case "read":
    case "queued":
      return message;
  }
}
