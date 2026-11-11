export type Role = "user" | "assistant";

export type TextPart = { type: "text"; text: string };

export type ToolStatus = "running" | "done" | "error";

export type ToolPart = {
  type: "tool";
  id: string;
  name: string;
  input: unknown;
  output?: string;
  status: ToolStatus;
  startedAt: number;
  endedAt?: number;
};

export type MessagePart = TextPart | ToolPart;

export type MessageStatus = "streaming" | "done" | "error" | "stopped";

export type Message = {
  id: string;
  role: Role;
  parts: MessagePart[];
  status: MessageStatus;
  error?: string;
  createdAt: number;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | { type: "tool_result"; id: string; output: string; is_error?: boolean }
  | { type: "error"; message: string }
  | { type: "done" };
