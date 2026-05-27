"use client";
import { useState } from "react";

interface SizingPromptProps {
  presetsCapital: number[]; presetsRisk: number[]; defaultCapital: number; defaultRisk: number;
  availableSymbols: string[]; defaultSymbols: string[];
  onConfirm: (capital: number, riskPct: number, symbols: string[]) => void;
}

export default function SizingPrompt({ presetsCapital, presetsRisk, defaultCapital, defaultRisk, availableSymbols, defaultSymbols, onConfirm }: SizingPromptProps) {
  const [capital, setCapital] = useState(String(defaultCapital));
  const [riskPct, setRiskPct] = useState(String(defaultRisk));
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set(defaultSymbols));

  const toggle = (sym: string) => { const n = new Set(selectedSymbols); n.has(sym) ? n.delete(sym) : n.add(sym); setSelectedSymbols(n); };
  const fmt = (n: number) => n >= 1000 ? `$${n / 1000}K` : `$${n}`;

  return (
    <div className="space-y-2 px-4 pb-3 pt-2">
      <div className="terminal-panel p-3 space-y-3">
        <div className="text-[10px] text-amber uppercase tracking-wider font-bold">Configuration</div>
        {/* Capital */}
        <div>
          <div className="text-[9px] text-terminal-muted uppercase tracking-wider mb-1">Account</div>
          <div className="flex flex-wrap gap-1">
            {presetsCapital.map((n) => (
              <button key={n} onClick={() => setCapital(String(n))}
                className={`text-[10px] px-2 py-1 border font-bold ${String(n) === capital ? "border-amber text-amber bg-amber-soft" : "border-terminal-border text-terminal-muted hover:border-terminal-muted"}`}>
                {fmt(n)}
              </button>
            ))}
          </div>
        </div>
        {/* Risk */}
        <div>
          <div className="text-[9px] text-terminal-muted uppercase tracking-wider mb-1">Risk/Trade</div>
          <div className="flex flex-wrap gap-1">
            {presetsRisk.map((n) => (
              <button key={n} onClick={() => setRiskPct(String(n))}
                className={`text-[10px] px-2 py-1 border font-bold ${String(n) === riskPct ? "border-amber text-amber bg-amber-soft" : "border-terminal-border text-terminal-muted hover:border-terminal-muted"}`}>
                {n}%
              </button>
            ))}
          </div>
        </div>
        {/* Symbols */}
        <div>
          <div className="text-[9px] text-terminal-muted uppercase tracking-wider mb-1">Symbols [{selectedSymbols.size}]</div>
          <div className="flex flex-wrap gap-1">
            {availableSymbols.map((sym) => {
              const on = selectedSymbols.has(sym);
              return (
                <button key={sym} onClick={() => toggle(sym)}
                  className={`text-[10px] px-1.5 py-0.5 border font-bold ${on ? "border-amber text-amber bg-amber-soft" : "border-terminal-border text-terminal-muted/50 hover:text-terminal-muted"}`}>
                  {sym.replace("/USDT", "")}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onConfirm(parseFloat(capital) || defaultCapital, parseFloat(riskPct) || defaultRisk, Array.from(selectedSymbols))}
          disabled={selectedSymbols.size === 0}
          className="flex-1 terminal-btn-primary py-2 text-[10px] font-bold uppercase tracking-wider disabled:opacity-30">
          Execute
        </button>
        <button onClick={() => onConfirm(defaultCapital, defaultRisk, defaultSymbols)}
          className="terminal-btn py-2 px-4 text-[10px] font-bold uppercase tracking-wider">
          Default
        </button>
      </div>
    </div>
  );
}
