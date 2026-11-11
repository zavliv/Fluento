"use client";

import { Keyboard, Monitor, MessageSquare, Moon, PanelLeft, Pin, SquarePen, Sun } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { useChat } from "@/hooks/useChat";
import { useTheme } from "@/hooks/useTheme";
import { exportConversation } from "@/lib/export";
import { shortcut } from "@/lib/utils";
import { ChatHeader } from "./ChatHeader";
import { CommandPalette, type Command } from "./CommandPalette";
import { Composer } from "./Composer";
import { EmptyState } from "./EmptyState";
import { MessageList } from "./MessageList";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { Sidebar } from "./Sidebar";
import { useToast } from "./ui/Toast";

const isMobile = () => window.innerWidth < 768;

export default function ChatApp() {
  const chat = useChat();
  const { theme, setTheme } = useTheme();
  const { online, model } = useBackendStatus();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { newChat, stop, isStreaming, conversations, select, remove, restore, togglePin } = chat;

  const closeOnMobile = () => {
    if (isMobile()) setSidebarOpen(false);
  };

  const deleteChat = useCallback(
    (id: string) => {
      const removed = remove(id);
      if (!removed) return;
      toast({ message: "Chat deleted", action: { label: "Undo", onClick: () => restore(removed) } });
    },
    [remove, restore, toast],
  );

  const exportChat = useCallback(
    (id: string) => {
      const conversation = conversations.find((c) => c.id === id);
      if (!conversation) return;
      exportConversation(conversation);
      toast({ message: "Chat exported as Markdown" });
    },
    [conversations, toast],
  );

  const pinChat = useCallback(
    (id: string) => {
      const pinned = conversations.find((c) => c.id === id)?.pinned;
      togglePin(id);
      toast({ message: pinned ? "Chat unpinned" : "Chat pinned to top" });
    },
    [conversations, togglePin, toast],
  );

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
      } else if (mod && e.shiftKey && key === "o") {
        e.preventDefault();
        newChat();
      } else if (mod && key === "b") {
        e.preventDefault();
        setSidebarOpen((o) => !o);
      } else if (e.key === "Escape" && isStreaming) {
        stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newChat, stop, isStreaming]);

  const commands = useMemo<Command[]>(() => {
    const actions: Command[] = [
      { id: "new", label: "New chat", group: "Actions", icon: <SquarePen />, hint: shortcut("⇧", "O"), run: newChat },
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
    const chats: Command[] = [...conversations]
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updatedAt - a.updatedAt)
      .map((c) => ({
        id: `chat-${c.id}`,
        label: c.title,
        group: "Chats",
        icon: c.pinned ? <Pin /> : <MessageSquare />,
        run: () => {
          select(c.id);
          if (isMobile()) setSidebarOpen(false);
        },
      }));
    return [...actions, ...chats];
  }, [conversations, newChat, select, setTheme]);

  const messages = chat.active?.messages ?? [];

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-ink">
      <Sidebar
        open={sidebarOpen}
        onOpen={() => setSidebarOpen(true)}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeId={chat.activeId}
        streamingConversationId={chat.streamingConversationId}
        onSelect={(id) => {
          select(id);
          closeOnMobile();
        }}
        onNew={() => {
          newChat();
          closeOnMobile();
        }}
        onDelete={deleteChat}
        onRename={chat.rename}
        onTogglePin={pinChat}
        onExport={exportChat}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        theme={theme}
        onThemeChange={setTheme}
        online={online}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          conversation={chat.active}
          sidebarOpen={sidebarOpen}
          model={model}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onNew={newChat}
          onOpenPalette={() => setPaletteOpen(true)}
          onTogglePin={pinChat}
          onExport={exportChat}
          onDelete={deleteChat}
        />

        {messages.length === 0 ? (
          <EmptyState onSend={chat.send} onStop={stop} isStreaming={isStreaming} />
        ) : (
          <>
            <MessageList
              key={chat.activeId}
              messages={messages}
              isStreaming={isStreaming}
              onRegenerate={chat.regenerate}
              onEdit={chat.editMessage}
              onFeedback={chat.setFeedback}
            />
            <div className="px-4 pb-3 md:px-6">
              <div className="mx-auto max-w-3xl">
                <Composer onSend={chat.send} onStop={stop} isStreaming={isStreaming} autoFocus />
              </div>
            </div>
          </>
        )}
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
