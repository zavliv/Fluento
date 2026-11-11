"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_URL, streamChat, toApiMessages } from "@/lib/api";
import { applyEvent, settleParts } from "@/lib/events";
import { loadConversations, saveConversations } from "@/lib/storage";
import type { Conversation, Message } from "@/lib/types";
import { makeTitle, uid } from "@/lib/utils";

function describeError(err: unknown) {
  if (err instanceof TypeError) return `Can't reach the backend at ${API_URL}. Make sure it's running.`;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => saveConversations(conversations), streamingId ? 800 : 0);
    return () => clearTimeout(timer);
  }, [conversations, streamingId]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const runAssistant = useCallback(async (conversationId: string, history: Message[]) => {
    const assistant: Message = {
      id: uid(),
      role: "assistant",
      parts: [],
      status: "streaming",
      createdAt: Date.now(),
    };

    setConversations((cs) =>
      cs.map((c) =>
        c.id === conversationId ? { ...c, messages: [...history, assistant], updatedAt: Date.now() } : c,
      ),
    );

    const controller = new AbortController();
    abortRef.current = controller;
    setStreamingId(assistant.id);

    const patch = (fn: (m: Message) => Message) =>
      setConversations((cs) =>
        cs.map((c) =>
          c.id !== conversationId
            ? c
            : { ...c, messages: c.messages.map((m) => (m.id === assistant.id ? fn(m) : m)) },
        ),
      );

    try {
      await streamChat(
        { conversation_id: conversationId, messages: toApiMessages(history) },
        (event) => patch((m) => applyEvent(m, event)),
        controller.signal,
      );
      patch((m) => (m.status === "streaming" ? { ...m, status: "done", parts: settleParts(m.parts) } : m));
    } catch (err) {
      if (controller.signal.aborted) {
        patch((m) => ({ ...m, status: "stopped", parts: settleParts(m.parts) }));
      } else {
        patch((m) => ({ ...m, status: "error", error: describeError(err), parts: settleParts(m.parts) }));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStreamingId(null);
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || streamingId) return;

      const userMessage: Message = {
        id: uid(),
        role: "user",
        parts: [{ type: "text", text: content }],
        status: "done",
        createdAt: Date.now(),
      };

      if (active) {
        void runAssistant(active.id, [...active.messages, userMessage]);
        return;
      }

      const now = Date.now();
      const conversation: Conversation = {
        id: uid(),
        title: makeTitle(content),
        messages: [userMessage],
        createdAt: now,
        updatedAt: now,
      };
      setConversations((cs) => [conversation, ...cs]);
      setActiveId(conversation.id);
      void runAssistant(conversation.id, conversation.messages);
    },
    [active, streamingId, runAssistant],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const regenerate = useCallback(() => {
    if (!active || streamingId) return;
    const index = active.messages.findLastIndex((m) => m.role === "assistant");
    if (index === -1) return;
    void runAssistant(active.id, active.messages.slice(0, index));
  }, [active, streamingId, runAssistant]);

  const editMessage = useCallback(
    (messageId: string, text: string) => {
      const content = text.trim();
      if (!active || streamingId || !content) return;
      const index = active.messages.findIndex((m) => m.id === messageId);
      if (index === -1) return;
      const edited: Message = { ...active.messages[index], parts: [{ type: "text", text: content }] };
      void runAssistant(active.id, [...active.messages.slice(0, index), edited]);
    },
    [active, streamingId, runAssistant],
  );

  const newChat = useCallback(() => setActiveId(null), []);

  const select = useCallback((id: string) => setActiveId(id), []);

  const remove = useCallback(
    (id: string) => {
      if (id === activeId) {
        abortRef.current?.abort();
        setActiveId(null);
      }
      setConversations((cs) => cs.filter((c) => c.id !== id));
    },
    [activeId],
  );

  const rename = useCallback((id: string, title: string) => {
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  return {
    conversations,
    active,
    activeId,
    streamingId,
    isStreaming: streamingId !== null,
    send,
    stop,
    regenerate,
    editMessage,
    newChat,
    select,
    remove,
    rename,
  };
}
