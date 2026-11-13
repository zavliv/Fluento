"use client";

import {
  AudioLines,
  ClipboardCheck,
  Flame,
  Keyboard,
  LayoutGrid,
  Monitor,
  Moon,
  PanelLeft,
  SpellCheck,
  Sun,
  Zap,
} from "lucide-react";
import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { useMistakeSummary } from "@/hooks/useMistakeSummary";
import { useProgress } from "@/hooks/useProgress";
import { useTeachers } from "@/hooks/useTeachers";
import { useTeacherChats } from "@/hooks/useTeacherChats";
import { useTheme } from "@/hooks/useTheme";
import { exportConversation } from "@/lib/export";
import { pickGuide, teacherTheme } from "@/lib/teachers";
import { shortcut } from "@/lib/utils";
import { ChatHeader } from "./ChatHeader";
import { CommandPalette, type Command } from "./CommandPalette";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { LevelTestPage } from "./level/LevelTestPage";
import { ChallengeFlow } from "./practice/ChallengeFlow";
import { ProgressPage } from "./practice/ProgressPage";
import { MistakesPage } from "./mistakes/MistakesPage";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { Sidebar } from "./Sidebar";
import { TeacherAvatar } from "./TeacherAvatar";
import { LandingPage } from "./landing/LandingPage";
import { useSiteSettings } from "./SiteSettings";
import { Home, homeHeading } from "./home/Home";
import { VoicePage } from "./voice/VoicePage";
import { useAuth } from "./auth/AuthProvider";
import { useToast } from "./ui/Toast";

const isMobile = () => window.innerWidth < 768;

