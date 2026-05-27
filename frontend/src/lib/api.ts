export interface AgentStep {
  type: "generation" | "backtest" | "analysis" | "optimization" | "validation" | "sizing_query";
  message: string;
  code?: string;
  metrics?: {
    total_return_pct: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    calmar_ratio: number;
    max_drawdown_pct: number;
    max_drawdown_duration: number;
    win_rate_pct: number;
    profit_factor: number;
    max_consecutive_losses: number;
    total_trading_cost: number;
  };
  equity_curve?: number[];
  benchmark_curve?: number[];
  dates?: string[];
  symbol?: string;
  total_trades?: number;
  improvement?: string;
}

export interface WalkForwardWindow {
  window: number;
  is_dates: string;
  oos_dates: string;
  is_return: number;
  oos_return: number;
  is_sharpe: number;
  oos_sharpe: number;
  is_win_rate: number;
  oos_win_rate: number;
  is_drawdown: number;
  oos_drawdown: number;
}

export interface WalkForwardResult {
  windows: WalkForwardWindow[];
  avg_is_return: number;
  avg_oos_return: number;
  avg_is_sharpe: number;
  avg_oos_sharpe: number;
  wfe: number | null;
  stability: string;
  overfit_signals: string[];
  n_windows: number;
}

export interface MonteCarloResult {
  n_trades: number;
  n_simulations: number;
  actual_return: number;
  actual_sharpe: number;
  p50_return: number;
  p5_return: number;
  p95_return: number;
  p_value: number;
  mean_return: number;
  std_return: number;
  mean_sharpe: number;
  mean_drawdown: number;
  histogram: { counts: number[]; bin_edges: number[] };
  is_significant: boolean;
  interpretation: string;
  error?: string;
}

export interface ParamHeatmapResult {
  param1_name: string;
  param2_name: string;
  x_labels: string[];
  y_labels: string[];
  z: number[][];
  annotations?: { x: number; y: number; text: string }[];
  best_combo: [number, number];
  best_score: number;
  original_score: number;
  stability: string;
  grid_size: number;
  metric: string;
  error?: string;
}

export interface AgentDone {
  final_code: string;
  final_metrics: AgentStep["metrics"];
  optimization_suggestion: string;
  walk_forward?: WalkForwardResult | null;
  monte_carlo?: MonteCarloResult | null;
  param_heatmap?: ParamHeatmapResult | null;
  sizing_needed?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function streamChat(
  message: string,
  mode: "generate" | "optimize",
  previousCode: string,
  previousMetrics: Record<string, number>,
  onStep: (step: AgentStep) => void,
  onDone: (done: AgentDone) => void,
  onError: (err: Error) => void,
  settings?: { capital: number; riskPct: number; symbols?: string[]; sizingConfirmed?: boolean; lang?: string },
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
      capital: settings?.capital ?? 10000,
      risk_pct: settings?.riskPct ?? 2,
      symbols: settings?.symbols ?? ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
      sizing_confirmed: settings?.sizingConfirmed ?? false,
      lang: settings?.lang ?? "zh",
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
              if (data.type === "generation" || data.type === "backtest" || data.type === "analysis" || data.type === "optimization" || data.type === "validation" || data.type === "sizing_query") {
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
