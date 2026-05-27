from .parser import extract_strategy_params
from .generator import generate_strategy
from .analyzer import analyze_results, suggest_optimization
from backtest.engine import run_backtest, run_backtest_multi
from analysis.walk_forward import run_walk_forward
from analysis.monte_carlo import run_monte_carlo
from analysis.parameter_heatmap import run_parameter_heatmap


def run_agent_loop(user_message: str, capital: float = 10000.0, risk_pct: float = 2.0, symbols: list[str] | None = None) -> dict:
    """Execute the full agent loop: generate -> backtest (multi-symbol) -> analyze."""
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
        "message": f"Strategy generated for {params['symbol']} — indicators: {', '.join(params['indicators']) if params['indicators'] else 'RSI/SMA/EMA'}"
    })

    # Step 2: Multi-symbol backtest
    multi = run_backtest_multi(code, symbols if symbols else ["BTC/USDT", "ETH/USDT", "SOL/USDT"], params["timeframe"], capital=capital, risk_pct=risk_pct)
    result["multi_results"] = multi

    all_errors = []
    for r in multi:
        if "error" in r:
            all_errors.append(f"{r['symbol']}: {r['error']}")
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
            "message": f"{r['symbol']} backtest: {m['total_return_pct']}% return, {r['total_trades']} trades, Sharpe {m['sharpe_ratio']}"
        })

    # If ALL backtests failed, report the error
    if all_errors and not result["steps"][1:]:  # only generation step exists
        error_msg = "Code error — all symbols failed: " + "; ".join(all_errors[:2])
        result["steps"].append({"type": "analysis", "message": error_msg})
        result["final_code"] = code
        result["final_metrics"] = {}
        result["optimization_suggestion"] = error_msg
        return result

    # Use first successful result for primary metrics
    primary = next((r for r in multi if "error" not in r), {})
    result["final_code"] = code
    result["final_metrics"] = primary.get("metrics", {})

    # Step 3: Deep analysis of primary result
    if primary and "metrics" in primary:
        analysis = analyze_results(
            metrics=primary["metrics"],
            code=code,
            equity_curve=primary.get("equity_curve"),
            dates=primary.get("dates"),
        )
        result["steps"].append({"type": "analysis", "message": analysis})
        result["optimization_suggestion"] = analysis

    # Steps 4-6: Run WF, MC, Heatmap in parallel
    from concurrent.futures import ThreadPoolExecutor, as_completed
    sym = params["symbol"]
    tf = params["timeframe"]

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(run_walk_forward, code, sym, tf): "walk_forward",
            executor.submit(run_monte_carlo, code, sym, tf): "monte_carlo",
            executor.submit(run_parameter_heatmap, code, sym, tf): "param_heatmap",
        }
        for future in as_completed(futures):
            key = futures[future]
            try:
                result[key] = future.result()
            except Exception:
                result[key] = None

    return result


def run_optimization_loop(previous_code: str, metrics: dict, user_feedback: str, symbols: list[str] | None = None) -> dict:
    """Run optimization with full analysis — mirrors run_agent_loop output."""
    result = {
        "steps": [],
        "final_code": previous_code,
        "final_metrics": metrics,
        "multi_results": [],
        "optimization_suggestion": "",
    }

    old_sharpe = metrics.get("sharpe_ratio", 0) if metrics else 0

    # Step 1: Generate optimized code
    optimized_code = suggest_optimization(metrics, previous_code, user_feedback)
    result["steps"].append({
        "type": "optimization",
        "code": optimized_code,
        "message": f"Strategy optimized based on your feedback",
    })

    # Step 2: Multi-symbol backtest on optimized code
    multi = run_backtest_multi(optimized_code, symbols or ["BTC/USDT", "ETH/USDT", "SOL/USDT"])
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
            "message": f"{r['symbol']} backtest: {m['total_return_pct']}% return, {r['total_trades']} trades, Sharpe {m['sharpe_ratio']}"
        })

    primary = multi[0] if multi else {}
    new_metrics = primary.get("metrics", {})
    new_sharpe = new_metrics.get("sharpe_ratio", 0) if new_metrics else 0
    result["final_code"] = optimized_code
    result["final_metrics"] = new_metrics

    # Improvement summary
    delta = new_sharpe - old_sharpe
    result["improvement"] = f"Sharpe {old_sharpe} → {new_sharpe} ({'+' if delta >= 0 else ''}{delta:.2f})"

    # Step 3: Deep analysis
    if primary and "metrics" in primary:
        analysis = analyze_results(
            metrics=new_metrics,
            code=optimized_code,
            equity_curve=primary.get("equity_curve"),
            dates=primary.get("dates"),
        )
        result["steps"].append({"type": "analysis", "message": analysis})
        result["optimization_suggestion"] = analysis

    # Steps 4-6: WF, MC, HM in parallel
    from concurrent.futures import ThreadPoolExecutor, as_completed
    sym = "BTC/USDT"
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(run_walk_forward, optimized_code, sym, "15m"): "walk_forward",
            executor.submit(run_monte_carlo, optimized_code, sym, "15m"): "monte_carlo",
            executor.submit(run_parameter_heatmap, optimized_code, sym, "15m"): "param_heatmap",
        }
        for future in as_completed(futures):
            key = futures[future]
            try:
                result[key] = future.result()
            except Exception:
                result[key] = None

    return result
