import numpy as np


def compute_metrics(equity_curve: np.ndarray, risk_free_rate: float = 0.02) -> dict:
    """Compute standard backtest metrics from equity curve."""
    returns = np.diff(equity_curve) / equity_curve[:-1]
    total_return = (equity_curve[-1] / equity_curve[0] - 1) * 100

    # No trades: equity never changed
    if len(returns) == 0 or abs(total_return) < 0.001:
        return {
            "total_return_pct": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown_pct": 0.0,
            "win_rate_pct": 0.0,
            "profit_factor": 0.0,
        }

    total_return = (equity_curve[-1] / equity_curve[0] - 1) * 100
    excess = returns - risk_free_rate / (365 * 24)
    sharpe = (
        float(np.mean(excess) / np.std(excess) * np.sqrt(365 * 24))
        if np.std(excess) > 0
        else 0
    )

    peak = np.maximum.accumulate(equity_curve)
    drawdown = (peak - equity_curve) / peak * 100
    max_drawdown = float(np.max(drawdown))

    wins = returns[returns > 0]
    losses = returns[returns < 0]
    win_rate = len(wins) / len(returns) * 100 if len(returns) > 0 else 0

    gross_profit = np.sum(returns[returns > 0]) if len(wins) > 0 else 0
    gross_loss = abs(np.sum(returns[returns < 0])) if len(losses) > 0 else 1
    profit_factor = float(gross_profit / gross_loss) if gross_loss > 0 else 0

    return {
        "total_return_pct": round(total_return, 2),
        "sharpe_ratio": round(sharpe, 2),
        "max_drawdown_pct": round(max_drawdown, 2),
        "win_rate_pct": round(win_rate, 2),
        "profit_factor": round(profit_factor, 2),
    }
