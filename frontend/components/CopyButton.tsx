"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { IconButton } from "./IconButton";

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <IconButton label={copied ? "Copied" : "Copy"} size="sm" onClick={copy} className={className}>
      {copied ? <Check className="text-success" /> : <Copy />}
    </IconButton>
  );
}
