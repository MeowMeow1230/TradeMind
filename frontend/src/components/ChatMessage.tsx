import { AgentStep } from "@/lib/api";

function MetricsDisplay({ metrics }: { metrics: NonNullable<AgentStep["metrics"]> }) {
  const items = [
    { label: "收益", value: `${metrics.total_return_pct}%`, color: metrics.total_return_pct >= 0 ? "text-green-400" : "text-red-400" },
    { label: "夏普", value: metrics.sharpe_ratio.toFixed(2) },
    { label: "回撤", value: `${metrics.max_drawdown_pct}%`, color: "text-yellow-400" },
    { label: "勝率", value: `${metrics.win_rate_pct}%` },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mt-2">
      {items.map((item) => (
        <div key={item.label} className="text-center p-2 bg-agent-bg rounded">
          <div className="text-xs text-gray-500">{item.label}</div>
          <div className={`text-sm font-bold ${item.color || "text-white"}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function ChatMessage({ step, isUser }: { step: AgentStep | { type: "user"; message: string }; isUser: boolean }) {
  if ("type" in step && step.type === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div>
          <div className="text-xs text-gray-500 mb-1 text-right mr-1">You</div>
          <div className="bg-agent-accent text-black px-4 py-2 rounded-lg max-w-[80%] ml-auto">{step.message}</div>
        </div>
      </div>
    );
  }

  const agentStep = step as AgentStep;

  return (
    <div className="flex justify-start mb-4">
      <div>
        <div className="text-xs text-agent-accent mb-1 ml-1">AI Trading Partner</div>
        <div className="bg-agent-card border border-agent-border px-4 py-3 rounded-lg max-w-[85%]">
          {agentStep.symbol && <div className="text-xs text-agent-accent font-bold mb-1">{agentStep.symbol}</div>}
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{agentStep.message}</p>
          {agentStep.metrics && <MetricsDisplay metrics={agentStep.metrics} />}
          {agentStep.code && (
            <details className="mt-2">
              <summary className="text-xs text-agent-accent cursor-pointer hover:underline">View Generated Code</summary>
              <pre className="text-xs mt-2 p-2 bg-agent-bg rounded overflow-x-auto max-h-48">{agentStep.code}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
