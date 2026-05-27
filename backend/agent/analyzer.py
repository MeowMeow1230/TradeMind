import os
from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI
from knowledge.system_prompt import SYSTEM_PROMPT, OPTIMIZATION_PROMPT

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY", ""),
    base_url="https://api.deepseek.com",
    timeout=60.0,
)


def analyze_results(metrics: dict, code: str, equity_curve: list[float] | None = None, dates: list[str] | None = None) -> str:
    """Deep quantitative analysis of backtest results."""

    # Pre-compute drawdown period info for the prompt
    dd_info = ""
    if equity_curve and dates and len(equity_curve) > 1:
        peak = equity_curve[0]
        max_dd = 0.0
        dd_start = 0
        dd_end = 0
        current_peak = peak
        current_peak_idx = 0
        for i, v in enumerate(equity_curve):
            if v > current_peak:
                current_peak = v
                current_peak_idx = i
            dd = (current_peak - v) / current_peak * 100
            if dd > max_dd:
                max_dd = dd
                dd_start = current_peak_idx
                dd_end = i
        if max_dd > 0.5:
            dd_duration = dd_end - dd_start
            dd_info = f"""
Max drawdown period: from {dates[dd_start] if dd_start < len(dates) else 'peak'} to {dates[dd_end] if dd_end < len(dates) else 'trough'} (duration: ~{dd_duration} candles)
Peak equity before drawdown: {current_peak:.2f}
"""

    prompt = f"""## Backtest Results for Analysis

| Metric | Value |
|--------|-------|
| Total Return | {metrics.get("total_return_pct", "N/A")}% |
| Sharpe Ratio | {metrics.get("sharpe_ratio", "N/A")} |
| Sortino Ratio | {metrics.get("sortino_ratio", "N/A")} |
| Calmar Ratio | {metrics.get("calmar_ratio", "N/A")} |
| Max Drawdown | {metrics.get("max_drawdown_pct", "N/A")}% |
| Max DD Duration | {metrics.get("max_drawdown_duration", "N/A")} candles |
| Win Rate | {metrics.get("win_rate_pct", "N/A")}% |
| Profit Factor | {metrics.get("profit_factor", "N/A")} |
| Max Consecutive Losses | {metrics.get("max_consecutive_losses", "N/A")} |
| Total Trading Cost | ${metrics.get("total_trading_cost", "N/A")} |

{dd_info}

## Strategy Code
```python
{code[:1500]}
```

Deliver a structured analysis following the Deep Analysis framework (Phase 3) from your system prompt. Cover: Quick Diagnosis, Weakest Metric, Overfitting Assessment, Parameter Stability, Drawdown Analysis, Capital Management, and One Concrete Improvement.

Be honest. If this strategy is bad, say so clearly. Write in Traditional Chinese."""

    response = client.chat.completions.create(
        model="deepseek-chat",
        max_tokens=1024,
        temperature=0.3,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )

    return response.choices[0].message.content


def suggest_optimization(metrics: dict, previous_code: str, optimization_request: str) -> str:
    """Generate an optimized version of the strategy."""

    prompt = f"""Current strategy metrics:
- Return: {metrics.get("total_return_pct")}%, Drawdown: {metrics.get("max_drawdown_pct")}%
- Sharpe: {metrics.get("sharpe_ratio")}, Win Rate: {metrics.get("win_rate_pct")}%

Current code:
```python
{previous_code}
```

User request: "{optimization_request}"

Optimize the strategy. Change ONE parameter or rule. Output ONLY the code in a markdown block."""

    response = client.chat.completions.create(
        model="deepseek-chat",
        max_tokens=1024,
        temperature=0.2,
        messages=[
            {"role": "system", "content": OPTIMIZATION_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )

    from .parser import extract_code_block
    return extract_code_block(response.choices[0].message.content)


def validate_strategy_input(user_message: str) -> dict:
    """Check if the user's strategy description is complete enough to generate code.
    Returns {"valid": bool, "missing": list[str], "guidance": str}
    """
    prompt = f"""A user wants to create a trading strategy. Their description:

"{user_message}"

Evaluate whether this description contains:
1. A specific, measurable ENTRY signal
2. A specific EXIT/close signal
3. A STOP LOSS or risk management rule

Respond in JSON only:
{{"valid": true/false, "entry_ok": true/false, "exit_ok": true/false, "stop_loss_ok": true/false, "missing": ["entry", "exit", "stop_loss"], "guidance": "One friendly question in Traditional Chinese to help the user specify what's missing"}}

If all three are present, valid=true and missing=[]. If anything is vague ("buy when it goes up"), mark it as false."""

    response = client.chat.completions.create(
        model="deepseek-chat",
        max_tokens=256,
        temperature=0.1,
        messages=[
            {"role": "system", "content": "You are a strategy validator. Output valid JSON only."},
            {"role": "user", "content": prompt},
        ],
    )

    import json
    try:
        content = response.choices[0].message.content
        # Extract JSON from possible markdown wrapping
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content.strip())
    except (json.JSONDecodeError, AttributeError):
        return {"valid": True, "missing": [], "guidance": ""}
