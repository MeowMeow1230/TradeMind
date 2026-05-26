export interface AgentStep {
  type: "generation" | "backtest" | "analysis" | "optimization";
  message: string;
  code?: string;
  metrics?: {
    total_return_pct: number;
    sharpe_ratio: number;
    max_drawdown_pct: number;
    win_rate_pct: number;
    profit_factor: number;
  };
  equity_curve?: number[];
  dates?: string[];
  total_trades?: number;
  improvement?: string;
}

export interface AgentDone {
  final_code: string;
  final_metrics: AgentStep["metrics"];
  optimization_suggestion: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function streamChat(
  message: string,
  mode: "generate" | "optimize",
  previousCode: string,
  previousMetrics: Record<string, number>,
  onStep: (step: AgentStep) => void,
  onDone: (done: AgentDone) => void,
  onError: (err: Error) => void
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      mode,
      previous_code: previousCode,
      previous_metrics: previousMetrics,
    }),
    signal: controller.signal,
  })
    .then(async (res) => {
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              // SSE events come as separate lines; parse the event type from adjacent lines
              // The backend sends: event:step\ndata:{...}\n\n
              // We parse data lines and dispatch based on content shape
              if (data.type === "generation" || data.type === "backtest" || data.type === "analysis" || data.type === "optimization") {
                onStep(data as AgentStep);
              } else if (data.final_code !== undefined) {
                onDone(data as AgentDone);
              }
            } catch {}
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") onError(err);
    });

  return controller;
}
