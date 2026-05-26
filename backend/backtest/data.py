import ccxt
import pandas as pd
from datetime import datetime, timedelta


def fetch_ohlcv(symbol: str = "BTC/USDT", timeframe: str = "1h", days: int = 180) -> pd.DataFrame:
    """Fetch OHLCV data from Bybit and return as DataFrame."""
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
    return df
