"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type Lang = "en" | "zh";

const zh: Record<string, string> = {
  "header.title": "TRADEMIND — AI 策略工作站",
  "header.flow": "NLP → 代碼 → 回測 → 分析",
  "header.new": "[ 新建 ]",
  "preset.load": "載入：",
  "preset.sma": "SMA 交叉",
  "preset.rsi": "RSI 反轉",
  "preset.macd": "MACD",
  "preset.bb": "布林擠壓",
  "empty.subtitle": "AI 策略工作站 v2.0",
  "empty.desc": "描述策略 → AI 生成代碼 → 回測 → 深度分析",
  "empty.features": "Walk-Forward · Monte Carlo · 參數穩定性",
  "input.placeholder": "描述你的交易策略...（例如：當 RSI < 30 且收盤 > 20 SMA 時買入 BTC）",
  "input.execute": "執行",
  "loading.gen": "生成代碼中...",
  "loading.test": "回測執行中...",
  "loading.analyze": "分析中...",
  "loading.process": "處理中...",
  "status.ready": "就緒",
  "status.strategy": "策略：",
  "sizing.title": "設定",
  "sizing.account": "帳戶",
  "sizing.risk": "風險/筆",
  "sizing.symbols": "幣種",
  "sizing.execute": "執行",
  "sizing.default": "預設",
  "chat.user": "用戶>",
  "chat.sys": "系統>",
  "chat.viewCode": "[+] 查看代碼",
  "sidebar.results": "結果",
  "sidebar.code": "策略代碼",
  "sidebar.backtest": "回測",
  "sidebar.multi": "多幣種",
  "sidebar.analysis": "AI 分析",
  "sidebar.wf": "Walk-Forward",
  "sidebar.mc": "Monte Carlo",
  "sidebar.hm": "參數穩定性",
  "export.download": "下載 .PY",
  "export.deploy": "部署到 Mantle",
  "export.deploying": "部署中...",
  "export.deployed": "已部署",
  "analysis.quick": "快速診斷",
  "analysis.weakest": "最弱指標",
  "analysis.overfit": "過擬合評估",
  "analysis.stability": "參數穩定性",
  "analysis.drawdown": "回撤分析",
  "analysis.capital": "資金管理",
  "analysis.improve": "具體改進",
  "wf.title": "Walk-Forward",
  "wf.desc": "在未見過的數據上測試策略。若 OOS 遠差於 IS，策略過擬合。",
  "wf.wfe": "WFE",
  "wf.is_ret": "IS 報酬",
  "wf.oos_ret": "OOS 報酬",
  "wf.is_shp": "IS Sharpe",
  "wf.oos_shp": "OOS Sharpe",
  "mc.title": "Monte Carlo 模擬",
  "mc.desc": "1000 次 Bootstrap 重抽樣。若真實結果在隨機範圍內，策略無優勢。",
  "mc.actual": "真實",
  "mc.median": "中位數",
  "mc.pvalue": "P 值",
  "hm.title": "參數穩定性",
  "hm.desc": "Sharpe 如何隨參數變化。平滑 = 穩定，鋸齒 = 脆弱。",
  "hm.best": "最佳組合",
  "tools.return": "總報酬%。正 = 賺錢。",
  "tools.sharpe": "風險調整後報酬。>1 好，>2 優秀。",
  "tools.sortino": "只計下跌風險的 Sharpe。",
  "tools.calmar": "報酬÷最大回撤。衡量復原效率。",
  "tools.dd": "最大峰谷跌幅。>20% 危險。",
  "tools.winrate": "勝率%。低勝率需高賠率。",
  "tools.pf": "總利潤÷總虧損。>1.5 好。",
  "tools.cost": "點差+滑點+手續費。",
  "tools.wfe": "OOS ÷ IS 報酬。>0.7 好。<0.3 = 過擬合。",
  "tools.pval": "隨機性機率。<0.05 顯著。",
};

