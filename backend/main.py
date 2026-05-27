import json
import os
import asyncio
import re
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from openai import OpenAI

from agent.core import run_agent_loop, run_optimization_loop
from agent.analyzer import validate_strategy_input
from knowledge.system_prompt import SYSTEM_PROMPT

app = FastAPI(title="TradeMind")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Simple regex patterns to detect sizing info in user messages
import re
_SIZING_PATTERNS = [
    r"(?:account|capital|本金|资金|帳戶)[\s:]*\$?([\d,]+)",
    r"\$([\d,]+)\s*(?:account|capital|本金|资金)",
    r"risk[\s:]*([\d.]+)\s*%",
    r"风险[\s:]*([\d.]+)\s*%",
]


def _extract_sizing_from_message(msg: str) -> bool:
    """Return True if the message contains capital or risk information."""
    for pattern in _SIZING_PATTERNS:
        if re.search(pattern, msg, re.IGNORECASE):
            return True
    return False


def _classify_intent(msg: str) -> str:
    """Classify user intent: 'discuss' (chat about results) or 'optimize' (change code)."""
    discuss_keywords = [
        "why", "what", "how", "explain", "分析", "為什麼", "為什麼", "怎麼",
        "改進", "改善", "問題", "建議", "方向", "怎麼改", "哪裏", "哪裡",
        "suggest", "improve", "improvement", "explain", "分析", "評估",
        "好嗎", "可以嗎", "怎麼樣", "行不行",
    ]
    optimize_keywords = [
        "改成", "改為", "換成", "試試", "用", "調整", "增加到", "減少到",
        "change", "try", "use", "set", "修改", "調成", "換", "變更",
        "instead", "rather", "switch",
    ]

    msg_lower = msg.lower()

    # Check optimize first (stronger signal)
    for kw in optimize_keywords:
        if kw in msg_lower:
            return "optimize"

    # Check discuss
    for kw in discuss_keywords:
        if kw in msg_lower:
            return "discuss"

    # Default: if user provided code-like changes, optimize; otherwise discuss
    if any(c in msg for c in ["=", "->", "→", "%", "period", "週期"]):
        return "optimize"
    return "discuss"


