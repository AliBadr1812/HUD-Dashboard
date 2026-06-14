// CoinGecko API types
// https://docs.coingecko.com/reference/simple-price

export interface CoinGeckoPriceData {
  usd?: number;
  eur?: number;
  usd_24h_change?: number;
  eur_24h_change?: number;
  last_updated_at?: number;
}

// /simple/price response: { [coinId]: CoinGeckoPriceData }
export type CoinGeckoSimplePriceResponse = Record<string, CoinGeckoPriceData>;
