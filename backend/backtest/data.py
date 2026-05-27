import ccxt
import pandas as pd
import pickle
import time
from datetime import datetime, timedelta
from pathlib import Path

CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_TTL = 3600  # 1 hour


def _cache_path(symbol: str, timeframe: str, days: int) -> Path:
    CACHE_DIR.mkdir(exist_ok=True)
    name = symbol.replace("/", "_") + f"_{timeframe}_{days}d.pkl"
    return CACHE_DIR / name


def fetch_ohlcv(symbol: str = "BTC/USDT", timeframe: str = "15m", days: int = 180) -> pd.DataFrame:
    cache_file = _cache_path(symbol, timeframe, days)

    if cache_file.exists():
        age = time.time() - cache_file.stat().st_mtime
        if age < CACHE_TTL:
            with open(cache_file, "rb") as f:
                return pickle.load(f)

    exchange = ccxt.bybit({"enableRateLimit": True})
    since_ms = exchange.parse8601((datetime.now() - timedelta(days=days)).isoformat())
    now_ms = exchange.milliseconds()

    all_candles = []
    page = 0
    while since_ms < now_ms:
        candles = exchange.fetch_ohlcv(symbol, timeframe, since=since_ms, limit=1000)
        if not candles:
            break

        all_candles += candles
        last_ts = candles[-1][0]
        since_ms = last_ts + 1
        page += 1

        # Safety: max 50 pages (~50,000 candles)
        if page > 50:
            break
        # Rate limit pause between pages
        if page > 1:
            time.sleep(0.5)

    if not all_candles:
        raise RuntimeError(f"No data for {symbol} {timeframe}")

    df = pd.DataFrame(all_candles, columns=["timestamp", "open", "high", "low", "close", "volume"])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    df.set_index("timestamp", inplace=True)
    df = df[~df.index.duplicated()]

    with open(cache_file, "wb") as f:
        pickle.dump(df, f)

    return df
