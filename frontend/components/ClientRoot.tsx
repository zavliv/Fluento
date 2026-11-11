"use client";

import dynamic from "next/dynamic";

const ChatApp = dynamic(() => import("./ChatApp"), {
  ssr: false,
  loading: () => <div className="h-dvh bg-bg" />,
});

export function ClientRoot() {
  return <ChatApp />;
}
