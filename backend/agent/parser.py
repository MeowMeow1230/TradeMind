import re

def extract_code_block(text: str) -> str:
    """Extract Python code from markdown code block in LLM response."""
    match = re.search(r"```(?:python)?\s*\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()

def extract_strategy_params(text: str) -> dict:
    """Extract key strategy parameters from user's natural language description."""
    params = {
        "symbol": "BTC/USDT",
        "timeframe": "1h",
        "indicators": [],
        "has_stop_loss": False,
        "has_take_profit": False,
    }

    text_lower = text.lower()

    if "eth" in text_lower:
        params["symbol"] = "ETH/USDT"
    elif "sol" in text_lower:
        params["symbol"] = "SOL/USDT"

    if "stop loss" in text_lower or "止损" in text:
        params["has_stop_loss"] = True
    if "take profit" in text_lower or "止盈" in text:
        params["has_take_profit"] = True

    indicator_keywords = ["ma", "ema", "sma", "rsi", "macd", "bollinger", "atr", "kdj", "布林", "均线"]
    for kw in indicator_keywords:
        if kw in text_lower:
            params["indicators"].append(kw)

    return params
