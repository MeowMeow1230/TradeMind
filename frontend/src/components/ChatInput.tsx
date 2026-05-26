"use client";

import { useState } from "react";

export default function ChatInput({ onSend, disabled }: { onSend: (msg: string) => void; disabled: boolean }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t border-agent-border">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Describe your trading strategy... (e.g. Buy BTC when RSI < 30 and close above 20 SMA)"
        className="flex-1 bg-agent-bg border border-agent-border rounded px-4 py-2 text-sm focus:outline-none focus:border-agent-accent"
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="bg-agent-accent text-black px-6 py-2 rounded font-medium text-sm disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