def _discuss_results(code: str, metrics: dict, question: str) -> str:
    """Analyze current results in response to a discussion question."""
    client = OpenAI(
        api_key=os.environ.get("DEEPSEEK_API_KEY", ""),
        base_url="https://api.deepseek.com",
        timeout=30.0,
    )
    prompt = f"""The user has a question about their trading strategy's backtest results.

Current metrics: Return {metrics.get('total_return_pct', '?')}%, Sharpe {metrics.get('sharpe_ratio', '?')}, Win Rate {metrics.get('win_rate_pct', '?')}%, Max DD {metrics.get('max_drawdown_pct', '?')}%

Their question: "{question}"

Respond conversationally. If they're asking for improvement directions, give 1-2 specific, actionable suggestions with reasoning. Keep it under 200 words. Write in Traditional Chinese."""

    response = client.chat.completions.create(
        model="deepseek-chat",
        max_tokens=400,
        temperature=0.3,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(request: Request):
    """SSE endpoint: validates user input, generates strategy, backtests, analyzes."""
    body = await request.json()
    message = body.get("message", "")
    mode = body.get("mode", "generate")
    previous_code = body.get("previous_code", "")
    previous_metrics = body.get("previous_metrics", {})
    capital = float(body.get("capital", 10000))
    risk_pct = float(body.get("risk_pct", 2))
    sizing_confirmed = body.get("sizing_confirmed", False)
    symbols = body.get("symbols", ["BTC/USDT", "ETH/USDT", "SOL/USDT"])

    async def event_stream():
        if mode == "optimize" and previous_code:
            # Check intent: is user asking a question or requesting a code change?
            intent = _classify_intent(message)
            if intent == "discuss":
                # Just chat — analyze current results, no code re-run
                analysis = _discuss_results(previous_code, previous_metrics, message)
                yield {"event": "step", "data": json.dumps({"type": "analysis", "message": analysis}, ensure_ascii=False)}
                yield {"event": "done", "data": json.dumps({
                    "final_code": previous_code,
                    "final_metrics": previous_metrics,
                    "optimization_suggestion": analysis,
                }, ensure_ascii=False)}
                return

            yield {"event": "step", "data": json.dumps({"type": "generation", "message": "Analyzing your optimization request..."}, ensure_ascii=False)}
            await asyncio.sleep(0.1)
            result = run_optimization_loop(previous_code, previous_metrics, message, symbols)
            for step in result.get("steps", []):
                yield {"event": "step", "data": json.dumps(step, ensure_ascii=False)}
                await asyncio.sleep(0.3)
            yield {"event": "done", "data": json.dumps({
                "final_code": result.get("final_code", previous_code),
                "final_metrics": result.get("final_metrics", {}),
                "optimization_suggestion": result.get("optimization_suggestion", ""),
                "walk_forward": result.get("walk_forward"),
                "monte_carlo": result.get("monte_carlo"),
                "param_heatmap": result.get("param_heatmap"),
            }, ensure_ascii=False)}
        else:
            # Phase 1: Validate strategy input
            validation = validate_strategy_input(message)
            if not validation.get("valid", True):
                missing_items = validation.get("missing", [])
                guidance = validation.get("guidance", "Please specify your entry, exit, and stop loss rules more clearly.")
                yield {"event": "step", "data": json.dumps({
                    "type": "validation",
                    "message": guidance,
                    "missing": missing_items,
                }, ensure_ascii=False)}
                yield {"event": "done", "data": json.dumps({
                    "final_code": "",
                    "final_metrics": {},
                    "optimization_suggestion": "",
                }, ensure_ascii=False)}
                return

            # Phase 1.5: If user hasn't mentioned capital or risk, ask
            has_sizing = _extract_sizing_from_message(message)
            if not has_sizing and not sizing_confirmed:
                yield {"event": "step", "data": json.dumps({
                    "type": "sizing_query",
                    "message": "Before I generate your strategy, let me know your account size and risk tolerance.",
                    "presets_capital": [1000, 5000, 10000, 50000, 100000],
                    "presets_risk": [0.5, 1, 2, 5, 10],
                    "default_capital": 10000,
                    "default_risk": 2,
                    "available_symbols": ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "ADA/USDT", "DOGE/USDT", "AVAX/USDT", "ARB/USDT", "OP/USDT", "MATIC/USDT", "LINK/USDT"],
                    "default_symbols": ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
                }, ensure_ascii=False)}
                yield {"event": "done", "data": json.dumps({
                    "final_code": "",
                    "final_metrics": {},
                    "optimization_suggestion": "",
                    "sizing_needed": True,
                }, ensure_ascii=False)}
                return

            # Phase 2: Generate strategy
            yield {"event": "step", "data": json.dumps({"type": "generation", "message": "Analyzing your strategy..."}, ensure_ascii=False)}
            await asyncio.sleep(0.1)
            result = run_agent_loop(message, capital=capital, risk_pct=risk_pct, symbols=symbols)
            for step in result["steps"]:
                yield {"event": "step", "data": json.dumps(step, ensure_ascii=False)}
                await asyncio.sleep(0.3)
            yield {"event": "done", "data": json.dumps({
                "final_code": result["final_code"],
                "final_metrics": result["final_metrics"],
                "optimization_suggestion": result["optimization_suggestion"],
                "walk_forward": result.get("walk_forward"),
                "monte_carlo": result.get("monte_carlo"),
                "param_heatmap": result.get("param_heatmap"),
            }, ensure_ascii=False)}

    return EventSourceResponse(event_stream())


@app.post("/deploy")
async def deploy_to_mantle(request: Request):
    """Deploy strategy hash to Mantle Sepolia testnet."""
    from blockchain.mantle import log_strategy_to_chain
    body = await request.json()
    code = body.get("code", "")
    sharpe = body.get("sharpe_ratio", 0.0)

    private_key = os.environ.get("MANTLE_PRIVATE_KEY", "")
    contract_addr = os.environ.get("MANTLE_CONTRACT_ADDRESS", "")

    if not private_key or not contract_addr:
        return {"error": "Mantle not configured — set MANTLE_PRIVATE_KEY and MANTLE_CONTRACT_ADDRESS in .env"}

    try:
        tx_hash = log_strategy_to_chain(contract_addr, private_key, code, sharpe)
        return {"tx_hash": tx_hash, "explorer_url": f"https://sepolia.mantlescan.xyz/tx/{tx_hash}"}
    except Exception as e:
        return {"error": str(e)}
