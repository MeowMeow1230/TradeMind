"use client";

import { useEffect, useRef } from "react";
import { ParamHeatmapResult } from "@/lib/api";

export default function ParamHeatmapCard({ hm }: { hm: ParamHeatmapResult }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hm.z || !hm.x_labels || !hm.y_labels || !chartRef.current) return;
    import("plotly.js-dist-min").then((Plotly) => {
      const trace = {
        z: hm.z,
        x: hm.x_labels,
        y: hm.y_labels,
        type: "heatmap" as const,
        colorscale: [
          [0, "#f48771"],
          [0.25, "#e5c07b"],
          [0.5, "#8b949e"],
          [0.75, "#64d8cb"],
          [1, "#7fd896"],
        ],
        zmin: Math.min(...hm.z.flat()),
        zmax: Math.max(...hm.z.flat()),
        showscale: true,
        colorbar: {
          title: hm.metric === "sharpe_ratio" ? "Sharpe" : "Return %",
          titleside: "right" as const,
          thickness: 8,
          len: 0.6,
          font: { size: 9, color: "#8b949e" },
        },
      };

      const layout = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "#8b949e", size: 10, family: "JetBrains Mono, monospace" },
        margin: { l: 55, r: 15, t: 10, b: 40 },
        xaxis: { title: hm.param1_name, showgrid: false, color: "#8b949e", dtick: 1 },
        yaxis: { title: hm.param2_name, showgrid: false, color: "#8b949e", dtick: 1 },
        height: 280,
        annotations: hm.annotations?.map((a) => ({
          x: hm.x_labels[a.x],
          y: hm.y_labels[a.y],
          text: a.text,
          showarrow: false,
          font: { size: 8, color: "#e6edf3" },
        })) || [],
      };

      Plotly.newPlot(chartRef.current, [trace], layout, { displayModeBar: false, responsive: true });
    });
  }, [hm]);

  if (hm.error) {
    return (
      <div className="glass-sm p-4">
        <h3 className="text-sm font-semibold text-white mb-2">Parameter Stability</h3>
        <p className="text-xs text-muted">{hm.error}</p>
      </div>
    );
  }

  return (
    <div className="glass-sm p-4">
      <h3 className="text-sm font-semibold text-white mb-2">Parameter Stability</h3>
      <p className="text-xs text-muted mb-2">
        How {hm.metric === "sharpe_ratio" ? "Sharpe" : "return"} changes with parameter values. Smooth = stable, jagged = fragile.
      </p>

      <div ref={chartRef} className="rounded-lg overflow-hidden mb-2" />

      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-muted">Best combo</span>
          <span className="font-mono text-accent">({hm.best_combo[0]}, {hm.best_combo[1]}) — {hm.best_score}</span>
        </div>
        <div className={`p-2 rounded-lg text-xs font-semibold ${
          hm.stability.includes("Highly") ? "bg-success/10 border border-success/20 text-success" :
          hm.stability.includes("Moderate") ? "bg-accent/10 border border-accent/20 text-accent" :
          "bg-warning/10 border border-warning/20 text-warning"
        }`}>
          {hm.stability}
        </div>
      </div>
    </div>
  );
}
