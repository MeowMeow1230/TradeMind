"use client";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function CodeViewer({ code }: { code: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-bold text-agent-accent mb-2">Strategy Code</h3>
      <div className="max-h-64 overflow-y-auto rounded border border-agent-border">
        <SyntaxHighlighter language="python" style={oneDark} customStyle={{ fontSize: "11px", margin: 0 }}>
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
