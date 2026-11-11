"use client";

import { Children, Fragment, memo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";

const normalizeSpaces = (text: string) => text.replace(/[\u2007\u2009\u202f]/g, "\u00a0");

const BR = /<br\s*\/?>/i;

function withLineBreaks(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child !== "string" || !BR.test(child)) return child;
    return child.split(/<br\s*\/?>/gi).map((part, i) => (
      <Fragment key={i}>
        {i > 0 && <br />}
        {part}
      </Fragment>
    ));
  });
}

const components: Components = {
  p: ({ children }) => <p>{withLineBreaks(children)}</p>,
  li: ({ children }) => <li>{withLineBreaks(children)}</li>,
  td: ({ children }) => <td>{withLineBreaks(children)}</td>,
  th: ({ children }) => <th>{withLineBreaks(children)}</th>,
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
};

export const Markdown = memo(function Markdown({ text, streaming }: { text: string; streaming?: boolean }) {
  return (
    <div className={cn("md", streaming && "md-streaming")}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {normalizeSpaces(text)}
      </ReactMarkdown>
    </div>
  );
});
