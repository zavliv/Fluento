"use client";

import dynamic from "next/dynamic";
import { ToastProvider } from "./ui/Toast";

const ChatApp = dynamic(() => import("./ChatApp"), {
  ssr: false,
  loading: () => <div className="h-dvh bg-bg" />,
});

export function ClientRoot() {
  return (
    <ToastProvider>
      <ChatApp />
    </ToastProvider>
  );
}
