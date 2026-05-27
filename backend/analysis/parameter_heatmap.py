"""
Parameter Stability Heatmap — grid search across parameter combinations.

Varies key numeric parameters (rolling periods, thresholds) and records
Sharpe ratio for each combination. A smooth heatmap = stable strategy.
Sharp peaks or cliffs = fragile, overfit parameters.
"""
import re
import numpy as np
import pandas as pd
from backtest.data import fetch_ohlcv
from backtest.engine import run_backtest


def _extract_rolling_params(code: str) -> list[dict]:
    """Find all .rolling(N) calls in the strategy code. Returns [{name, current_value}].
    TODO: post-hackathon — AST-based extraction for robustness
    """
    matches = re.findall(r"\.rolling\((\d+)\)", code)
    seen = set()
    params = []
    for i, val in enumerate(matches):
        val_int = int(val)
        if val_int not in seen:
            seen.add(val_int)
            name = f"period_{i + 1}"
            params.append({"name": name, "value": val_int})
    return params[:2]  # Only vary first 2 rolling params for MVP


def run_parameter_heatmap(
    code: str,
    symbol: str = "BTC/USDT",
    timeframe: str = "15m",
    days: int = 180,
    grid_size: int = 6,
    metric: str = "sharpe_ratio",
) -> dict:
    """
    Grid search: vary each rolling parameter across a range, record metric.
    Returns 2D heatmap data for Plotly.
    """
    params = _extract_rolling_params(code)
    if len(params) < 2:
        return {"error": "Need at least 2 rolling() parameters for heatmap", "n_params": len(params)}

    p1, p2 = params[0], params[1]
    p1_range = _param_range(p1["value"], grid_size)
    p2_range = _param_range(p2["value"], grid_size)

    z = np.zeros((grid_size, grid_size))
    x_labels = [str(p) for p in p1_range]
    y_labels = [str(p) for p in p2_range]

    annotations = []
    best_score = -999
    best_combo = (p1["value"], p2["value"])

    for i, v1 in enumerate(p1_range):
        for j, v2 in enumerate(p2_range):
            # Replace parameter values in code
            modified = _replace_nth_rolling(code, 1, v1)
            modified = _replace_nth_rolling(modified, 2, v2)
            try:
                result = run_backtest(modified, symbol, timeframe, days)
                score = result["metrics"].get(metric, 0)
                z[j][i] = score  # y=param2, x=param1
                if score > best_score:
                    best_score = score
                    best_combo = (v1, v2)
                annotations.append({
                    "x": i, "y": j,
                    "text": f"{score:.1f}",
                    "showarrow": False,
                    "font": {"size": 9, "color": "#8b949e"},
                })
            except Exception:
                z[j][i] = 0
                annotations.append({
                    "x": i, "y": j,
                    "text": "err",
                    "showarrow": False,
                    "font": {"size": 8, "color": "#f48771"},
                })

    return {
        "param1_name": f"Param 1 (current: {p1['value']})",
        "param2_name": f"Param 2 (current: {p2['value']})",
        "x_labels": x_labels,
        "y_labels": y_labels,
        "z": z.tolist(),
        "annotations": annotations[:100],  # Limit for frontend
        "best_combo": best_combo,
        "best_score": round(float(best_score), 2),
        "original_score": round(float(z[np.where(np.array(p2_range) == p2["value"])[0][0] if p2["value"] in p2_range else 0][np.where(np.array(p1_range) == p1["value"])[0][0] if p1["value"] in p1_range else 0]), 2) if p1["value"] in p1_range and p2["value"] in p2_range else 0,
        "stability": _assess_stability(z),
        "grid_size": grid_size,
        "metric": metric,
    }


def _param_range(current: int, grid_size: int) -> list[int]:
    """Generate parameter range centered on current value."""
    half = grid_size // 2
    start = max(3, current - half * max(2, current // 10))
    return list(range(start, start + grid_size))


def _replace_nth_rolling(code: str, n: int, new_value: int) -> str:
    """Replace the Nth .rolling(X) occurrence in code."""
    pattern = r"\.rolling\(\d+\)"
    matches = list(re.finditer(pattern, code))
    if n <= len(matches):
        m = matches[n - 1]
        return code[:m.start()] + f".rolling({new_value})" + code[m.end():]
    return code


def _assess_stability(z: np.ndarray) -> str:
    """Assess parameter stability from the heatmap matrix."""
    if z.size < 4:
        return "Insufficient data"
    z_flat = z.flatten()
    z_range = float(np.max(z_flat) - np.min(z_flat))
    z_std = float(np.std(z_flat))
    z_mean = float(np.mean(z_flat))

    if z_range < 0.5 and z_std < 0.2:
        return "Highly stable — parameters have minimal impact"
    elif z_range < 2.0 and z_std < 0.8:
        return "Moderately stable — acceptable parameter sensitivity"
    elif z_range > 5.0:
        return "Fragile — small parameter changes cause large swings"
    else:
        return "Borderline — review parameter selection"
