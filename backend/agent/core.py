from .parser import extract_strategy_params
from .generator import generate_strategy
from .analyzer import analyze_results, suggest_optimization
from backtest.engine import run_backtest, run_backtest_multi


def run_agent_loop(user_message: str) -> dict:
    """Execute the full agent loop: generate → backtest (multi-symbol) → analyze."""
    result = {
        "steps": [],
        "final_code": "",
        "final_metrics": {},
        "multi_results": [],
        "optimization_suggestion": "",
    }

    # Step 1: Generate initial strategy
    code, _ = generate_strategy(user_message)
    params = extract_strategy_params(user_message)

    result["steps"].append({
        "type": "generation",
        "code": code,
        "message": f"AI 已生成 {params['symbol']} 交易策略，包含指標: {', '.join(params['indicators']) if params['indicators'] else 'RSI/SMA'}"
    })

    # Step 2: Multi-symbol backtest
    multi = run_backtest_multi(code, ["BTC/USDT", "ETH/USDT", "SOL/USDT"], params["timeframe"])
    result["multi_results"] = multi

    for r in multi:
        if "error" in r:
            continue
        m = r["metrics"]
        result["steps"].append({
            "type": "backtest",
            "symbol": r["symbol"],
            "metrics": m,
            "equity_curve": r["equity_curve"],
            "benchmark_curve": r.get("benchmark_curve", []),
            "dates": r["dates"],
            "total_trades": r["total_trades"],
            "message": f"{r['symbol']} 回测: {m['total_return_pct']}% 收益, {r['total_trades']} 笔交易, Sharpe {m['sharpe_ratio']}"
        })

    # Use BTC for primary metrics
    primary = multi[0] if multi else {}
    result["final_code"] = code
    result["final_metrics"] = primary.get("metrics", {})

    # Step 3: Analyze primary result
    if primary and "metrics" in primary:
        analysis = analyze_results(primary["metrics"], code)
        result["steps"].append({"type": "analysis", "message": analysis})
        result["optimization_suggestion"] = analysis

    return result


def run_optimization_loop(previous_code: str, metrics: dict, user_feedback: str) -> dict:
    """Run optimization: regenerate code based on feedback, then multi-symbol backtest."""
    optimized_code = suggest_optimization(metrics, previous_code, user_feedback)

    multi = run_backtest_multi(optimized_code, ["BTC/USDT", "ETH/USDT", "SOL/USDT"])
    primary = multi[0] if multi else {}
    new_metrics = primary.get("metrics", {})

    improvement = ""
    old_sharpe = metrics.get("sharpe_ratio", 0) if metrics else 0
    new_sharpe = new_metrics.get("sharpe_ratio", 0) if new_metrics else 0
    if old_sharpe and new_sharpe:
        delta = new_sharpe - old_sharpe
        improvement = f"Sharpe {'+' if delta >= 0 else ''}{delta:.2f}"

    return {
        "code": optimized_code,
        "metrics": new_metrics,
        "multi_results": multi,
        "improvement": improvement,
        "message": f"优化后 BTC: {new_metrics.get('total_return_pct', 0)}% 收益, {new_metrics.get('sharpe_ratio', 0)} Sharpe"
    }
