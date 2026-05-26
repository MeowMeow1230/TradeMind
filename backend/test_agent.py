"""End-to-end test: full agent loop with a real Claude API call."""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from agent.core import run_agent_loop, run_optimization_loop

def test_generate_and_backtest():
    message = "Buy BTC when RSI is below 30 and close price is above 20-period SMA. Stop loss 5%."
    result = run_agent_loop(message)

    assert len(result["steps"]) >= 3, f"Expected 3+ steps, got {len(result['steps'])}"
    assert result["steps"][0]["type"] == "generation"
    assert result["steps"][1]["type"] == "backtest"
    assert result["steps"][2]["type"] == "analysis"

    metrics = result["final_metrics"]
    print(f"  Return: {metrics['total_return_pct']}%, Sharpe: {metrics['sharpe_ratio']}")
    print("  PASS: generate + backtest + analyze")

    return result

def test_optimization_loop(result):
    code = result["final_code"]
    metrics = result["final_metrics"]
    opt = run_optimization_loop(code, metrics, "Add ATR trailing stop to reduce drawdown")

    assert opt["code"] != code, "Optimization should produce different code"
    assert "metrics" in opt
    print(f"  Optimized Sharpe: {opt['metrics']['sharpe_ratio']}")
    print("  PASS: optimization loop")

if __name__ == "__main__":
    print("Testing agent loop...")
    r = test_generate_and_backtest()
    print("Testing optimization loop...")
    test_optimization_loop(r)
    print("\nAll integration tests passed!")
