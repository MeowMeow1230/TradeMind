"""
Walk-Forward Analysis — the gold standard for validating trading strategies.

Splits historical data into rolling windows. For each window:
1. In-Sample (IS): grid-search parameter combinations, pick best
2. Out-of-Sample (OOS): test best parameters on unseen data

Compares IS vs OOS performance to detect overfitting.
"""
import re
import numpy as np
import pandas as pd
from backtest.data import fetch_ohlcv
from backtest.engine import run_backtest


PARAM_GRID = {
    "rolling_period": {
        "pattern": r"\.rolling\((\d+)\)",
        "values": [5, 10, 14, 20, 30, 50],
    },
    "rsi_period": {
        "pattern": r"rsi(?:_period)?\s*=\s*(\d+)",
        "values": [7, 10, 14, 21],
    },
    "sma_period": {
        "pattern": r"sma(?:_period)?\s*=\s*(\d+)",
        "values": [10, 20, 30, 50],
    },
    "stop_pct": {
        "pattern": r"(?:stop_loss|stop)(?:_pct)?\s*=\s*(0\.\d+)",
        "values": [0.03, 0.05, 0.08, 0.10],
    },
}


def _replace_param(code: str, pattern: str, new_value: str) -> str:
    """Replace the first matching parameter in code with a new value."""
    return re.sub(
        pattern,
        lambda m: m.group(0).replace(m.group(1), new_value),
        code,
        count=1,
    )


def _grid_search_on_df(code: str, df: pd.DataFrame, symbol: str) -> tuple[str, dict]:
    """Grid search on a pre-sliced DataFrame. Returns (best_code, best_metrics)."""
    best_code = code
    best_score = -999.0
    best_metrics = {}

    for param_name, config in PARAM_GRID.items():
        match = re.search(config["pattern"], code)
        if not match:
            continue
        original_value = match.group(1)

        for test_value in config["values"]:
            test_value_str = str(test_value)
            if test_value_str == original_value:
                continue

            modified_code = _replace_param(code, config["pattern"], test_value_str)
            try:
                result = run_backtest(modified_code, symbol, df_override=df)
                metrics = result["metrics"]
                score = metrics.get("sharpe_ratio", 0) + metrics.get("total_return_pct", 0) * 0.1
                if score > best_score:
                    best_score = score
                    best_code = modified_code
                    best_metrics = metrics
            except Exception:
                continue

        break  # Only optimize first found parameter for MVP speed

    return best_code, best_metrics


def run_walk_forward(
    code: str,
    symbol: str = "BTC/USDT",
    timeframe: str = "15m",
    total_days: int = 180,
    n_windows: int = 3,
) -> dict:
    """
    Walk-forward analysis with proper time-series ordering.

    Pre-fetches the full dataset, then for each rolling window:
    - IS period (first 60%): grid search parameters
    - OOS period (last 40%): test best parameters
    """
    full_df = fetch_ohlcv(symbol, timeframe, total_days)
    window_size = len(full_df) // n_windows
    is_ratio = 0.6

    results = []
    is_metrics_all = []
    oos_metrics_all = []

    for w in range(n_windows - 1):
        # Slice data for this window
        w_start = w * window_size
        w_end = min(w_start + window_size, len(full_df))
        is_end = w_start + int(window_size * is_ratio)

        is_df = full_df.iloc[w_start:is_end]
        oos_df = full_df.iloc[is_end:w_end]

        if len(is_df) < 50 or len(oos_df) < 30:
            continue

        # Optimize on IS
        best_code, is_metrics = _grid_search_on_df(code, is_df, symbol)

        # Test on OOS with best parameters
        oos_result = run_backtest(best_code, symbol, df_override=oos_df)
        oos_metrics = oos_result["metrics"]

        is_metrics_all.append(is_metrics)
        oos_metrics_all.append(oos_metrics)

        results.append({
            "window": w + 1,
            "is_dates": f"{is_df.index[0]} → {is_df.index[-1]}",
            "oos_dates": f"{oos_df.index[0]} → {oos_df.index[-1]}",
            "is_return": is_metrics.get("total_return_pct", 0),
            "oos_return": oos_metrics.get("total_return_pct", 0),
            "is_sharpe": is_metrics.get("sharpe_ratio", 0),
            "oos_sharpe": oos_metrics.get("sharpe_ratio", 0),
            "is_win_rate": is_metrics.get("win_rate_pct", 0),
            "oos_win_rate": oos_metrics.get("win_rate_pct", 0),
            "is_drawdown": is_metrics.get("max_drawdown_pct", 0),
            "oos_drawdown": oos_metrics.get("max_drawdown_pct", 0),
        })

    if not results:
        return {
            "windows": [],
            "avg_is_return": 0,
            "avg_oos_return": 0,
            "avg_is_sharpe": 0,
            "avg_oos_sharpe": 0,
            "wfe": None,
            "stability": "Insufficient data for walk-forward analysis",
            "overfit_signals": [],
            "n_windows": n_windows,
        }

    is_returns = [r["is_return"] for r in results]
    oos_returns = [r["oos_return"] for r in results]

    avg_is_return = float(np.mean(is_returns))
    avg_oos_return = float(np.mean(oos_returns))
    avg_is_sharpe = float(np.mean([r["is_sharpe"] for r in results]))
    avg_oos_sharpe = float(np.mean([r["oos_sharpe"] for r in results]))

    wfe = abs(avg_oos_return / avg_is_return) if abs(avg_is_return) > 0.1 else None

    overfit_signals = []
    if wfe is not None and wfe < 0.3:
        overfit_signals.append(f"WFE = {wfe:.2f} — severe OOS decay, likely overfit")
    elif wfe is not None and wfe < 0.7:
        overfit_signals.append(f"WFE = {wfe:.2f} — moderate OOS decay, review parameters")
    if avg_oos_sharpe < avg_is_sharpe * 0.5:
        overfit_signals.append(f"OOS Sharpe ({avg_oos_sharpe:.2f}) falls below 50% of IS ({avg_is_sharpe:.2f})")
    if len(oos_returns) >= 2 and all(r1 > r2 for r1, r2 in zip(oos_returns, oos_returns[1:])):
        overfit_signals.append("Declining OOS performance across windows")

    stability = "Stable — strategy generalizes well" if not overfit_signals else "Unstable — evidence of overfitting"

    return {
        "windows": results,
        "avg_is_return": round(avg_is_return, 2),
        "avg_oos_return": round(avg_oos_return, 2),
        "avg_is_sharpe": round(avg_is_sharpe, 2),
        "avg_oos_sharpe": round(avg_oos_sharpe, 2),
        "wfe": round(wfe, 2) if wfe is not None else None,
        "stability": stability,
        "overfit_signals": overfit_signals,
        "n_windows": n_windows,
    }
