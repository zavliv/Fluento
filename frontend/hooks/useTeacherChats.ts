"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_URL, streamChat, toApiMessages } from "@/lib/api";
import { applyEvent, settleParts } from "@/lib/events";
import {
  loadActiveTeacher,
  loadMyTeachers,
  loadTeacherChats,
  saveActiveTeacher,
  saveMyTeachers,
  saveTeacherChats,
} from "@/lib/storage";
import { TEACHERS, type Teacher } from "@/lib/teachers";
import type { Feedback, Message, TeacherChats } from "@/lib/types";
import { uid } from "@/lib/utils";

function describeError(err: unknown) {
  if (err instanceof TypeError) return `Can't reach the backend at ${API_URL}. Make sure it's running.`;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

const NO_MESSAGES: Message[] = [];

export function useTeacherChats() {
  const teachers = useMemo(() => TEACHERS.filter((t) => t.enabled), []);
  const [chats, setChats] = useState<TeacherChats>(loadTeacherChats);
  const [myTeacherIds, setMyTeacherIds] = useState<string[]>(() => {
    const saved = loadMyTeachers();
    if (saved) return saved;
    const lastActivity = (id: string) => chats[id]?.at(-1)?.createdAt ?? 0;
    return Object.keys(chats)
      .filter((id) => chats[id].length > 0)
      .sort((a, b) => lastActivity(b) - lastActivity(a));
  });
  const [activeId, setActiveId] = useState<string | null>(() => {
    const saved = loadActiveTeacher();
    const valid = saved && myTeacherIds.includes(saved) && teachers.some((t) => t.id === saved);
    return valid ? saved : null;
  });
  const [streaming, setStreaming] = useState<{ teacherId: string; messageId: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => saveTeacherChats(chats), streaming ? 800 : 0);
    return () => clearTimeout(timer);
  }, [chats, streaming]);

  useEffect(() => saveActiveTeacher(activeId), [activeId]);
  useEffect(() => saveMyTeachers(myTeacherIds), [myTeacherIds]);

  const myTeachers = useMemo(
    () => myTeacherIds.map((id) => teachers.find((t) => t.id === id)).filter((t): t is Teacher => Boolean(t)),
    [myTeacherIds, teachers],
  );

  const select = useCallback((id: string | null) => {
    setActiveId(id);
    if (id) setMyTeacherIds((ids) => (ids.includes(id) ? ids : [id, ...ids]));
  }, []);

  const addTeacher = useCallback((id: string, index = 0) => {
    setMyTeacherIds((ids) => (ids.includes(id) ? ids : [...ids.slice(0, index), id, ...ids.slice(index)]));
  }, []);

  const removeTeacher = useCallback((id: string) => {
    setMyTeacherIds((ids) => ids.filter((x) => x !== id));
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const active = useMemo(() => teachers.find((t) => t.id === activeId) ?? null, [teachers, activeId]);

  const messagesFor = useCallback((teacher: Teacher) => chats[teacher.id] ?? NO_MESSAGES, [chats]);

  const messages = useMemo(() => (active ? messagesFor(active) : []), [active, messagesFor]);

  const runAssistant = useCallback(async (teacher: Teacher, history: Message[]) => {
    const assistant: Message = { id: uid(), role: "assistant", parts: [], status: "streaming", createdAt: Date.now() };
    setChats((c) => ({ ...c, [teacher.id]: [...history, assistant] }));

    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming({ teacherId: teacher.id, messageId: assistant.id });

    const patch = (fn: (m: Message) => Message) =>
      setChats((c) => ({
        ...c,
        [teacher.id]: (c[teacher.id] ?? []).map((m) => (m.id === assistant.id ? fn(m) : m)),
      }));

    try {
      await streamChat(
        toApiMessages(history),
        teacher.id,
        (event) => patch((m) => applyEvent(m, event)),
        controller.signal,
      );
      patch((m) => (m.status === "streaming" ? { ...m, status: "done", parts: settleParts(m.parts) } : m));
    } catch (err) {
      if (controller.signal.aborted) patch((m) => ({ ...m, status: "stopped", parts: settleParts(m.parts) }));
      else patch((m) => ({ ...m, status: "error", error: describeError(err), parts: settleParts(m.parts) }));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStreaming(null);
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!active || !content || streaming) return;
      const userMessage: Message = {
        id: uid(),
        role: "user",
        parts: [{ type: "text", text: content }],
        status: "done",
        createdAt: Date.now(),
      };
      setMyTeacherIds((ids) => [active.id, ...ids.filter((id) => id !== active.id)]);
      void runAssistant(active, [...messagesFor(active), userMessage]);
    },
    [active, streaming, messagesFor, runAssistant],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const regenerate = useCallback(() => {
    if (!active || streaming) return;
    const history = messagesFor(active);
    const index = history.findLastIndex((m) => m.role === "assistant");
    if (index === -1) return;
    void runAssistant(active, history.slice(0, index));
  }, [active, streaming, messagesFor, runAssistant]);

  const editMessage = useCallback(
    (messageId: string, text: string) => {
      const content = text.trim();
      if (!active || streaming || !content) return;
      const history = messagesFor(active);
      const index = history.findIndex((m) => m.id === messageId);
      if (index === -1) return;
      const edited: Message = { ...history[index], parts: [{ type: "text", text: content }] };
      void runAssistant(active, [...history.slice(0, index), edited]);
    },
    [active, streaming, messagesFor, runAssistant],
  );

  const setFeedback = useCallback(
    (messageId: string, feedback: Feedback | undefined) => {
      if (!active) return;
      setChats((c) => ({
        ...c,
        [active.id]: messagesFor(active).map((m) => (m.id === messageId ? { ...m, feedback } : m)),
      }));
    },
    [active, messagesFor],
  );

  const clear = useCallback(
    (teacherId: string) => {
      if (streaming?.teacherId === teacherId) abortRef.current?.abort();
      setChats((c) => {
        const next = { ...c };
        delete next[teacherId];
        return next;
      });
    },
    [streaming],
  );

  const restore = useCallback((teacherId: string, messages: Message[]) => {
    setChats((c) => ({ ...c, [teacherId]: messages }));
  }, []);

  const lastMessage = useCallback(
    (teacherId: string) => {
      const list = chats[teacherId];
      return list && list.length > 0 ? list[list.length - 1] : null;
    },
    [chats],
  );

  return {
    teachers,
    active,
    messages,
    myTeachers,
    myTeacherIds,
    select,
    addTeacher,
    removeTeacher,
    streamingTeacherId: streaming?.teacherId ?? null,
    isStreaming: streaming !== null,
    send,
    stop,
    regenerate,
    editMessage,
    setFeedback,
    clear,
    restore,
    lastMessage,
  };
}
