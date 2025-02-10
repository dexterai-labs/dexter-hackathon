import axios from 'axios';
import { z } from "zod";
import { tool } from '@langchain/core/tools';

interface CoinMetadata {
    _id: string;
    coinType: string;
    decimals: string;
    id: string;
    name: string;
    symbol: string;
    supply: string;
}

interface TokenMarketData {
    isMintable: string;
    tokensBurned: string;
    tokensBurnedPercentage: string;
    lpBurnt: string;
    percentageTokenSupplyInLiquidity: string;
    isCoinHoneyPot: string;
    top10HolderPercentage: string;
    top20HolderPercentage: string;
    fullyDilutedMarketCap: string;
    marketCap: string;
    totalLiquidityUsd: string;
    timeCreated: string;
    price1hAgo: string;
    price6hAgo: string;
    price24hAgo: string;
    percentagePriceChange6h: string;
    percentagePriceChange24h: string;
    coinDevHoldingsPercentage: string;
    buyVolume6h: string;
    buyVolume24h: string;
    sellVolume6h: string;
    sellVolume24h: string;
    volume6h: string;
    volume24h: string;
    coinPrice: string;
    holdersWithProminentNft: string;
    holdersWithSuiNs: string;
    averageAgeOfHolders: string;
    holderQualityScore: string;
}

export const getTokenMarketData = tool(async (input: { coins: string[] }) => {
    const { coins } = input;
    try {
        const coinsQuery = coins.join(',');
        const response = await axios.get(`https://api-ex.insidex.trade/coins/multiple/market-data?coins=${encodeURIComponent(coinsQuery)}`, {
            headers: {
                "X-API-Key": """", // Example of a custom header
            }
        });

        const transformedData = response.data.map((item: any) => {
            const tokenMarketData: TokenMarketData = {
                isMintable: item.isMintable,
                tokensBurned: item.tokensBurned,
                tokensBurnedPercentage: item.tokensBurnedPercentage,
                lpBurnt: item.lpBurnt,
                percentageTokenSupplyInLiquidity: item.percentageTokenSupplyInLiquidity,
                isCoinHoneyPot: item.isCoinHoneyPot,
                top10HolderPercentage: item.top10HolderPercentage,
                top20HolderPercentage: item.top20HolderPercentage,
                fullyDilutedMarketCap: item.fullyDilutedMarketCap,
                marketCap: item.marketCap,
                totalLiquidityUsd: item.totalLiquidityUsd,
                timeCreated: item.timeCreated,
                price1hAgo: item.price1hAgo,
                price6hAgo: item.price6hAgo,
                price24hAgo: item.price24hAgo,
                percentagePriceChange6h: item.percentagePriceChange6h,
                percentagePriceChange24h: item.percentagePriceChange24h,
                coinDevHoldingsPercentage: item.coinDevHoldingsPercentage,
                buyVolume6h: item.buyVolume6h,
                buyVolume24h: item.buyVolume24h,
                sellVolume6h: item.sellVolume6h,
                sellVolume24h: item.sellVolume24h,
                volume6h: item.volume6h,
                volume24h: item.volume24h,
                coinPrice: item.coinPrice,
                holdersWithProminentNft: item.holdersWithProminentNft,
                holdersWithSuiNs: item.holdersWithSuiNs,
                averageAgeOfHolders: item.averageAgeOfHolders,
                holderQualityScore: item.holderQualityScore,
            };
            return tokenMarketData;
        });

        return JSON.stringify(transformedData) + 'from this data, summarise the entire data in your own words and dont show the data in a tablular format.';
    } catch (error) {
        console.error('Error fetching token market data:', error);
        throw error;
    }
}, {
    name: "token_market_data",
    description: "Fetches market data(price, market cap, liquidity, etc) for specified tokens, returns detailed market information.",
    schema: z.object({ coins: z.array(z.string()).describe("A list of fully qualified coin type identifiers.") })
}); 