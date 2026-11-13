"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, fromStoredMessage, streamChat, toStoredMessage } from "@/lib/api";
import { applyEvent, settleParts } from "@/lib/events";
import type { Teacher } from "@/lib/teachers";
import type { Feedback, Message, TeacherChats } from "@/lib/types";
import { messageText, uid } from "@/lib/utils";

const ACTIVE_KEY = "fluento:active-teacher";
const NO_MESSAGES: Message[] = [];

function readActive() {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function writeActive(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}

function toHistory(messages: Message[]) {
  return messages.filter((m) => messageText(m).trim()).map(toStoredMessage);
}

const POLL_MS = 4000;

export type AssistantResult = { text: string; error: string | null; queued: boolean };

export function useTeacherChats(teachers: Teacher[], signedIn: boolean, onQueuedReply?: () => void) {
  const [chats, setChats] = useState<TeacherChats>({});
  const [summaries, setSummaries] = useState<Record<string, Message>>({});
  const [myTeacherIds, setMyTeacherIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [streaming, setStreaming] = useState<{ teacherId: string; messageId: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const chatsRef = useRef(chats);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  const loadConversation = useCallback((teacherId: string) => {
    api
      .conversation(teacherId)
      .then((messages) => setChats((c) => (c[teacherId] ? c : { ...c, [teacherId]: messages.map(fromStoredMessage) })))
      .catch(() => setChats((c) => (c[teacherId] ? c : { ...c, [teacherId]: [] })));
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    Promise.all([api.myTeachers(), api.myConversations()])
      .then(([ids, convos]) => {
        if (!alive) return;
        setMyTeacherIds(ids);
        setSummaries(
          Object.fromEntries(
            convos.filter((c) => c.last_message).map((c) => [c.teacher_id, fromStoredMessage(c.last_message!)]),
          ),
        );
        const saved = readActive();
        const next = saved && ids.includes(saved) ? saved : null;
        setActiveId(next);
        if (next) loadConversation(next);
      })
      .catch(() => alive && setMyTeacherIds([]))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
      abortRef.current?.abort();
      setChats({});
      setSummaries({});
      setMyTeacherIds([]);
      setActiveId(null);
      setReady(false);
    };
  }, [signedIn, loadConversation]);

  useEffect(() => {
    if (ready) writeActive(activeId);
  }, [activeId, ready]);

  const saveMyTeachers = useCallback((update: (ids: string[]) => string[]) => {
    setMyTeacherIds((ids) => {
      const next = update(ids);
      if (next.join() !== ids.join()) void api.setMyTeachers(next).catch(() => {});
      return next;
    });
  }, []);

  const myTeachers = useMemo(
    () => myTeacherIds.map((id) => teachers.find((t) => t.id === id)).filter((t): t is Teacher => Boolean(t)),
    [myTeacherIds, teachers],
  );

  const active = useMemo(() => teachers.find((t) => t.id === activeId) ?? null, [teachers, activeId]);
  const messages = useMemo(() => (active ? (chats[active.id] ?? NO_MESSAGES) : NO_MESSAGES), [active, chats]);
  const loadingConversation = Boolean(active && chats[active.id] === undefined);

  const select = useCallback(
    (id: string | null) => {
      setActiveId(id);
      if (!id) return;
      saveMyTeachers((ids) => (ids.includes(id) ? ids : [id, ...ids]));
      if (chats[id] === undefined) loadConversation(id);
    },
    [chats, loadConversation, saveMyTeachers],
  );

  const addTeacher = useCallback(
    (id: string, index = 0) =>
      saveMyTeachers((ids) => (ids.includes(id) ? ids : [...ids.slice(0, index), id, ...ids.slice(index)])),
    [saveMyTeachers],
  );

  const removeTeacher = useCallback(
    (id: string) => {
      saveMyTeachers((ids) => ids.filter((x) => x !== id));
      setActiveId((current) => (current === id ? null : current));
    },
    [saveMyTeachers],
  );

  const runAssistant = useCallback(
    async (
      teacher: Teacher,
      history: Message[],
      mode: "text" | "voice" = "text",
      onText?: (delta: string) => void,
    ): Promise<AssistantResult> => {
      const assistant: Message = {
        id: uid(),
        role: "assistant",
        parts: [],
        status: "streaming",
        createdAt: Date.now(),
      };
      setChats((c) => ({ ...c, [teacher.id]: [...history, assistant] }));
      setMyTeacherIds((ids) => [teacher.id, ...ids.filter((id) => id !== teacher.id)]);

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming({ teacherId: teacher.id, messageId: assistant.id });

      const patch = (fn: (m: Message) => Message) =>
        setChats((c) => ({
          ...c,
          [teacher.id]: (c[teacher.id] ?? []).map((m) => (m.id === assistant.id ? fn(m) : m)),
        }));

      let text = "";
      let queued = false;
      try {
        await streamChat(
          teacher.id,
          toHistory(history),
          assistant.id,
          (event) => {
            if (event.type === "text") {
              text += event.text;
              onText?.(event.text);
            }
            if (event.type === "queued") queued = true;
            if (event.type === "read") {
              setChats((c) => ({
                ...c,
                [teacher.id]: (c[teacher.id] ?? []).map((m) => (m.role === "user" ? { ...m, receipt: "read" } : m)),
              }));
            } else if (event.type === "queued") {
              setChats((c) => ({ ...c, [teacher.id]: (c[teacher.id] ?? []).filter((m) => m.id !== assistant.id) }));
            } else {
              patch((m) => applyEvent(m, event));
            }
          },
          controller.signal,
          mode,
        );
        patch((m) => (m.status === "streaming" ? { ...m, status: "done", parts: settleParts(m.parts) } : m));
        return { text: text.trim(), error: null, queued };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        if (controller.signal.aborted) patch((m) => ({ ...m, status: "stopped", parts: settleParts(m.parts) }));
        else patch((m) => ({ ...m, status: "error", error: message, parts: settleParts(m.parts) }));
        return { text: text.trim(), error: controller.signal.aborted ? null : message, queued };
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setStreaming(null);
      }
    },
    [],
  );

  const ask = useCallback(
    async (teacherId: string, text: string, onText?: (delta: string) => void): Promise<AssistantResult> => {
      const teacher = teachers.find((t) => t.id === teacherId);
      const content = text.trim();
      if (!teacher || !content) return { text: "", error: "That teacher isn't available.", queued: false };
      let history = chatsRef.current[teacherId];
      if (history === undefined) {
        history = await api
          .conversation(teacherId)
          .then((stored) => stored.map(fromStoredMessage))
          .catch(() => []);
      }
      saveMyTeachers((ids) => (ids.includes(teacherId) ? ids : [teacherId, ...ids]));
      const userMessage: Message = {
        id: uid(),
        role: "user",
        parts: [{ type: "text", text: content }],
        status: "done",
        receipt: "sent",
        createdAt: Date.now(),
      };
      return runAssistant(teacher, [...history, userMessage], "voice", onText);
    },
    [teachers, saveMyTeachers, runAssistant],
  );

  const waiting = Boolean(active && !streaming && messages.length > 0 && messages[messages.length - 1].role === "user");
  useEffect(() => {
    if (!active || !waiting) return;
    const teacherId = active.id;
    const timer = window.setInterval(() => {
      api
        .conversation(teacherId)
        .then((stored) => {
          const last = stored[stored.length - 1];
          if (last?.role !== "assistant") return;
          setChats((c) => ({ ...c, [teacherId]: stored.map(fromStoredMessage) }));
          onQueuedReply?.();
        })
        .catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [active, waiting, onQueuedReply]);

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!active || !content || streaming || loadingConversation) return;
      const userMessage: Message = {
        id: uid(),
        role: "user",
        parts: [{ type: "text", text: content }],
        status: "done",
        receipt: "sent",
        createdAt: Date.now(),
      };
      void runAssistant(active, [...messages, userMessage]);
    },
    [active, streaming, loadingConversation, messages, runAssistant],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const regenerate = useCallback(() => {
    if (!active || streaming) return;
    const index = messages.findLastIndex((m) => m.role === "assistant");
    if (index === -1) return;
    void runAssistant(active, messages.slice(0, index));
  }, [active, streaming, messages, runAssistant]);

  const editMessage = useCallback(
    (messageId: string, text: string) => {
      const content = text.trim();
      if (!active || streaming || !content) return;
      const index = messages.findIndex((m) => m.id === messageId);
      if (index === -1) return;
      const edited: Message = { ...messages[index], parts: [{ type: "text", text: content }] };
      void runAssistant(active, [...messages.slice(0, index), edited]);
    },
    [active, streaming, messages, runAssistant],
  );

  const setFeedback = useCallback(
    (messageId: string, feedback: Feedback | undefined) => {
      if (!active) return;
      const next = messages.map((m) => (m.id === messageId ? { ...m, feedback } : m));
      setChats((c) => ({ ...c, [active.id]: next }));
      void api.saveConversation(active.id, toHistory(next)).catch(() => {});
    },
    [active, messages],
  );

  const clear = useCallback(
    (teacherId: string) => {
      if (streaming?.teacherId === teacherId) abortRef.current?.abort();
      setChats((c) => ({ ...c, [teacherId]: [] }));
      setSummaries((s) => {
        const next = { ...s };
        delete next[teacherId];
        return next;
      });
      void api.deleteConversation(teacherId).catch(() => {});
    },
    [streaming],
  );

  const restore = useCallback((teacherId: string, restored: Message[]) => {
    setChats((c) => ({ ...c, [teacherId]: restored }));
    void api.saveConversation(teacherId, toHistory(restored)).catch(() => {});
  }, []);

  const lastMessage = useCallback(
    (teacherId: string) => {
      const list = chats[teacherId];
      if (list) return list.length > 0 ? list[list.length - 1] : null;
      return summaries[teacherId] ?? null;
    },
    [chats, summaries],
  );

  return {
    ready,
    active,
    messages,
    loadingConversation,
    myTeachers,
    myTeacherIds,
    select,
    addTeacher,
    removeTeacher,
    streamingTeacherId: streaming?.teacherId ?? null,
    isStreaming: streaming !== null,
    send,
    ask,
    stop,
    regenerate,
    editMessage,
    setFeedback,
    clear,
    restore,
    lastMessage,
  };
}
