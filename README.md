# AI Trading Partner — Mantle Turing Test Hackathon 2026

**Talk to your AI trading partner. It builds, tests, and optimizes crypto trading strategies while you watch.**

[![Demo Video](https://img.shields.io/badge/Demo-Video-green)](https://youtu.be/placeholder)

## What It Does

1. **Describe** your trading strategy in plain language (Chinese or English)
2. **AI generates** Python trading code automatically
3. **Auto-backtests** on real Bybit market data (BTC, ETH, SOL)
4. **AI analyzes** results and suggests concrete optimizations
5. **One-click deploy** strategy proof to Mantle Network (ERC-8004 Agent Identity)
6. **Iterate** until satisfied, then **export** your strategy

## Architecture

```
User Chat → Next.js Frontend → FastAPI SSE → Claude API Agent
                                                    ↓
                                            Parse → Generate → Backtest → Analyze
                                                    ↓
                                              Mantle On-Chain Verification
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, Plotly.js |
| Backend | Python FastAPI, pandas, ccxt |
| AI Agent | Claude API (Opus 4.7) |
| Blockchain | Solidity, ERC-8004, Mantle Sepolia Testnet |
| Data | Bybit API (real-time crypto OHLCV) |

## Quick Start

### Prerequisites
- Node.js 18+, Python 3.11+
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### Install & Run

```bash
# Clone
git clone <repo-url> && cd mantle-ai-agent

# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:3000

# Backend (separate terminal)
cd backend
pip install -r requirements.txt
cp .env.example .env  # add your ANTHROPIC_API_KEY
uvicorn main:app --reload
# → http://localhost:8000
```

### Smart Contracts

```bash
npm install
npx hardhat compile
PRIVATE_KEY=<your-key> npx hardhat run scripts/deploy.js --network mantleTestnet
```

### Run Integration Tests

```bash
cd backend
ANTHROPIC_API_KEY=<your-key> python test_agent.py
```

## Demo Script

1. Type: "Buy ETH when RSI < 30 and close above 20 EMA, stop loss 5%"
2. Watch AI generate code → backtest → show metrics
3. Accept AI's optimization suggestion
4. See improved results with equity curve chart
5. Deploy strategy proof to Mantle testnet
6. Download the Python strategy file

## Hackathon Tracks

- **Alpha & Data Track** — AI-Driven Trading Strategy
- **Agentic Economy Track** — ERC-8004 Agent Identity + Byreal integration
- **Best UI/UX Award** — Consumer-grade chat interface
- **20 Project Deployment Award** — Deployed on Mantle testnet

## Team

Solo builder — product direction + AI-assisted development. Built with Claude Code.

## License

MIT
