"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import BacktestCard from "@/components/BacktestCard";
import CodeViewer from "@/components/CodeViewer";
import ExportPanel from "@/components/ExportPanel";
import { streamChat, AgentStep, AgentDone } from "@/lib/api";

interface Message {
  id: string;
  type: "user" | "agent";
  content: string;
  step?: AgentStep;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [finalCode, setFinalCode] = useState("");
  const [finalMetrics, setFinalMetrics] = useState<AgentStep["metrics"]>(undefined);
  const [suggestion, setSuggestion] = useState("");
  const [currentCode, setCurrentCode] = useState("");
  const [currentMetrics, setCurrentMetrics] = useState<Record<string, number>>({});
  const [equityCurve, setEquityCurve] = useState<number[]>([]);
  const [benchmarkCurve, setBenchmarkCurve] = useState<number[]>([]);
  const [equityDates, setEquityDates] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const addMessage = (msg: Message) => setMessages((prev) => [...prev, msg]);

  const handleSend = (text: string) => {
    const mode = finalCode ? "optimize" : "generate";
    addMessage({ id: Date.now().toString(), type: "user", content: text });
    setLoading(true);

    streamChat(
      text,
      mode,
      currentCode,
      currentMetrics,
      (step) => {
        addMessage({ id: Date.now().toString() + Math.random(), type: "agent", content: step.message, step });
        if (step.code) setCurrentCode(step.code);
        if (step.metrics) setCurrentMetrics(step.metrics as unknown as Record<string, number>);
        if (step.equity_curve) setEquityCurve(step.equity_curve);
        if (step.benchmark_curve) setBenchmarkCurve(step.benchmark_curve);
        if (step.dates) setEquityDates(step.dates);
      },
      (done) => {
        setLoading(false);
        setFinalCode(done.final_code);
        setFinalMetrics(done.final_metrics);
        setSuggestion(done.optimization_suggestion);
      },
      (err) => {
        setLoading(false);
        addMessage({ id: Date.now().toString(), type: "agent", content: `Error: ${err.message}` });
      }
    );
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto">
        <header className="p-4 border-b border-agent-border">
          <h1 className="text-lg font-bold text-agent-accent">AI Trading Partner</h1>
          <p className="text-xs text-gray-500">Describe your strategy. AI builds, backtests, and optimizes it.</p>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} step={msg.step || { type: "user", message: msg.content }} isUser={msg.type === "user"} />
          ))}
          {loading && <div className="text-agent-accent text-sm animate-pulse">Thinking...</div>}
          <div ref={bottomRef} />
        </div>
        <ChatInput onSend={handleSend} disabled={loading} />
      </div>

      <aside className="w-96 border-l border-agent-border p-4 overflow-y-auto hidden lg:block space-y-4">
        {finalCode && <CodeViewer code={finalCode} />}
        {finalMetrics && <BacktestCard metrics={finalMetrics} equityCurve={equityCurve} benchmarkCurve={benchmarkCurve} dates={equityDates} />}
        {suggestion && (
          <div className="p-3 bg-agent-bg border border-agent-accent rounded">
            <h3 className="text-sm font-bold text-agent-accent mb-2">AI Suggestion</h3>
            <p className="text-xs text-gray-300 leading-relaxed">{suggestion}</p>
          </div>
        )}
        {finalCode && <ExportPanel code={finalCode} metrics={finalMetrics} />}
      </aside>
    </div>
  );
}
