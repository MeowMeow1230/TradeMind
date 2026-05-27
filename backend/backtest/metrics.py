import numpy as np


def compute_metrics(
    equity_curve: np.ndarray,
    signals: np.ndarray | None = None,
    risk_free_rate: float = 0.02,
) -> dict:
    returns = np.diff(equity_curve) / equity_curve[:-1]
    total_return = (equity_curve[-1] / equity_curve[0] - 1) * 100

    # No trades or equity unchanged
    if len(returns) == 0 or abs(total_return) < 0.001:
        return {
            "total_return_pct": 0.0,
            "sharpe_ratio": 0.0,
            "sortino_ratio": 0.0,
            "calmar_ratio": 0.0,
            "max_drawdown_pct": 0.0,
            "max_drawdown_duration": 0,
            "win_rate_pct": 0.0,
            "profit_factor": 0.0,
            "max_consecutive_losses": 0,
        }

    # Core metrics
    excess = returns - risk_free_rate / (365 * 24)
    sharpe = (
        float(np.mean(excess) / np.std(excess) * np.sqrt(365 * 24))
        if np.std(excess) > 0
        else 0.0
    )

    # Sortino: downside deviation only
    downside = returns[returns < 0]
    downside_std = np.std(downside) if len(downside) > 0 else 0.0
    sortino = (
        float(np.mean(excess) / downside_std * np.sqrt(365 * 24))
        if downside_std > 0
        else 0.0
    )

    # Drawdown analysis
    peak = np.maximum.accumulate(equity_curve)
    drawdown = (peak - equity_curve) / peak
    max_drawdown = float(np.max(drawdown)) * 100

    # Max drawdown duration (in candles)
    in_drawdown = drawdown > 0.001
    max_dd_duration = 0
    current_duration = 0
    for x in in_drawdown:
        if x:
            current_duration += 1
            max_dd_duration = max(max_dd_duration, current_duration)
        else:
            current_duration = 0

    # Calmar: annualized return / max drawdown
    annualized_return = (1 + total_return / 100) ** (365 * 24 / len(equity_curve)) - 1
    calmar = (
        float(annualized_return / (max_drawdown / 100))
        if max_drawdown > 0
        else 0.0
    )

    # Win rate & profit factor
    wins = returns[returns > 0]
    losses = returns[returns < 0]
    win_rate = len(wins) / len(returns) * 100 if len(returns) > 0 else 0.0
    gross_profit = np.sum(wins) if len(wins) > 0 else 0.0
    gross_loss = abs(np.sum(losses)) if len(losses) > 0 else 1.0
    profit_factor = float(gross_profit / gross_loss) if gross_loss > 0 else 0.0

    # Max consecutive losses from trade returns
    max_consec_losses = 0
    current_streak = 0
    for r in returns:
        if r < 0:
            current_streak += 1
            max_consec_losses = max(max_consec_losses, current_streak)
        elif r > 0:
            current_streak = 0
    # Also detect from signals if provided
    # TODO: post-hackathon - compute consecutive loss streak from trade-level PnL, not candle-level

    return {
        "total_return_pct": round(total_return, 2),
        "sharpe_ratio": round(sharpe, 2),
        "sortino_ratio": round(sortino, 2),
        "calmar_ratio": round(calmar, 2),
        "max_drawdown_pct": round(max_drawdown, 2),
        "max_drawdown_duration": max_dd_duration,
        "win_rate_pct": round(win_rate, 2),
        "profit_factor": round(profit_factor, 2),
        "max_consecutive_losses": max_consec_losses,
    }


def compute_trade_level_metrics(trades: list[dict], initial_capital: float = 10000.0) -> dict:
    """Compute per-trade statistics from individual trade records.
    Each trade: {"entry_idx": int, "exit_idx": int, "entry_price": float, "exit_price": float, "pnl": float, "pnl_pct": float}
    TODO: post-hackathon - extract actual trades from engine instead of estimating from returns
    """
    if not trades:
        return {
            "total_trades": 0,
            "avg_win_pct": 0.0,
            "avg_loss_pct": 0.0,
            "largest_win_pct": 0.0,
            "largest_loss_pct": 0.0,
            "avg_hold_bars": 0,
            "expectancy": 0.0,
        }

    pnls = [t["pnl_pct"] for t in trades]
    wins = [t for t in trades if t["pnl"] > 0]
    losses = [t for t in trades if t["pnl"] < 0]

    avg_win = np.mean([t["pnl_pct"] for t in wins]) if wins else 0.0
    avg_loss = abs(np.mean([t["pnl_pct"] for t in losses])) if losses else 0.0
    win_pct = len(wins) / len(trades) if trades else 0.0
    expectancy = win_pct * avg_win - (1 - win_pct) * avg_loss

    return {
        "total_trades": len(trades),
        "avg_win_pct": round(avg_win, 2),
        "avg_loss_pct": round(avg_loss, 2),
        "largest_win_pct": round(max(pnls), 2) if pnls else 0.0,
        "largest_loss_pct": round(min(pnls), 2) if pnls else 0.0,
        "avg_hold_bars": int(np.mean([t.get("exit_idx", 0) - t.get("entry_idx", 0) for t in trades])) if trades else 0,
        "expectancy": round(expectancy, 2),
    }
