import { WalkForwardResult } from "@/lib/api";
import Tooltip from "./Tooltip";

export default function WalkForwardCard({ wf }: { wf: WalkForwardResult }) {
  if (!wf?.windows?.length) return null;
  return (
    <div className="terminal-panel p-3">
      <div className="text-[10px] text-terminal-muted uppercase tracking-wider mb-2 font-bold flex items-center">Walk-Forward [{wf.windows.length} windows]<Tooltip text="Tests strategy on data it has NEVER seen. Splits time into windows: train on early data, test on later data. If OOS is much worse, the strategy is overfit." /></div>
      <table className="terminal-table mb-2">
        <thead><tr><th>W</th><th className="text-right">IS Ret</th><th className="text-right">OOS Ret</th><th className="text-right">IS SHP</th><th className="text-right">OOS SHP</th></tr></thead>
        <tbody>
          {wf.windows.map((w) => (
            <tr key={w.window}>
              <td className="text-amber font-bold">{w.window}</td>
              <td className={`text-right ${w.is_return >= 0 ? "text-pnl-green" : "text-pnl-red"}`}>{w.is_return}%</td>
              <td className={`text-right ${w.oos_return >= 0 ? "text-pnl-green" : "text-pnl-red"}`}>{w.oos_return}%</td>
              <td className="text-right">{w.is_sharpe}</td>
              <td className="text-right">{w.oos_sharpe}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {wf.wfe !== null && <div className="text-[10px] text-terminal-muted mb-1 flex items-center">WFE: <span className={wf.wfe >= 0.5 ? "text-pnl-green" : "text-pnl-red"}>{wf.wfe}</span><Tooltip text="Walk-Forward Efficiency: OOS return / IS return. >0.7 means strategy generalizes well. <0.3 = overfit." /></div>}
      <div className={`text-[10px] font-bold uppercase ${wf.overfit_signals.length === 0 ? "text-pnl-green" : "text-pnl-red"}`}>{wf.stability}</div>
    </div>
  );
}
