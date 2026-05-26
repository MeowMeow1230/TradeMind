from .parser import extract_strategy_params
from .generator import generate_strategy
from .analyzer import analyze_results, suggest_optimization
from backtest.engine import run_backtest

def run_agent_loop(user_message: str) -> dict:
    """Execute the full agent loop: generate → backtest → analyze.

    Returns a dict suitable for JSON serialization to the frontend.
    """
    result = {
        "steps": [],
        "final_code": "",
        "final_metrics": {},
        "optimization_suggestion": "",
    }

    # Step 1: Generate initial strategy
    code, _ = generate_strategy(user_message)
    params = extract_strategy_params(user_message)

    result["steps"].append({
        "type": "generation",
        "code": code,
        "message": f"已生成交易策略"
    })

    # Step 2: Backtest
    backtest_result = run_backtest(code, params["symbol"], params["timeframe"])
    metrics = backtest_result["metrics"]

    result["steps"].append({
        "type": "backtest",
        "metrics": metrics,
        "equity_curve": backtest_result["equity_curve"],
        "benchmark_curve": backtest_result.get("benchmark_curve", []),
        "dates": backtest_result["dates"],
        "total_trades": backtest_result["total_trades"],
        "message": f"回测完成：收益 {metrics['total_return_pct']}%，夏普 {metrics['sharpe_ratio']}，最大回撤 {metrics['max_drawdown_pct']}%"
    })

    # Step 3: Analyze
    analysis = analyze_results(metrics, code)
    result["steps"].append({
        "type": "analysis",
        "message": analysis
    })

    result["optimization_suggestion"] = analysis
    result["final_code"] = code
    result["final_metrics"] = metrics

    return result

def run_optimization_loop(previous_code: str, metrics: dict, user_feedback: str) -> dict:
    """Run optimization: regenerate code based on feedback, then backtest."""
    optimized_code = suggest_optimization(metrics, previous_code, user_feedback)

    backtest_result = run_backtest(optimized_code)
    new_metrics = backtest_result["metrics"]

    improvement = ""
    if metrics.get("sharpe_ratio") and new_metrics.get("sharpe_ratio"):
        sharpe_change = new_metrics["sharpe_ratio"] - metrics["sharpe_ratio"]
        improvement = f"夏普比率 {'提升' if sharpe_change >= 0 else '下降'} {abs(sharpe_change):.2f}"

    return {
        "code": optimized_code,
        "metrics": new_metrics,
        "equity_curve": backtest_result["equity_curve"],
        "benchmark_curve": backtest_result.get("benchmark_curve", []),
        "dates": backtest_result["dates"],
        "total_trades": backtest_result["total_trades"],
        "improvement": improvement,
        "message": f"优化后：收益 {new_metrics['total_return_pct']}%，夏普 {new_metrics['sharpe_ratio']}，最大回撤 {new_metrics['max_drawdown_pct']}%"
    }
