"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import BacktestCard from "@/components/BacktestCard";
import CodeViewer from "@/components/CodeViewer";
import ExportPanel from "@/components/ExportPanel";
import { streamChat, AgentStep, AgentDone } from "@/lib/api";

const PRESETS = [
  { label: "SMA Crossover", prompt: "Buy BTC when 10-period SMA crosses above 30-period SMA. Close when it crosses below." },
  { label: "RSI Oversold", prompt: "Buy BTC when RSI below 30 and close above 20-period SMA. Close when RSI above 70. Stop loss 5%." },
  { label: "MACD Trend", prompt: "Buy BTC when MACD line crosses above signal line and close above 50-period EMA. Close when MACD crosses below signal." },
  { label: "Bollinger Bounce", prompt: "Buy BTC when close touches lower Bollinger Band (20,2) and RSI below 35. Close when close hits middle band. Stop loss 3%." },
];

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
  const [strategyName, setStrategyName] = useState("");
  const [pipelineStep, setPipelineStep] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const addMessage = (msg: Message) => setMessages((prev) => [...prev, msg]);

  const handleSend = (text: string) => {
    const mode = finalCode ? "optimize" : "generate";
    addMessage({ id: Date.now().toString(), type: "user", content: text });
    setLoading(true);
    if (!finalCode) {
      setPipelineStep(1);
      setFinalMetrics(undefined);
      setFinalCode("");
      setSuggestion("");
    }

    streamChat(
      text, mode, currentCode, currentMetrics,
      (step) => {
        addMessage({ id: Date.now().toString() + Math.random(), type: "agent", content: step.message, step });
        if (step.code) { setCurrentCode(step.code); setPipelineStep(2); }
        if (step.metrics) { setCurrentMetrics(step.metrics as unknown as Record<string, number>); setPipelineStep(3); }
        if (step.equity_curve) setEquityCurve(step.equity_curve);
        if (step.benchmark_curve) setBenchmarkCurve(step.benchmark_curve);
        if (step.dates) setEquityDates(step.dates);
      },
      (done) => {
        setLoading(false);
        setFinalCode(done.final_code);
        setFinalMetrics(done.final_metrics);
        setSuggestion(done.optimization_suggestion);
        setPipelineStep(4);
      },
      (err) => {
        setLoading(false);
        addMessage({ id: Date.now().toString(), type: "agent", content: `Error: ${err.message}` });
      }
    );
  };

  const handleReset = () => {
    setMessages([]);
    setFinalCode("");
    setFinalMetrics(undefined);
    setSuggestion("");
    setCurrentCode("");
    setCurrentMetrics({});
    setEquityCurve([]);
    setBenchmarkCurve([]);
    setEquityDates([]);
    setStrategyName("");
    setPipelineStep(0);
  };

  const handlePreset = (label: string, prompt: string) => {
    handleReset();
    setTimeout(() => {
      setStrategyName(label);
      handleSend(prompt);
    }, 100);
  };

  const steps = ["Describe", "Generate Code", "Backtest", "Analyze & Optimize"];

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto">
        <header className="p-4 border-b border-agent-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-agent-accent">AI Trading Partner</h1>
              <p className="text-xs text-gray-500">Natural Language → Python Strategy → Backtest → Optimize → Deploy</p>
            </div>
            {finalCode && (
              <button onClick={handleReset} className="text-xs text-gray-500 hover:text-white border border-agent-border rounded px-3 py-1">
                New Strategy
              </button>
            )}
          </div>
          {pipelineStep > 0 && (
            <div className="flex items-center gap-1 mt-3">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-1 flex-1">
                  <div className={`h-1.5 flex-1 rounded-full ${i < pipelineStep ? "bg-agent-accent" : i === pipelineStep ? "bg-agent-accent animate-pulse" : "bg-agent-border"}`} />
                  <span className={`text-[10px] whitespace-nowrap ${i <= pipelineStep ? "text-agent-accent" : "text-gray-600"}`}>{s}</span>
                </div>
              ))}
            </div>
          )}
        </header>

        {!finalCode && pipelineStep === 0 && (
          <div className="p-4 border-b border-agent-border">
            <p className="text-xs text-gray-500 mb-2">Quick Start — pick a strategy or type your own:</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p.label, p.prompt)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full border border-agent-border text-gray-300 hover:border-agent-accent hover:text-agent-accent disabled:opacity-50 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} step={msg.step || { type: "user", message: msg.content }} isUser={msg.type === "user"} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-agent-accent text-sm mb-4">
              <span className="animate-pulse">
                {pipelineStep === 1 ? "Generating strategy code with AI..." :
                 pipelineStep === 2 ? "Running backtest on Bybit data..." :
                 pipelineStep === 3 ? "Analyzing results..." :
                 "Working..."}
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <ChatInput onSend={handleSend} disabled={loading} />
      </div>

      <aside className="w-96 border-l border-agent-border p-4 overflow-y-auto hidden lg:block space-y-4">
        {strategyName && <div className="text-xs text-gray-500">Strategy: <span className="text-agent-accent">{strategyName}</span></div>}
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
