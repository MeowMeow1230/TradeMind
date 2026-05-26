"use client";

import { useEffect, useRef } from "react";
import { AgentStep } from "@/lib/api";

export default function BacktestCard({ metrics, equityCurve, benchmarkCurve, dates }: {
  metrics: NonNullable<AgentStep["metrics"]>;
  equityCurve?: number[];
  benchmarkCurve?: number[];
  dates?: string[];
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!equityCurve || !dates || !chartRef.current) return;
    import("plotly.js-dist-min").then((Plotly) => {
      const traces = [
        {
          x: dates,
          y: equityCurve,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Strategy",
          line: { color: "#00d4aa", width: 2 },
        },
      ];
      if (benchmarkCurve) {
        traces.push({
          x: dates,
          y: benchmarkCurve,
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Buy & Hold",
          line: { color: "#8b949e", width: 1, dash: "dot" },
        });
      }
      const layout = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "#8b949e", size: 10 },
        margin: { l: 45, r: 10, t: 10, b: 30 },
        xaxis: { showgrid: false },
        yaxis: { showgrid: true, gridcolor: "#30363d", tickprefix: "$" },
        height: 300,
        legend: { x: 0, y: 1.1, orientation: "h" as const, font: { size: 10 } },
      };
      Plotly.newPlot(chartRef.current, traces, layout, { displayModeBar: false, responsive: true });
    });
  }, [equityCurve, benchmarkCurve, dates]);

  return (
    <div className="mt-4 p-3 bg-agent-card border border-agent-border rounded">
      <h3 className="text-sm font-bold text-agent-accent mb-2">Backtest Results</h3>
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div><span className="text-gray-500">Return: </span><span className={metrics.total_return_pct >= 0 ? "text-green-400" : "text-red-400"}>{metrics.total_return_pct}%</span></div>
        <div><span className="text-gray-500">Sharpe: </span><span>{metrics.sharpe_ratio}</span></div>
        <div><span className="text-gray-500">Drawdown: </span><span className="text-yellow-400">{metrics.max_drawdown_pct}%</span></div>
        <div><span className="text-gray-500">Win Rate: </span><span>{metrics.win_rate_pct}%</span></div>
      </div>
      {equityCurve && <div ref={chartRef} />}
    </div>
  );
}
