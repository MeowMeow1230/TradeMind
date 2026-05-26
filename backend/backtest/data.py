import ccxt
import pandas as pd
import pickle
import time
from datetime import datetime, timedelta
from pathlib import Path

CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_TTL = 3600  # 1 hour


def _cache_path(symbol: str, timeframe: str) -> Path:
    CACHE_DIR.mkdir(exist_ok=True)
    name = symbol.replace("/", "_") + f"_{timeframe}.pkl"
    return CACHE_DIR / name


def fetch_ohlcv(symbol: str = "BTC/USDT", timeframe: str = "15m", days: int = 180) -> pd.DataFrame:
    """Fetch OHLCV data from Bybit with 1-hour cache."""
    cache_file = _cache_path(symbol, timeframe)

    if cache_file.exists():
        age = time.time() - cache_file.stat().st_mtime
        if age < CACHE_TTL:
            with open(cache_file, "rb") as f:
                return pickle.load(f)

    exchange = ccxt.bybit({"enableRateLimit": True})
    since = exchange.parse8601((datetime.now() - timedelta(days=days)).isoformat())

    all_candles = []
    while True:
        candles = exchange.fetch_ohlcv(symbol, timeframe, since=since, limit=1000)
        if not candles:
            break
        all_candles += candles
        since = candles[-1][0] + 1
        if len(candles) < 1000:
            break

    df = pd.DataFrame(all_candles, columns=["timestamp", "open", "high", "low", "close", "volume"])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    df.set_index("timestamp", inplace=True)

    with open(cache_file, "wb") as f:
        pickle.dump(df, f)

    return df
