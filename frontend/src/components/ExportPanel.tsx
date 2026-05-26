"use client";

import { useState } from "react";
import { AgentStep } from "@/lib/api";

export default function ExportPanel({ code, metrics }: { code: string; metrics: AgentStep["metrics"] }) {
  const [deploying, setDeploying] = useState(false);
  const [txHash, setTxHash] = useState("");

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trading_strategy.py";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, metrics }),
      });
      const data = await res.json();
      if (data.tx_hash) setTxHash(data.tx_hash);
    } catch (e) {
      console.error(e);
    }
    setDeploying(false);
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleDownload}
        className="w-full bg-agent-accent text-black py-2 rounded font-medium text-sm hover:opacity-90"
      >
        Download Strategy (.py)
      </button>
      <button
        onClick={handleDeploy}
        disabled={deploying}
        className="w-full bg-agent-warn text-black py-2 rounded font-medium text-sm mt-2 hover:opacity-90 disabled:opacity-50"
      >
        {deploying ? "Deploying..." : txHash ? "Deployed ✓" : "Deploy to Mantle"}
      </button>
      {txHash && (
        <p className="text-xs text-agent-accent mt-1 text-center truncate">
          TX: {txHash.slice(0, 10)}...
        </p>
      )}
      <p className="text-xs text-gray-500 mt-2 text-center">
        {metrics ? `Sharpe ${metrics.sharpe_ratio} · Return ${metrics.total_return_pct}%` : ""}
      </p>
    </div>
  );
}
