"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";

export default function ChatInput({ onSend, disabled }: { onSend: (msg: string, settings?: { capital: number; riskPct: number; symbols?: string[]; sizingConfirmed?: boolean }) => void; disabled: boolean }) {
  const { t } = useT();
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="shrink-0 pt-2">
      <div className="terminal-panel flex items-center gap-0 p-0">
        <span className="text-amber px-3 shrink-0 text-xs font-bold select-none">{">"}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("input.placeholder")}
          className="flex-1 bg-transparent border-0 px-0 py-2.5 text-xs text-terminal-bright placeholder:text-terminal-muted focus:outline-none font-mono"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="terminal-btn-primary px-6 py-2.5 text-xs font-bold disabled:opacity-30 shrink-0"
        >
          {t("input.execute")}
        </button>
      </div>
    </form>
  );
}
