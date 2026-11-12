"use client";

import { Keyboard, LayoutGrid, Monitor, Moon, PanelLeft, Sun } from "lucide-react";
import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { useTeachers } from "@/hooks/useTeachers";
import { useTeacherChats } from "@/hooks/useTeacherChats";
import { useTheme } from "@/hooks/useTheme";
import { exportConversation } from "@/lib/export";
import { teacherTheme } from "@/lib/teachers";
import { shortcut } from "@/lib/utils";
import { ChatHeader } from "./ChatHeader";
import { CommandPalette, type Command } from "./CommandPalette";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { Sidebar } from "./Sidebar";
import { TeacherAvatar } from "./TeacherAvatar";
import { LandingPage } from "./landing/LandingPage";
import { useSiteSettings } from "./SiteSettings";
import { TeacherDirectory } from "./TeacherDirectory";
import { useAuth } from "./auth/AuthProvider";
import { useToast } from "./ui/Toast";

const isMobile = () => window.innerWidth < 768;

export default function ChatApp() {
  const { user, loading: authLoading, logout } = useAuth();
  const { teachers, loading: teachersLoading } = useTeachers();
  const chat = useTeacherChats(teachers, Boolean(user));
  const router = useRouter();
  const params = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { online, model } = useBackendStatus();
  const toast = useToast();
  const { signup_enabled: signupEnabled } = useSiteSettings();
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { active, messages, select, stop, isStreaming, clear, restore } = chat;
  const { myTeacherIds, addTeacher, removeTeacher } = chat;

  const openTeacher = useCallback(
    (id: string | null) => {
      if (!user) {
        const page = signupEnabled ? "/signup" : "/login";
        router.push(id ? `${page}?teacher=${encodeURIComponent(id)}` : page);
        return;
      }
      select(id);
      if (isMobile()) setSidebarOpen(false);
    },
    [signupEnabled, user, router, select],
  );

  const pendingTeacher = params.get("teacher");
  const handledPending = useRef(false);
  useEffect(() => {
    if (!pendingTeacher || handledPending.current || !user || !chat.ready || teachers.length === 0) return;
    handledPending.current = true;
    if (teachers.some((t) => t.id === pendingTeacher)) select(pendingTeacher);
    router.replace("/");
  }, [pendingTeacher, user, chat.ready, teachers, select, router]);

  const signOut = useCallback(async () => {
    await logout();
    toast({ message: "You're logged out" });
  }, [logout, toast]);

  const clearConversation = useCallback(() => {
    if (!active) return;
    const previous = messages;
    clear(active.id);
    toast({
      message: `Conversation with ${active.name} cleared`,
      action: { label: "Undo", onClick: () => restore(active.id, previous) },
    });
  }, [active, messages, clear, restore, toast]);

  const removeFromMyTeachers = useCallback(
    (id: string) => {
      const teacher = teachers.find((t) => t.id === id);
      const index = myTeacherIds.indexOf(id);
      removeTeacher(id);
      if (teacher) {
        toast({
          message: `${teacher.name} removed from your teachers`,
          action: { label: "Undo", onClick: () => addTeacher(id, index) },
        });
      }
    },
    [teachers, myTeacherIds, removeTeacher, addTeacher, toast],
  );

  const exportCurrent = useCallback(() => {
    if (!active) return;
    exportConversation(active.name, messages);
    toast({ message: "Conversation exported as Markdown" });
  }, [active, messages, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (mod && key === "/") {
        e.preventDefault();
        setShortcutsOpen((o) => !o);
      } else if (mod && key === "b") {
        e.preventDefault();
        setSidebarOpen((o) => !o);
      } else if (e.key === "Escape" && isStreaming) {
        stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stop, isStreaming]);

  const commands = useMemo<Command[]>(() => {
    const actions: Command[] = [
      { id: "all", label: "All teachers", group: "Actions", icon: <LayoutGrid />, run: () => openTeacher(null) },
      {
        id: "sidebar",
        label: "Toggle sidebar",
        group: "Actions",
        icon: <PanelLeft />,
        hint: shortcut("B"),
        run: () => setSidebarOpen((o) => !o),
      },
      { id: "light", label: "Switch to light theme", group: "Actions", icon: <Sun />, run: () => setTheme("light") },
      { id: "dark", label: "Switch to dark theme", group: "Actions", icon: <Moon />, run: () => setTheme("dark") },
      { id: "system", label: "Use system theme", group: "Actions", icon: <Monitor />, run: () => setTheme("system") },
      {
        id: "shortcuts",
        label: "Keyboard shortcuts",
        group: "Actions",
        icon: <Keyboard />,
        hint: shortcut("/"),
        run: () => setShortcutsOpen(true),
      },
    ];
    const teacherCommands: Command[] = teachers.map((t) => ({
      id: `teacher-${t.id}`,
      label: `${t.name} · ${t.specialty}`,
      group: "Teachers",
      icon: <TeacherAvatar name={t.name} color={t.color} size={18} />,
      run: () => openTeacher(t.id),
    }));
    return [...teacherCommands, ...actions];
  }, [teachers, openTeacher, setTheme]);

  if (authLoading || teachersLoading || (user && !chat.ready)) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg text-subtle">
        <LoaderCircle className="size-5 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!user || (chat.myTeachers.length === 0 && !active)) {
    return (
      <>
        <LandingPage
          teachers={teachers}
          user={user}
          onSelect={openTeacher}
          onLogout={signOut}
          theme={theme}
          onThemeChange={setTheme}
        />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
        <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-ink">
      <Sidebar
        open={sidebarOpen}
        onOpen={() => setSidebarOpen(true)}
        onClose={() => setSidebarOpen(false)}
        teachers={chat.myTeachers}
        activeId={active?.id ?? null}
        onRemove={removeFromMyTeachers}
        streamingTeacherId={chat.streamingTeacherId}
        lastMessage={chat.lastMessage}
        onSelect={openTeacher}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        theme={theme}
        onThemeChange={setTheme}
        online={online}
        user={user}
        onLogout={signOut}
      />

      <main className="flex min-w-0 flex-1 flex-col" style={active ? teacherTheme(active.color) : undefined}>
        <ChatHeader
          teacher={active}
          online={online}
          typing={chat.streamingTeacherId !== null && chat.streamingTeacherId === active?.id}
          sidebarOpen={sidebarOpen}
          model={model}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onShowTeachers={() => openTeacher(null)}
          onExport={exportCurrent}
          onClear={clearConversation}
        />

        {active ? (
          <>
            <MessageList
              key={active.id}
              teacher={active}
              online={online}
              loading={chat.loadingConversation}
              messages={messages}
              onSend={chat.send}
              isStreaming={isStreaming}
              onRegenerate={chat.regenerate}
              onEdit={chat.editMessage}
              onFeedback={chat.setFeedback}
            />
            <div className="mx-auto w-full max-w-4xl px-4 pb-3 md:px-6">
              <Composer
                key={active.id}
                onSend={chat.send}
                onStop={stop}
                isStreaming={isStreaming}
                autoFocus
                placeholder={`Message ${active.name}…`}
              />
            </div>
          </>
        ) : (
          <TeacherDirectory teachers={teachers} myTeacherIds={myTeacherIds} onSelect={openTeacher} />
        )}
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
