"use client";
import { useEffect, useRef } from "react";
import { MonteCarloResult } from "@/lib/api";
import Tooltip from "./Tooltip";

export default function MonteCarloCard({ mc }: { mc: MonteCarloResult }) {
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mc.histogram || !chartRef.current) return;
    import("plotly.js-dist-min").then((Plotly) => {
      const { counts, bin_edges } = mc.histogram;
      const centers = bin_edges.slice(0, -1).map((e: number, i: number) => (e + bin_edges[i + 1]) / 2);
      Plotly.newPlot(chartRef.current, [{
        x: centers, y: counts, type: "bar",
        marker: { color: "rgba(212, 160, 23, 0.4)", line: { color: "rgba(212, 160, 23, 0.15)", width: 1 } },
      }], {
        paper_bgcolor: "#0a0a0a", plot_bgcolor: "#0a0a0a",
        font: { color: "#888", size: 9, family: "JetBrains Mono, monospace" },
        margin: { l: 45, r: 10, t: 5, b: 30 },
        xaxis: { title: "Return %", showgrid: false, color: "#555" },
        yaxis: { showgrid: true, gridcolor: "#1a1a1a", color: "#555" },
        height: 200,
        shapes: [{ type: "line", x0: mc.actual_return, y0: 0, x1: mc.actual_return, y1: Math.max(...counts) * 1.1, line: { color: mc.actual_return >= mc.p50_return ? "#00a854" : "#e05555", width: 1.5 } }],
      }, { displayModeBar: false, responsive: true });
    });
  }, [mc]);

  if (mc.error) return <div className="terminal-panel p-3"><div className="text-[10px] text-terminal-muted uppercase tracking-wider font-bold">Monte Carlo</div><div className="text-[10px] text-terminal-muted mt-1">{mc.error}</div></div>;

  return (
    <div className="terminal-panel p-3">
      <div className="text-[10px] text-terminal-muted uppercase tracking-wider mb-2 font-bold flex items-center">Monte Carlo [{mc.n_simulations} sims]<Tooltip text="Resamples trade returns 1000x with replacement. Builds a distribution of possible outcomes. If actual result is within random range, strategy has no edge." /></div>
      <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
        <div className="p-2" style={{background: "#0a0a0a"}}><div className="text-terminal-muted">Actual</div><div className={`font-bold ${mc.actual_return >= 0 ? "text-pnl-green" : "text-pnl-red"}`}>{mc.actual_return}%</div></div>
        <div className="p-2" style={{background: "#0a0a0a"}}><div className="text-terminal-muted">Median</div><div className="font-bold text-terminal-text">{mc.p50_return}%</div></div>
        <div className="p-2" style={{background: "#0a0a0a"}}><div className="text-terminal-muted">P5</div><div className="font-bold text-pnl-red">{mc.p5_return}%</div></div>
        <div className="p-2" style={{background: "#0a0a0a"}}><div className="text-terminal-muted">P95</div><div className="font-bold text-pnl-green">{mc.p95_return}%</div></div>
      </div>
      <div ref={chartRef} />
      <div className="text-[10px] mt-1 flex items-center"><span className="text-terminal-muted">P-value: </span><span className={`font-bold ${mc.is_significant ? "text-pnl-green" : "text-amber"}`}>{mc.p_value}</span><Tooltip text="Probability the result is from luck. <0.05 = statistically significant. 0.50 = no edge detected." /></div>
      <div className={`text-[10px] font-bold uppercase mt-1 ${mc.is_significant ? "text-pnl-green" : "text-amber"}`}>{mc.interpretation}</div>
    </div>
  );
}
