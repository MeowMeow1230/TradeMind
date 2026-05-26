import pandas as pd
import numpy as np
from .data import fetch_ohlcv
from .metrics import compute_metrics


def run_backtest(code: str, symbol: str = "BTC/USDT", timeframe: str = "1h", days: int = 180) -> dict:
    """Execute user's strategy code and return results."""
    df = fetch_ohlcv(symbol, timeframe, days)

    safe_globals = {"pd": pd, "np": np, "df": df}
    exec(code, safe_globals)

    signals = safe_globals.get("signals")
    if signals is None:
        raise ValueError(
            "Strategy code must define a `signals` DataFrame with columns: signal"
        )

    if not isinstance(signals, pd.DataFrame) or "signal" not in signals.columns:
        raise ValueError(
            "signals must be a DataFrame with 'signal' column (1=buy, -1=sell, 0=hold)"
        )

    initial_capital = 10000.0
    equity = np.full(len(df), initial_capital, dtype=float)
    position = 0.0
    cash = initial_capital

    close = df["close"].values
    signal = signals["signal"].values

    for i in range(1, len(equity)):
        if signal[i] == 1 and position == 0:
            position = cash / close[i]
            cash = 0.0
        elif signal[i] == -1 and position > 0:
            cash = position * close[i]
            position = 0.0
        equity[i] = cash + position * close[i]

    metrics = compute_metrics(equity)
    equity_list = equity.tolist()

    # Benchmark: buy and hold
    benchmark = (close / close[0]) * initial_capital

    return {
        "metrics": metrics,
        "equity_curve": equity_list[:: max(1, len(equity_list) // 200)],
        "benchmark_curve": benchmark[:: max(1, len(benchmark) // 200)].tolist(),
        "dates": [str(d) for d in df.index[:: max(1, len(df) // 200)]],
        "total_trades": int(np.sum(np.abs(np.diff(signal)) > 0) // 2),
    }
