"use client";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function CodeViewer({ code }: { code: string }) {
  return (
    <div className="terminal-panel p-3">
      <div className="text-[10px] text-terminal-muted uppercase tracking-wider mb-2 font-bold">Strategy Code</div>
      <div className="max-h-48 overflow-y-auto border border-terminal-border">
        <SyntaxHighlighter language="python" style={oneDark}
          customStyle={{ fontSize: "10px", margin: 0, background: "#0a0a0a", padding: "10px", borderRadius: 0, lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
