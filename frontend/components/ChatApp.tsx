"use client";

import { useEffect, useState } from "react";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { useChat } from "@/hooks/useChat";
import { useTheme } from "@/hooks/useTheme";
import { ChatHeader } from "./ChatHeader";
import { Composer } from "./Composer";
import { EmptyState } from "./EmptyState";
import { MessageList } from "./MessageList";
import { Sidebar } from "./Sidebar";

const isMobile = () => window.innerWidth < 768;

export default function ChatApp() {
  const chat = useChat();
  const { theme, setTheme } = useTheme();
  const online = useBackendStatus();
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());
  const { newChat, stop, isStreaming } = chat;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && e.shiftKey && key === "o") {
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

  const closeOnMobile = () => {
    if (isMobile()) setSidebarOpen(false);
  };

  const messages = chat.active?.messages ?? [];
  const streamingConversationId = chat.streamingId
    ? (chat.conversations.find((c) => c.messages.some((m) => m.id === chat.streamingId))?.id ?? null)
    : null;

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-ink">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={chat.conversations}
        activeId={chat.activeId}
        streamingConversationId={streamingConversationId}
        onSelect={(id) => {
          chat.select(id);
          closeOnMobile();
        }}
        onNew={() => {
          chat.newChat();
          closeOnMobile();
        }}
        onDelete={chat.remove}
        onRename={chat.rename}
        theme={theme}
        onThemeChange={setTheme}
        online={online}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          title={chat.active?.title ?? "New chat"}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onNew={chat.newChat}
        />

        {messages.length === 0 ? (
          <EmptyState onSend={chat.send} onStop={chat.stop} isStreaming={chat.isStreaming} />
        ) : (
          <>
            <MessageList
              key={chat.activeId}
              messages={messages}
              isStreaming={chat.isStreaming}
              onRegenerate={chat.regenerate}
              onEdit={chat.editMessage}
            />
            <div className="px-4 pb-3 md:px-6">
              <div className="mx-auto max-w-3xl">
                <Composer onSend={chat.send} onStop={chat.stop} isStreaming={chat.isStreaming} autoFocus />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
