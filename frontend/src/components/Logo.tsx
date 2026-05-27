export default function Logo() {
  const lines = [
    " _____ ____      _    ____  _____ __  __ ___ _   _ ____  ",
    "|_   _|  _ \\    / \\  |  _ \\| ____|  \\/  |_ _| \\ | |  _ \\ ",
    "  | | | |_) |  / _ \\ | | | |  _| | |\\/| || ||  \\| | | | |",
    "  | | |  _ <  / ___ \\| |_| | |___| |  | || || |\\  | |_| |",
    "  |_| |_| \\_\\/_/   \\_\\____/|_____|_|  |_|___|_| \\_|____/ ",
  ];

  return (
    <div className="text-center mb-4">
      <pre className="text-amber text-[7px] leading-none select-none inline-block"
        style={{ lineHeight: 1.15, fontFamily: "'JetBrains Mono', monospace" }}>
        {lines.join("\n")}
      </pre>
      <p className="text-amber text-[12px] uppercase tracking-[0.3em] font-bold mb-1 mt-1">TradeMind</p>
      <p className="text-terminal-muted text-[10px]">AI Strategy Workstation v2.0</p>
      <p className="text-terminal-muted text-[10px] mt-1">Enter strategy → AI generates → Backtest → Deep Analysis</p>
      <p className="text-terminal-muted text-[10px]">Walk-Forward • Monte Carlo • Parameter Stability</p>
    </div>
  );
}
