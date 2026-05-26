"""Verify agent modules import correctly."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from agent.parser import extract_code_block, extract_strategy_params
from agent.generator import generate_strategy
from agent.analyzer import analyze_results, suggest_optimization
from agent.core import run_agent_loop, run_optimization_loop

# Test parser
assert extract_code_block("""```python
print('hi')
```""") == "print('hi')"
assert extract_code_block("no code block") == "no code block"
params = extract_strategy_params("Buy ETH when RSI is below 30 with stop loss")
assert params["symbol"] == "ETH/USDT"
assert params["has_stop_loss"] == True
assert "rsi" in params["indicators"]
print("PASS: parser")

print("All import tests passed!")
