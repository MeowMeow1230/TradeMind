import pandas as pd
import numpy as np
from .data import fetch_ohlcv
from .metrics import compute_metrics

# Trading cost model — calibrated to crypto perpetual futures
# TODO: post-hackathon — make these configurable per strategy
SPREAD_BPS = {
    "BTC/USDT": 1.0,
    "ETH/USDT": 1.5,
    "SOL/USDT": 2.5,
    "BNB/USDT": 2.0,
    "XRP/USDT": 2.5,
    "ADA/USDT": 3.0,
    "DOGE/USDT": 4.0,
    "AVAX/USDT": 3.0,
    "ARB/USDT": 3.0,
    "OP/USDT": 3.0,
    "MATIC/USDT": 3.0,
    "LINK/USDT": 2.5,
}
COMMISSION_BPS = 4.0  # taker fee per side (0.04%)
SLIPPAGE_STD_MULT = 0.05  # slippage = 5% of recent volatility (realistic for small orders)


def _trading_cost(symbol: str, price: float, is_entry: bool) -> float:
    """Total cost to enter or exit a position (in price units)."""
    spread_bps = SPREAD_BPS.get(symbol, 2.0)
    # Spread cost: half-spread on entry, half on exit
    spread_cost = price * (spread_bps / 2) / 10000
    # Commission
    commission = price * COMMISSION_BPS / 10000
    return spread_cost + commission


def _slippage(price_series: np.ndarray, idx: int) -> float:
    """Volatility-based slippage estimate at a given index."""
    if idx < 20:
        return 0.0
    window = price_series[max(0, idx - 20):idx + 1]
    returns = np.diff(window) / window[:-1]
    recent_vol = float(np.std(returns))
    return float(recent_vol * SLIPPAGE_STD_MULT * price_series[idx])


def run_backtest(
    code: str,
    symbol: str = "BTC/USDT",
    timeframe: str = "15m",
    days: int = 180,
    df_override: pd.DataFrame | None = None,
    **kwargs,
) -> dict:
    df = df_override if df_override is not None else fetch_ohlcv(symbol, timeframe, days)
    close = df["close"].values.astype(float)

    safe_globals = {"pd": pd, "np": np, "df": df}
    exec(code, safe_globals)

    signals_df = safe_globals.get("signals")
    if signals_df is None:
        raise ValueError("Strategy code must define a `signals` DataFrame with column: signal")
    if not isinstance(signals_df, pd.DataFrame) or "signal" not in signals_df.columns:
        raise ValueError("signals must be a DataFrame with 'signal' column (1=buy, -1=sell, 0=hold)")

    signal = signals_df["signal"].values.astype(int)

    initial_capital = float(kwargs.get("capital", 10000.0))
    risk_pct = float(kwargs.get("risk_pct", 2.0))

    equity = np.full(len(df), initial_capital, dtype=float)
    position = 0.0
    cash = initial_capital
    total_cost = 0.0

    # Fixed fractional position sizing:
    # risk_amount = capital * risk_pct%
    # position_size = risk_amount / stop_loss_pct (estimated)
    # Default stop loss estimate: 5% if not specified
    default_stop_pct = 5.0
    position_pct = min(risk_pct / default_stop_pct * 100, 100.0)

    for i in range(1, len(equity)):
        price = close[i]
        current_equity = cash + position * price
        if signal[i] == 1 and position == 0:
            entry_cost = _trading_cost(symbol, price, is_entry=True)
            slip = _slippage(close, i)
            effective_price = price + entry_cost + slip

            # Position size = position_pct% of current equity
            alloc = current_equity * position_pct / 100
            position = alloc / effective_price
            cash -= alloc
            total_cost += (entry_cost + slip) * position
        elif signal[i] == -1 and position > 0:
            exit_cost = _trading_cost(symbol, price, is_entry=False)
            slip = _slippage(close, i)
            effective_price = price - exit_cost + slip
            cash += position * effective_price
            total_cost += (exit_cost + abs(slip)) * position
            position = 0.0
        equity[i] = cash + position * price

    metrics = compute_metrics(equity)
    # Attach total trading cost for transparency
    metrics["total_trading_cost"] = round(total_cost, 2)

    # Benchmark: buy and hold
    benchmark = (close / close[0]) * initial_capital

    # Subsample for frontend display (max ~200 points)
    step = max(1, len(equity) // 200)

    return {
        "symbol": symbol,
        "metrics": metrics,
        "equity_curve": equity[::step].tolist(),
        "benchmark_curve": benchmark[::step].tolist(),
        "dates": [str(d) for d in df.index[::step]],
        "total_trades": int(np.sum(np.abs(np.diff(signal)) > 0) // 2),
    }


def run_backtest_multi(
    code: str,
    symbols: list[str] | None = None,
    timeframe: str = "15m",
    days: int = 180,
    **kwargs,
) -> list[dict]:
    if symbols is None:
        symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT"]
    from concurrent.futures import ThreadPoolExecutor, as_completed

    # Pre-fetch all data sequentially (cache-safe)
    for sym in symbols:
        try:
            fetch_ohlcv(sym, timeframe, days)
        except Exception:
            pass

    results = [None] * len(symbols)
    with ThreadPoolExecutor(max_workers=min(len(symbols), 8)) as executor:
        futures = {
            executor.submit(run_backtest, code, sym, timeframe, days, **kwargs): i
            for i, sym in enumerate(symbols)
        }
        for future in as_completed(futures):
            i = futures[future]
            try:
                results[i] = future.result()
            except Exception as e:
                results[i] = {"symbol": symbols[i], "error": str(e)}

    return results
