import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentStep } from "@/lib/api";
import Tooltip from "./Tooltip";

const METRIC_TIPS: Record<string, string> = {
  Return: "Total % gain/loss. Positive = profit.",
  Sharpe: "Risk-adjusted return. >1 good, >2 excellent.",
  Sortino: "Like Sharpe but only counts downside risk.",
  DD: "Max peak-to-trough loss. Shows worst-case.",
  "Win%": "% of winning trades.",
  PF: "Profit Factor: gross profit / gross loss.",
  Consec: "Longest losing streak. Tests psychology.",
  Cost: "Total spread + slippage + commission.",
};

function MetricsGrid({ metrics }: { metrics: NonNullable<AgentStep["metrics"]> }) {
  const items = [
    { label: "Return", value: `${metrics.total_return_pct}%`, color: metrics.total_return_pct >= 0 ? "text-pnl-green" : "text-pnl-red" },
    { label: "Sharpe", value: String(metrics.sharpe_ratio) },
    { label: "Sortino", value: String(metrics.sortino_ratio ?? "-") },
    { label: "DD", value: `${metrics.max_drawdown_pct}%` },
    { label: "Win%", value: `${metrics.win_rate_pct}%` },
    { label: "PF", value: String(metrics.profit_factor) },
    { label: "Consec", value: String(metrics.max_consecutive_losses ?? "-") },
    { label: "Cost", value: `$${metrics.total_trading_cost ?? 0}` },
  ];
  return (
    <div className="grid grid-cols-4 gap-px mt-2" style={{background: "#2a2a2a"}}>
      {items.map((item) => (
        <div key={item.label} className="text-center p-2" style={{background: "#0f0f0f"}}>
          <div className="text-[9px] text-terminal-muted mb-0.5 uppercase tracking-wider flex items-center justify-center">{item.label}<Tooltip text={METRIC_TIPS[item.label] || ""} /></div>
          <div className={`text-[11px] font-bold ${item.color || "text-terminal-text"}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function ChatMessage({ step, isUser }: { step: AgentStep | { type: "user"; message: string }; isUser: boolean }) {
  if ("type" in step && step.type === "user") {
    return (
      <div className="flex mb-2">
        <span className="text-terminal-muted text-[10px] mr-2 shrink-0 mt-1 font-bold">USER&gt;</span>
        <span className="text-terminal-bright text-xs leading-relaxed">{step.message}</span>
      </div>
    );
  }

  const agentStep = step as AgentStep;
  const isAnalysis = agentStep.type === "analysis" || agentStep.type === "optimization";

  return (
    <div className="flex mb-2">
      <span className="text-amber text-[10px] mr-2 shrink-0 mt-1 font-bold">SYS&gt;</span>
      <div className="flex-1 min-w-0">
        {agentStep.symbol && (
          <span className="text-amber text-[10px] font-bold mr-2">{agentStep.symbol}</span>
        )}
        {isAnalysis ? (
          <div className="text-[11px] leading-relaxed prose-terminal max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {agentStep.message}
            </ReactMarkdown>
          </div>
        ) : (
          <span className="text-terminal-text text-xs leading-relaxed whitespace-pre-wrap">{agentStep.message}</span>
        )}
        {agentStep.metrics && <MetricsGrid metrics={agentStep.metrics} />}
        {agentStep.code && (
          <details className="mt-2">
            <summary className="text-[10px] text-amber cursor-pointer font-bold uppercase tracking-wider">[+] View Code</summary>
            <pre className="terminal-code mt-1 overflow-x-auto max-h-48">{agentStep.code}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
