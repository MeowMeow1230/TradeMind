import os
from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI
from knowledge.system_prompt import SYSTEM_PROMPT

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY", ""),
    base_url="https://api.deepseek.com",
)


def analyze_results(metrics: dict, previous_code: str) -> str:
    """Analyze backtest results and suggest improvements."""
    prompt = f"""Here are backtest results for a trading strategy:

- Total Return: {metrics.get("total_return_pct")}%
- Sharpe Ratio: {metrics.get("sharpe_ratio")}
- Max Drawdown: {metrics.get("max_drawdown_pct")}%
- Win Rate: {metrics.get("win_rate_pct")}%
- Profit Factor: {metrics.get("profit_factor")}

The strategy code was:
```python
{previous_code}
```

Analyze these results. Identify the weakest aspect and suggest ONE specific improvement. Explain in plain language why this change should help. Be concise (3-4 sentences max)."""

    response = client.chat.completions.create(
        model="deepseek-chat",
        max_tokens=512,
        temperature=0.3,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )

    return response.choices[0].message.content


def suggest_optimization(metrics: dict, previous_code: str, optimization_request: str) -> str:
    """Generate an optimized version of the strategy."""
    prompt = f"""The user's strategy had these backtest results:

- Total Return: {metrics.get("total_return_pct")}%
- Max Drawdown: {metrics.get("max_drawdown_pct")}%
- Win Rate: {metrics.get("win_rate_pct")}%

Current strategy:
```python
{previous_code}
```

User's optimization request: "{optimization_request}"

Generate the improved Python code. Output ONLY the code in a markdown block."""

    response = client.chat.completions.create(
        model="deepseek-chat",
        max_tokens=2048,
        temperature=0.2,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )

    from .parser import extract_code_block
    return extract_code_block(response.choices[0].message.content)