export default function ChatApp() {
  const { user, loading: authLoading, logout, refresh: refreshUser } = useAuth();
  const { teachers, loading: teachersLoading, reload: reloadTeachers } = useTeachers();
  const chat = useTeacherChats(teachers, Boolean(user), reloadTeachers);
  const router = useRouter();
  const params = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { online, model } = useBackendStatus();
  const toast = useToast();
  const { signup_enabled: signupEnabled, default_teacher_id: defaultTeacherId } = useSiteSettings();
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { active, messages, select, stop, isStreaming, clear, restore } = chat;
  const { myTeacherIds, addTeacher, removeTeacher } = chat;
  const [view, setView] = useState<"chat" | "mistakes" | "progress" | "level" | "challenge" | "voice">("chat");
  const returnTo = useRef<"chat" | "progress">("chat");
  const { progress, refresh: refreshProgress } = useProgress(Boolean(user));
  const practice = useRef<{ teacherId: string; text: string } | null>(null);
  const mistakes = useMistakeSummary(Boolean(user), isStreaming);

  const openTeacher = useCallback(
    (id: string | null) => {
      if (!user) {
        const page = signupEnabled ? "/signup" : "/login";
        router.push(id ? `${page}?teacher=${encodeURIComponent(id)}` : page);
        return;
      }
      setView("chat");
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

  const openMistakes = useCallback(() => {
    setView("mistakes");
    select(null);
    mistakes.refresh();
    if (isMobile()) setSidebarOpen(false);
  }, [select, mistakes]);

  const openFocus = useCallback(
    (next: "level" | "challenge") => {
      setView((current) => {
        if (current === "progress" || current === "chat") returnTo.current = current;
        return next;
      });
      select(null);
      if (isMobile()) setSidebarOpen(false);
    },
    [select],
  );
  const openLevelTest = useCallback(() => openFocus("level"), [openFocus]);
  const openChallenge = useCallback(() => openFocus("challenge"), [openFocus]);
  const closeFocus = useCallback(() => {
    setView(returnTo.current);
    refreshProgress();
  }, [refreshProgress]);

  const openPractice = useCallback(() => {
    setView("progress");
    select(null);
    if (isMobile()) setSidebarOpen(false);
  }, [select]);

  const openVoice = useCallback(() => {
    setView("voice");
    select(null);
    if (isMobile()) setSidebarOpen(false);
  }, [select]);

  const pendingView = params.get("view");
  const handledView = useRef(false);
  useEffect(() => {
    if (!pendingView || handledView.current || !user || !chat.ready) return;
    handledView.current = true;
    const open = { level: openLevelTest, challenge: openChallenge, practice: openPractice }[pendingView];
    if (open) queueMicrotask(open);
    router.replace("/");
  }, [pendingView, user, chat.ready, openLevelTest, openChallenge, openPractice, router]);

  const practiseWith = useCallback(
    (teacherId: string, text: string) => {
      if (!teachers.some((t) => t.id === teacherId)) return;
      practice.current = { teacherId, text };
      openTeacher(teacherId);
    },
    [teachers, openTeacher],
  );

  const practise = useCallback(
    (m: { rule: string; original: string; correction: string; teacher_id?: string }) => {
      const teacher = teachers.find((t) => t.id === m.teacher_id) ?? pickGuide(teachers, defaultTeacherId);
      if (!teacher) return;
      practice.current = {
        teacherId: teacher.id,
        text: `Can you give me a quick exercise to practise this: ${m.rule}? I wrote "${m.original}" instead of "${m.correction}".`,
      };
      openTeacher(teacher.id);
    },
    [teachers, defaultTeacherId, openTeacher],
  );

  const { send, loadingConversation } = chat;
  useEffect(() => {
    const pending = practice.current;
    if (!pending || active?.id !== pending.teacherId || loadingConversation || isStreaming) return;
    practice.current = null;
    send(pending.text);
  }, [active, loadingConversation, isStreaming, send]);

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
      { id: "mistakes", label: "My mistakes", group: "Actions", icon: <SpellCheck />, run: openMistakes },
      { id: "challenge", label: "Today's challenge", group: "Actions", icon: <Zap />, run: openChallenge },
      { id: "practice", label: "Practice and progress", group: "Actions", icon: <Flame />, run: openPractice },
      { id: "voice", label: "Voice conversation", group: "Actions", icon: <AudioLines />, run: openVoice },
      { id: "level", label: "Level check", group: "Actions", icon: <ClipboardCheck />, run: openLevelTest },
    ];
    const teacherCommands: Command[] = teachers.map((t) => ({
      id: `teacher-${t.id}`,
      label: `${t.name} · ${t.specialty}`,
      group: "Teachers",
      icon: <TeacherAvatar name={t.name} color={t.color} size={18} />,
      run: () => openTeacher(t.id),
    }));
    return [...teacherCommands, ...actions];
  }, [teachers, openTeacher, openMistakes, openLevelTest, openChallenge, openPractice, openVoice, setTheme]);

  if (authLoading || teachersLoading || (user && !chat.ready)) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg text-subtle">
        <LoaderCircle className="size-5 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
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

  if (view === "challenge") {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-bg text-ink">
        <ChallengeFlow onClose={closeFocus} onFinished={refreshProgress} onLevelCheck={openLevelTest} />
      </div>
    );
  }

  if (view === "level") {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-bg text-ink">
        <LevelTestPage
          teachers={teachers}
          onOpenTeacher={openTeacher}
          onPractise={practiseWith}
          onCompleted={() => {
            void refreshUser();
            refreshProgress();
          }}
          onClose={closeFocus}
        />
      </div>
    );
  }

  const home = homeHeading(user.name, progress, myTeacherIds.length > 0);

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
        mistakesOpen={view === "mistakes"}
        mistakeCount={mistakes.summary?.open ?? null}
        onOpenMistakes={openMistakes}
        practiceOpen={view === "progress"}
        onOpenPractice={openPractice}
        voiceOpen={view === "voice" && !active}
        onOpenVoice={openVoice}
        streak={progress?.placed ? progress.streak.current : null}
        practiceDone={Boolean(progress?.streak.done_today)}
        theme={theme}
        onThemeChange={setTheme}
        online={online}
        user={user}
        onLogout={signOut}
      />

      <main className="flex min-w-0 flex-1 flex-col" style={active ? teacherTheme(active.color) : undefined}>
        <ChatHeader
          teacher={active}
          online={online === null || !active ? online : online && active.online}
          typing={chat.streamingTeacherId !== null && chat.streamingTeacherId === active?.id}
          sidebarOpen={sidebarOpen}
          model={model}
          title={
            view === "mistakes"
              ? "My mistakes"
              : view === "progress"
                ? "Practice"
                : view === "voice"
                  ? "Voice"
                  : home.title
          }
          subtitle={
            view === "mistakes"
              ? "Mistakes from your chats, collected automatically. Practise them and mark them as learned."
              : view === "progress"
                ? "A 2-minute challenge a day keeps your streak alive and your level growing."
                : view === "voice"
                  ? "Talk out loud with a teacher. Hands-free, in one natural voice."
                  : home.subtitle
          }
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onShowTeachers={() => openTeacher(null)}
          onExport={exportCurrent}
          onClear={clearConversation}
        />

        {view === "progress" && !active ? (
          <ProgressPage
            progress={progress}
            onStart={openChallenge}
            onLevelCheck={openLevelTest}
            onRefresh={refreshProgress}
          />
        ) : view === "voice" && !active ? (
          <VoicePage
            teachers={teachers}
            defaultTeacherId={defaultTeacherId}
            userName={user.name}
            onAsk={chat.ask}
            onOpenChat={openTeacher}
          />
        ) : view === "mistakes" && !active ? (
          <MistakesPage
            teachers={teachers}
            summary={mistakes.summary}
            onChanged={mistakes.refresh}
            onPractise={practise}
          />
        ) : active ? (
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
              {!active.online && (
                <p className="mb-2 flex items-center justify-center gap-2 text-center text-xs text-muted">
                  <span className="size-1.5 rounded-full bg-subtle" aria-hidden />
                  {active.name} is offline. Your messages will be delivered, and {active.name} will reply when back
                  online.
                </p>
              )}
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
          <Home
            teachers={teachers}
            myTeacherIds={myTeacherIds}
            progress={progress}
            tested={user.level ?? null}
            onSelect={openTeacher}
            onStartChallenge={openChallenge}
            onLevelCheck={openLevelTest}
            onOpenProgress={openPractice}
          />
        )}
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
