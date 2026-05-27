"use client";
import { useEffect, useRef } from "react";
import { AgentStep } from "@/lib/api";
import Tooltip from "./Tooltip";

export default function BacktestCard({ metrics, equityCurve, benchmarkCurve, dates }: {
  metrics: NonNullable<AgentStep["metrics"]>; equityCurve?: number[]; benchmarkCurve?: number[]; dates?: string[];
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!equityCurve || !dates || !chartRef.current) return;
    import("plotly.js-dist-min").then((Plotly) => {
      const traces: any[] = [
        { x: dates, y: equityCurve, type: "scatter", mode: "lines", name: "Strategy", line: { color: "#d4a017", width: 1.5 } },
      ];
      if (benchmarkCurve?.length) {
        traces.push({ x: dates, y: benchmarkCurve, type: "scatter", mode: "lines", name: "B&H", line: { color: "#555", width: 0.8 } });
      }
      Plotly.newPlot(chartRef.current, traces, {
        paper_bgcolor: "#0a0a0a", plot_bgcolor: "#0a0a0a",
        font: { color: "#888", size: 9, family: "JetBrains Mono, monospace" },
        margin: { l: 50, r: 10, t: 5, b: 30 },
        xaxis: { showgrid: false, color: "#555" },
        yaxis: { showgrid: true, gridcolor: "#1a1a1a", tickprefix: "$", color: "#555" },
        height: 240, legend: { x: 0, y: 1.1, orientation: "h", font: { size: 9, color: "#888" } },
      }, { displayModeBar: false, responsive: true });
    });
  }, [equityCurve, benchmarkCurve, dates]);

  return (
    <div className="terminal-panel p-3">
      <div className="text-[10px] text-terminal-muted uppercase tracking-wider mb-2 font-bold">Backtest</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] mb-3">
        <div className="flex justify-between"><span className="text-terminal-muted flex items-center">Return<Tooltip text="Total % gain/loss over the backtest period. Positive = profit, negative = loss." /></span><span className={`font-bold ${metrics.total_return_pct >= 0 ? "text-pnl-green" : "text-pnl-red"}`}>{metrics.total_return_pct}%</span></div>
        <div className="flex justify-between"><span className="text-terminal-muted flex items-center">Sharpe<Tooltip text="Risk-adjusted return. >1 is good, >2 is excellent. Negative = taking risk for no reward." /></span><span className={metrics.sharpe_ratio >= 0 ? "text-terminal-text" : "text-pnl-red"}>{metrics.sharpe_ratio}</span></div>
        <div className="flex justify-between"><span className="text-terminal-muted flex items-center">Sortino<Tooltip text="Like Sharpe but only penalizes downside volatility. Higher = better risk management." /></span><span className="text-terminal-text">{metrics.sortino_ratio ?? "-"}</span></div>
        <div className="flex justify-between"><span className="text-terminal-muted flex items-center">Calmar<Tooltip text="Return / max drawdown. Measures how efficiently the strategy recovers from losses." /></span><span className="text-terminal-text">{metrics.calmar_ratio ?? "-"}</span></div>
        <div className="flex justify-between"><span className="text-terminal-muted flex items-center">Drawdown<Tooltip text="Largest peak-to-trough drop. >20% is risky. Shows worst-case for your account." /></span><span className="text-amber">{metrics.max_drawdown_pct}%</span></div>
        <div className="flex justify-between"><span className="text-terminal-muted flex items-center">Win Rate<Tooltip text="% of trades that were profitable. Low win rate needs high reward:risk to compensate." /></span><span className="text-terminal-text">{metrics.win_rate_pct}%</span></div>
        <div className="flex justify-between"><span className="text-terminal-muted flex items-center">PF<Tooltip text="Profit Factor: gross profit / gross loss. >1.5 is good, <1 means losses exceed wins." /></span><span className={metrics.profit_factor >= 1 ? "text-pnl-green" : "text-pnl-red"}>{metrics.profit_factor}</span></div>
        <div className="flex justify-between"><span className="text-terminal-muted flex items-center">Cost<Tooltip text="Total trading costs: spread + slippage + commission. High costs kill frequent strategies." /></span><span className="text-amber">${metrics.total_trading_cost ?? 0}</span></div>
      </div>
      {equityCurve && equityCurve.length > 0 && <div ref={chartRef} />}
    </div>
  );
}
