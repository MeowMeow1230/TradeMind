"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Logo from "@/components/Logo";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import SizingPrompt from "@/components/SizingPrompt";
import BacktestCard from "@/components/BacktestCard";
import CodeViewer from "@/components/CodeViewer";
import WalkForwardCard from "@/components/WalkForwardCard";
import MonteCarloCard from "@/components/MonteCarloCard";
import ParamHeatmapCard from "@/components/ParamHeatmapCard";
import ExportPanel from "@/components/ExportPanel";
import { streamChat, AgentStep, AgentDone, WalkForwardResult, MonteCarloResult, ParamHeatmapResult } from "@/lib/api";
import { LanguageProvider, useT } from "@/lib/i18n";

interface Message {
  id: string;
  type: "user" | "agent";
  content: string;
  step?: AgentStep;
}

export default function Home() {
  return (
    <LanguageProvider>
      <TradeMindApp />
    </LanguageProvider>
  );
}

function TradeMindApp() {
  const { t, toggleLang, lang } = useT();

  const PRESETS = [
    { label: "SMA CROSS", prompt: "Buy BTC when 10-period SMA crosses above 30-period SMA. Close when it crosses below. Stop loss 5% below entry. Take profit 10% above entry." },
    { label: "RSI REV", prompt: "Buy BTC when RSI(14) below 30 and close above 20-period SMA. Close when RSI above 70. Stop loss 5% below entry." },
    { label: "MACD", prompt: "Buy BTC when MACD line crosses above signal line and close above 50-period EMA. Close when MACD crosses below signal. Stop loss 3% below entry." },
    { label: "BB SQUEEZE", prompt: "Buy BTC when close touches lower Bollinger Band (20,2) and RSI below 35. Close when close hits middle band. Stop loss 3% below entry." },
  ];
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
  const [multiResults, setMultiResults] = useState<AgentStep[]>([]);
  const [walkForward, setWalkForward] = useState<WalkForwardResult | null>(null);
  const [monteCarlo, setMonteCarlo] = useState<MonteCarloResult | null>(null);
  const [paramHeatmap, setParamHeatmap] = useState<ParamHeatmapResult | null>(null);
  const [sizingNeeded, setSizingNeeded] = useState(false);
  const [sizingPresets, setSizingPresets] = useState<any>(null);
  const lastUserMessage = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const addMessage = (msg: Message) => setMessages((prev) => [...prev, msg]);

  const handleSend = (text: string, settings?: any) => {
    const mode = finalCode ? "optimize" : "generate";
    addMessage({ id: Date.now().toString(), type: "user", content: text });
    setLoading(true);
    setSizingNeeded(false);
    setSizingPresets(null);
    if (!finalCode) {
      lastUserMessage.current = text;
      setPipelineStep(1);
      setFinalMetrics(undefined);
      setFinalCode("");
      setSuggestion("");
    }

    streamChat(text, mode, currentCode, currentMetrics,
      (step) => {
        addMessage({ id: Date.now().toString() + Math.random(), type: "agent", content: step.message, step });
        if (step.code) { setCurrentCode(step.code); setPipelineStep(2); }
        if (step.metrics) { setCurrentMetrics(step.metrics as any); setPipelineStep(3); }
        if (step.equity_curve) setEquityCurve(step.equity_curve);
        if (step.benchmark_curve) setBenchmarkCurve(step.benchmark_curve);
        if (step.dates) setEquityDates(step.dates);
        if (step.type === "backtest") setMultiResults((prev) => [...prev, step]);
        if (step.type === "validation") setPipelineStep(-1);
        if (step.type === "sizing_query") {
          setSizingNeeded(true);
          setSizingPresets({
            presets_capital: (step as any).presets_capital || [1000, 5000, 10000, 50000, 100000],
            presets_risk: (step as any).presets_risk || [0.5, 1, 2, 5, 10],
            default_capital: (step as any).default_capital || 10000,
            default_risk: (step as any).default_risk || 2,
            available_symbols: (step as any).available_symbols || ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
            default_symbols: (step as any).default_symbols || ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
          });
          setLoading(false);
        }
      },
      (done) => {
        setLoading(false);
        if (done.final_code) {
          setFinalCode(done.final_code);
          setFinalMetrics(done.final_metrics);
          setSuggestion(done.optimization_suggestion);
          setWalkForward(done.walk_forward ?? null);
          setMonteCarlo(done.monte_carlo ?? null);
          setParamHeatmap(done.param_heatmap ?? null);
          setPipelineStep(4);
        } else if (!(done as any).sizing_needed) {
          setPipelineStep(0);
        }
      },
      (err) => {
        setLoading(false);
        addMessage({ id: Date.now().toString(), type: "agent", content: `ERROR: ${err.message}` });
      },
      { ...(settings || {}), lang },
    );
  };

  const handleSizingConfirm = (capital: number, riskPct: number, symbols: string[]) => {
    setSizingNeeded(false);
    setSizingPresets(null);
    handleSend(lastUserMessage.current, { capital, riskPct, symbols, sizingConfirmed: true, lang });
  };

  const handleReset = () => {
    setMessages([]); setFinalCode(""); setFinalMetrics(undefined); setSuggestion("");
    setCurrentCode(""); setCurrentMetrics({}); setEquityCurve([]); setBenchmarkCurve([]);
    setEquityDates([]); setMultiResults([]); setWalkForward(null); setMonteCarlo(null);
    setParamHeatmap(null); setStrategyName(""); setPipelineStep(0);
  };

  const handlePreset = (label: string, prompt: string) => {
    handleReset();
    setTimeout(() => { setStrategyName(label); handleSend(prompt); }, 50);
  };

  const elapsed = pipelineStep > 0 && pipelineStep < 4;
  const complete = pipelineStep === 4;

  return (
    <div className="flex h-screen" style={{background: "#0a0a0a"}}>
      {/* Left Panel — Chat + Input */}
      <div className="flex-1 flex flex-col min-w-0 border-r" style={{borderColor: "#2a2a2a"}}>
        {/* Header */}
        <header className="terminal-header flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs font-black tracking-[0.2em]">{t("header.title")}</span>
            <span className="text-[10px] text-terminal-muted">{t("header.flow")}</span>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <button onClick={toggleLang} className="text-terminal-muted hover:text-amber uppercase tracking-wider font-bold">{lang === "zh" ? "EN" : "中"}</button>
            {elapsed && (
              <div className="flex items-center gap-3">
                {["PARSE", "GEN", "TEST", "ANALYZE"].map((s, i) => (
                  <span key={s} className={i < pipelineStep ? "text-amber" : i === pipelineStep ? "text-amber" : "text-terminal-muted"}>
                    {i === pipelineStep && elapsed ? "●" : i < pipelineStep ? "✓" : "○"} {s}
                  </span>
                ))}
              </div>
            )}
            {complete && (
              <button onClick={handleReset} className="text-terminal-muted hover:text-amber text-[10px] uppercase tracking-wider">{t("header.new")}</button>
            )}
          </div>
        </header>

        {/* Presets */}
        {!complete && pipelineStep === 0 && (
          <div className="terminal-panel px-3 py-2 border-b border-terminal-border flex items-center gap-2">
            <span className="text-[10px] text-terminal-muted uppercase tracking-wider mr-1">{t("preset.load")}</span>
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => handlePreset(p.label, p.prompt)} disabled={loading}
                className="text-[10px] px-2.5 py-1 border border-terminal-border text-terminal-muted hover:text-amber hover:border-amber disabled:opacity-20 uppercase tracking-wider font-bold">
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-1">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Logo />
              <p className="text-terminal-muted text-[10px]">AI Trading Strategy Workstation v2.0</p>
              <p className="text-terminal-muted text-[10px] mt-1">Enter strategy &rarr; AI generates &rarr; Backtest &rarr; Deep Analysis</p>
              <p className="text-terminal-muted text-[10px]">Walk-Forward &bull; Monte Carlo &bull; Parameter Stability</p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} step={msg.step || { type: "user", message: msg.content }} isUser={msg.type === "user"} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-amber text-[10px] pl-2 py-1 font-bold uppercase tracking-wider">
              <span className="inline-block w-1.5 h-1.5 bg-amber"/> {pipelineStep === 1 ? t("loading.gen") : pipelineStep === 2 ? t("loading.test") : pipelineStep === 3 ? t("loading.analyze") : t("loading.process")}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input or Sizing */}
        {sizingNeeded && sizingPresets ? (
          <SizingPrompt
            presetsCapital={sizingPresets.presets_capital}
            presetsRisk={sizingPresets.presets_risk}
            defaultCapital={sizingPresets.default_capital}
            defaultRisk={sizingPresets.default_risk}
            availableSymbols={sizingPresets.available_symbols}
            defaultSymbols={sizingPresets.default_symbols}
            onConfirm={handleSizingConfirm}
          />
        ) : (
          <div className="px-4 pb-3">
            <ChatInput onSend={handleSend} disabled={loading} />
          </div>
        )}

        {/* Status bar */}
        <div className="terminal-status flex items-center justify-between">
          <span>{strategyName ? `${t("status.strategy")}${strategyName.toUpperCase()}` : t("status.ready")}</span>
          <span>{complete ? `RETURN ${finalMetrics?.total_return_pct ?? 0}% | SHARPE ${finalMetrics?.sharpe_ratio ?? 0}` : ""}</span>
          <span suppressHydrationWarning>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Right Panel — Results */}
      {complete && (
        <aside className="w-[420px] shrink-0 overflow-y-auto" style={{background: "#0a0a0a"}}>
          <div className="terminal-header">{t("sidebar.results")}</div>
          <div className="p-3 space-y-2">
            {finalCode && <CodeViewer code={finalCode} />}
            {finalMetrics && <BacktestCard metrics={finalMetrics} equityCurve={equityCurve} benchmarkCurve={benchmarkCurve} dates={equityDates} />}
            {multiResults.length > 1 && (
              <div className="terminal-panel p-3">
                <div className="text-[10px] text-terminal-muted uppercase tracking-wider mb-2 font-bold">Multi-Symbol [{multiResults.length}]</div>
                <table className="terminal-table">
                  <thead>
                    <tr><th>SYM</th><th className="text-right">RET%</th><th className="text-right">SHP</th><th className="text-right">TRD</th></tr>
                  </thead>
                  <tbody>
                    {multiResults.map((r) => (
                      <tr key={r.symbol}>
                        <td className="text-amber font-bold">{r.symbol}</td>
                        <td className={`text-right ${(r.metrics?.total_return_pct ?? 0) >= 0 ? "text-pnl-green" : "text-pnl-red"}`}>{r.metrics?.total_return_pct ?? 0}%</td>
                        <td className="text-right">{r.metrics?.sharpe_ratio?.toFixed(2) ?? "0.00"}</td>
                        <td className="text-right">{r.total_trades ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {suggestion && (
              <div className="terminal-panel p-3 border-amber">
                <div className="text-[10px] text-amber uppercase tracking-wider mb-2 font-bold">AI Analysis</div>
                <div className="text-[11px] leading-relaxed prose-terminal max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{suggestion}</ReactMarkdown>
                </div>
              </div>
            )}
            {walkForward && walkForward.windows && walkForward.windows.length > 0 && <WalkForwardCard wf={walkForward} />}
            {monteCarlo && <MonteCarloCard mc={monteCarlo} />}
            {paramHeatmap && <ParamHeatmapCard hm={paramHeatmap} />}
            {finalCode && <ExportPanel code={finalCode} metrics={finalMetrics} />}
          </div>
        </aside>
      )}
    </div>
  );
}
