import json
import os
import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from agent.core import run_agent_loop, run_optimization_loop

app = FastAPI(title="AI Trading Partner")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(request: Request):
    """SSE endpoint: receives user message, streams agent steps back."""
    body = await request.json()
    message = body.get("message", "")
    mode = body.get("mode", "generate")
    previous_code = body.get("previous_code", "")
    previous_metrics = body.get("previous_metrics", {})

    async def event_stream():
        if mode == "optimize" and previous_code:
            yield {"event": "step", "data": json.dumps({"type": "generation", "message": "正在优化策略..."}, ensure_ascii=False)}
            await asyncio.sleep(0.1)
            result = run_optimization_loop(previous_code, previous_metrics, message)
            yield {"event": "step", "data": json.dumps({"type": "optimization", **result}, ensure_ascii=False)}
            yield {"event": "done", "data": "{}"}
        else:
            yield {"event": "step", "data": json.dumps({"type": "generation", "message": "正在分析你的策略..."}, ensure_ascii=False)}
            await asyncio.sleep(0.1)
            result = run_agent_loop(message)
            for step in result["steps"]:
                yield {"event": "step", "data": json.dumps(step, ensure_ascii=False)}
                await asyncio.sleep(0.3)
            yield {"event": "done", "data": json.dumps({
                    "final_code": result["final_code"],
                    "final_metrics": result["final_metrics"],
                    "optimization_suggestion": result["optimization_suggestion"]
                }, ensure_ascii=False)}

    return EventSourceResponse(event_stream())


@app.post("/deploy")
async def deploy_to_mantle(request: Request):
    from blockchain.mantle import log_strategy_to_chain
    body = await request.json()
    code = body.get("code", "")
    sharpe = body.get("sharpe_ratio", 0.0)

    private_key = os.environ.get("MANTLE_PRIVATE_KEY", "")
    contract_addr = os.environ.get("MANTLE_CONTRACT_ADDRESS", "")

    if not private_key or not contract_addr:
        return {"error": "Mantle not configured"}

    tx_hash = log_strategy_to_chain(contract_addr, private_key, code, sharpe)
    return {"tx_hash": tx_hash, "explorer_url": f"https://sepolia.mantlescan.xyz/tx/{tx_hash}"}
