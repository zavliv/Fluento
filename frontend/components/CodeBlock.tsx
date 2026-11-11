import { isValidElement, type ReactNode } from "react";
import { extractText } from "@/lib/utils";
import { CopyButton } from "./CopyButton";

export function CodeBlock({ children }: { children: ReactNode }) {
  const className = isValidElement<{ className?: string }>(children) ? children.props.className ?? "" : "";
  const language = /language-([\w+-]+)/.exec(className)?.[1] ?? "text";
  const code = extractText(children).replace(/\n$/, "");

  return (
    <div className="code-block my-4 overflow-hidden rounded-xl">
      <div className="flex items-center justify-between py-1 pr-1.5 pl-4">
        <span className="font-mono text-xs text-[#9b978e]">{language}</span>
        <CopyButton text={code} className="text-[#9b978e] hover:bg-white/10 hover:text-white" />
      </div>
      <pre className="overflow-x-auto px-4 pt-1 pb-4 text-[13px] leading-6">{children}</pre>
    </div>
  );
}
