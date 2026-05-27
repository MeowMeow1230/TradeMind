"use client";
import { useState } from "react";
import { AgentStep } from "@/lib/api";

export default function ExportPanel({ code, metrics }: { code: string; metrics: AgentStep["metrics"] }) {
  const [deploying, setDeploying] = useState(false);
  const [txHash, setTxHash] = useState("");

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/x-python" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "strategy.py"; a.click(); URL.revokeObjectURL(a.href);
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const res = await fetch("http://localhost:8001/deploy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, metrics }) });
      const data = await res.json();
      if (data.tx_hash) setTxHash(data.tx_hash);
    } catch (e) { console.error(e); }
    setDeploying(false);
  };

  return (
    <div className="space-y-1.5">
      <button onClick={handleDownload} className="w-full terminal-btn-primary py-2 text-[10px] font-bold uppercase tracking-wider">
        Download .PY
      </button>
      <button onClick={handleDeploy} disabled={deploying} className="w-full terminal-btn py-2 text-[10px] font-bold uppercase tracking-wider disabled:opacity-30">
        {deploying ? "DEPLOYING..." : txHash ? "DEPLOYED" : "Deploy to Mantle"}
      </button>
      {txHash && <div className="text-[9px] text-pnl-green truncate text-center">TX: {txHash.slice(0, 14)}...</div>}
    </div>
  );
}
