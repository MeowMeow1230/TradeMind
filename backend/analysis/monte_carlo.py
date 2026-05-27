"""
Monte Carlo Simulation — tests if a strategy's performance is statistically significant.

Shuffles the sequence of individual trade returns N times to build a distribution
of possible outcomes. If the actual result is far from random, the strategy has edge.
"""
import numpy as np
import pandas as pd
from backtest.data import fetch_ohlcv


def _extract_trade_returns(code: str, symbol: str, timeframe: str, days: int) -> list[float]:
    """Execute strategy and extract per-trade return percentages."""
    df = fetch_ohlcv(symbol, timeframe, days)
    close = df["close"].values.astype(float)

    safe_globals = {"pd": pd, "np": np, "df": df}
    exec(code, safe_globals)

    signals_df = safe_globals.get("signals")
    if signals_df is None or "signal" not in signals_df.columns:
        return []

    signal = signals_df["signal"].values.astype(int)

    trades = []
    entry_price = 0.0
    in_position = False

    for i in range(len(signal)):
        if signal[i] == 1 and not in_position:
            entry_price = close[i]
            in_position = True
        elif signal[i] == -1 and in_position:
            trade_return = (close[i] / entry_price - 1) * 100
            trades.append(trade_return)
            in_position = False

    # Close any open position at end
    if in_position and entry_price > 0:
        trade_return = (close[-1] / entry_price - 1) * 100
        trades.append(trade_return)

    return trades


def run_monte_carlo(
    code: str,
    symbol: str = "BTC/USDT",
    timeframe: str = "15m",
    days: int = 180,
    n_simulations: int = 1000,
    initial_capital: float = 10000.0,
) -> dict:
    """
    Monte Carlo simulation: shuffle trade order N times, build outcome distribution.

    Returns distribution of final returns and Sharpe ratios, plus the actual result
    for comparison.
    """
    trades = np.array(_extract_trade_returns(code, symbol, timeframe, days))

    if len(trades) < 5:
        return {
            "error": f"Too few trades ({len(trades)}) for meaningful Monte Carlo",
            "n_trades": len(trades),
        }

    # Compute actual metrics from observed trade sequence
    actual_equity = initial_capital
    for tr in trades:
        actual_equity *= (1 + tr / 100)
    actual_final = actual_equity
    actual_total_return = (actual_final / initial_capital - 1) * 100

    # Bootstrap: resample trade returns WITH replacement to build outcome distribution
    sim_returns = []
    sim_sharpes = []
    sim_drawdowns = []
    sim_win_rates = []

    rng = np.random.RandomState(42)
    n = len(trades)

    for _ in range(n_simulations):
        # Bootstrap: sample n trades with replacement
        indices = rng.randint(0, n, size=n)
        sampled = trades[indices]

        equity = initial_capital
        peak = initial_capital
        max_dd = 0.0
        trade_returns = []

        for tr in sampled:
            equity *= (1 + tr / 100)
            trade_returns.append(tr / 100)
            if equity > peak:
                peak = equity
            dd = (peak - equity) / peak * 100
            if dd > max_dd:
                max_dd = dd

        sim_returns.append((equity / initial_capital - 1) * 100)
        sim_drawdowns.append(max_dd)

        rets = np.array(trade_returns)
        if len(rets) > 1 and np.std(rets) > 0:
            sim_sharpes.append(float(np.mean(rets) / np.std(rets) * np.sqrt(len(rets))))
        else:
            sim_sharpes.append(0.0)

        wins = sum(1 for t in sampled if t > 0)
        sim_win_rates.append(wins / n * 100)

    sim_returns = np.array(sim_returns)
    sim_sharpes = np.array(sim_sharpes)
    sim_drawdowns = np.array(sim_drawdowns)

    # Compute percentiles
    p5_return = float(np.percentile(sim_returns, 5))
    p95_return = float(np.percentile(sim_returns, 95))
    p50_return = float(np.percentile(sim_returns, 50))

    # P-value: proportion of simulations that beat the actual return
    p_value = float(np.mean(sim_returns >= actual_total_return))

    # Histogram bins for frontend visualization
    hist, bin_edges = np.histogram(sim_returns, bins=30)
    hist_data = {
        "counts": hist.tolist(),
        "bin_edges": [round(float(b), 2) for b in bin_edges],
    }

    return {
        "n_trades": len(trades),
        "n_simulations": n_simulations,
        "actual_return": round(actual_total_return, 2),
        "actual_sharpe": round(float(np.mean([t / 100 for t in trades]) / np.std([t / 100 for t in trades]) * np.sqrt(len(trades))) if len(trades) > 1 and np.std([t / 100 for t in trades]) > 0 else 0, 2),
        "p50_return": round(p50_return, 2),
        "p5_return": round(p5_return, 2),
        "p95_return": round(p95_return, 2),
        "p_value": round(p_value, 3),
        "mean_return": round(float(np.mean(sim_returns)), 2),
        "std_return": round(float(np.std(sim_returns)), 2),
        "mean_sharpe": round(float(np.mean(sim_sharpes)), 2),
        "mean_drawdown": round(float(np.mean(sim_drawdowns)), 2),
        "histogram": hist_data,
        "is_significant": p_value < 0.05,
        "interpretation": (
            f"Strategy beats {round((1 - p_value) * 100)}% of random trade sequences. "
            + ("This is statistically significant (p < 0.05) — the strategy likely has real edge."
               if p_value < 0.05
               else "Not statistically significant — results could be from luck.")
        ),
    }
