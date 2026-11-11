"use client";

import { Check, Copy, WrapText } from "lucide-react";
import { isValidElement, useState, type ReactNode } from "react";
import { cn, extractText } from "@/lib/utils";

export function CodeBlock({ children }: { children: ReactNode }) {
  const [wrap, setWrap] = useState(false);
  const [copied, setCopied] = useState(false);
  const className = isValidElement<{ className?: string }>(children) ? (children.props.className ?? "") : "";
  const language = /language-([\w+-]+)/.exec(className)?.[1] ?? "text";
  const code = extractText(children).replace(/\n$/, "");
  const lines = code.split("\n").length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="code-block my-4 overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] py-1.5 pr-1.5 pl-4">
        <span className="flex items-center gap-2 font-mono text-xs text-[#a6a298]">
          <span className="size-1.5 rounded-full bg-accent" />
          {language}
          <span className="text-[#6f6b63]">
            · {lines} {lines === 1 ? "line" : "lines"}
          </span>
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setWrap((w) => !w)}
            aria-pressed={wrap}
            title={wrap ? "Don't wrap lines" : "Wrap lines"}
            className={cn(
              "flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/10 hover:text-white",
              wrap ? "text-white" : "text-[#a6a298]",
            )}
          >
            <WrapText className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={copy}
            className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-[#a6a298] transition-colors hover:bg-white/10 hover:text-white"
          >
            {copied ? <Check className="size-3.5 text-[#4ade80]" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre
        className={cn(
          "px-4 py-3.5 text-[13px] leading-6",
          wrap ? "break-words whitespace-pre-wrap" : "overflow-x-auto",
        )}
      >
        {children}
      </pre>
    </div>
  );
}