const en: Record<string, string> = {
  "header.title": "TRADEMIND — AI STRATEGY WORKSTATION",
  "header.flow": "NLP → CODE → BACKTEST → ANALYZE",
  "header.new": "[ NEW ]",
  "preset.load": "Load:",
  "preset.sma": "SMA CROSS",
  "preset.rsi": "RSI REV",
  "preset.macd": "MACD",
  "preset.bb": "BB SQUEEZE",
  "empty.subtitle": "AI Strategy Workstation v2.0",
  "empty.desc": "Describe strategy → AI generates code → Backtest → Deep Analysis",
  "empty.features": "Walk-Forward · Monte Carlo · Parameter Stability",
  "input.placeholder": "Describe your trading strategy... (e.g. Buy BTC when RSI < 30 and close > 20 SMA)",
  "input.execute": "EXECUTE",
  "loading.gen": "Generating Code...",
  "loading.test": "Running Backtest...",
  "loading.analyze": "Analyzing...",
  "loading.process": "Processing...",
  "status.ready": "READY",
  "status.strategy": "STRATEGY: ",
  "sizing.title": "CONFIGURATION",
  "sizing.account": "ACCOUNT",
  "sizing.risk": "RISK/TRADE",
  "sizing.symbols": "SYMBOLS",
  "sizing.execute": "EXECUTE",
  "sizing.default": "DEFAULT",
  "chat.user": "USER>",
  "chat.sys": "SYS>",
  "chat.viewCode": "[+] VIEW CODE",
  "sidebar.results": "RESULTS",
  "sidebar.code": "STRATEGY CODE",
  "sidebar.backtest": "BACKTEST",
  "sidebar.multi": "MULTI-SYMBOL",
  "sidebar.analysis": "AI ANALYSIS",
  "sidebar.wf": "WALK-FORWARD",
  "sidebar.mc": "MONTE CARLO",
  "sidebar.hm": "PARAMETER STABILITY",
  "export.download": "DOWNLOAD .PY",
  "export.deploy": "DEPLOY TO MANTLE",
  "export.deploying": "DEPLOYING...",
  "export.deployed": "DEPLOYED",
  "analysis.quick": "Quick Diagnosis",
  "analysis.weakest": "Weakest Metric",
  "analysis.overfit": "Overfitting Assessment",
  "analysis.stability": "Parameter Stability",
  "analysis.drawdown": "Drawdown Analysis",
  "analysis.capital": "Capital Management",
  "analysis.improve": "One Concrete Improvement",
  "wf.title": "Walk-Forward",
  "wf.desc": "Tests strategy on data it has NEVER seen. If OOS is much worse, the strategy is overfit.",
  "wf.wfe": "WFE",
  "wf.is_ret": "IS Return",
  "wf.oos_ret": "OOS Return",
  "wf.is_shp": "IS Sharpe",
  "wf.oos_shp": "OOS Sharpe",
  "mc.title": "Monte Carlo",
  "mc.desc": "Resamples trade returns 1000x. If actual result is within random range, strategy has no edge.",
  "mc.actual": "Actual",
  "mc.median": "Median",
  "mc.pvalue": "P-value",
  "hm.title": "Parameter Stability",
  "hm.desc": "How Sharpe changes with parameter values. Smooth = stable, jagged = fragile.",
  "hm.best": "Best Combo",
  "tools.return": "Total % gain/loss. Positive = profit.",
  "tools.sharpe": "Risk-adjusted return. >1 good, >2 excellent.",
  "tools.sortino": "Like Sharpe but only counts downside risk.",
  "tools.calmar": "Return / max drawdown. Recovery efficiency.",
  "tools.dd": "Max peak-to-trough drop. >20% is risky.",
  "tools.winrate": "% of winning trades. Low WR needs high RR.",
  "tools.pf": "Gross profit / gross loss. >1.5 is good.",
  "tools.cost": "Spread + slippage + commission.",
  "tools.wfe": "OOS return / IS return. >0.7 good. <0.3 = overfit.",
  "tools.pval": "Probability from luck. <0.05 significant.",
};

const translations: Record<Lang, Record<string, string>> = { en, zh };

interface LangContextType {
  lang: Lang;
  t: (key: string) => string;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextType>({
  lang: "zh",
  t: (k) => en[k] || k,
  toggleLang: () => {},
});

export function useT() {
  const ctx = useContext(LangContext);
  return { t: ctx.t, lang: ctx.lang, toggleLang: ctx.toggleLang };
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");
  const t = (key: string) => translations[lang][key] || key;
  const toggleLang = () => setLang((l) => (l === "zh" ? "en" : "zh"));
  return (
    <LangContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}
