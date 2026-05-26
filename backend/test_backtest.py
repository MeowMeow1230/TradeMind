from backtest.engine import run_backtest

test_code = """
import pandas as pd
import numpy as np

signals = pd.DataFrame(index=df.index)
signals["signal"] = 0

# Cross of close over its rolling mean (simple demo strategy)
sma = df["close"].rolling(20).mean()
signals.loc[df["close"] > sma, "signal"] = 1
signals.loc[df["close"] < sma, "signal"] = -1

signals["signal"] = signals["signal"].fillna(0)
"""

result = run_backtest(test_code, symbol="BTC/USDT", timeframe="1h", days=30)
print("Metrics:", result["metrics"])
print("Trades:", result["total_trades"])
assert len(result["equity_curve"]) > 0
assert result["metrics"]["total_return_pct"] is not None
print("PASS")
