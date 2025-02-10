import { tool } from '@langchain/core/tools';
import axios from 'axios';
import { z } from 'zod';

export const getTrendingCoins = tool(async () => {
    try {
        const response = await axios.get('https://api-ex.insidex.trade/coins/trending', {
            headers: {
                'X-API-Key': `""`
            }
        });

        if (response.status !== 200) {
            throw new Error(`Failed to fetch trending coins: ${response.statusText}`);
        }

        var trendingCoins = response.data.map((coin: any) => ({
            fullyDilutedMarketCap: coin.fullyDilutedMarketCap ?? '0',
            marketCap: coin.marketCap ?? '0',
            volume24h: coin.volume24h ?? '0',
            coin: coin.coin ?? 'unknown'
        }));
        // Filter out coins containing USDC or USDT
        const filteredTrendingCoins = trendingCoins.filter((coin: any) => {
            const coinName = coin.coin.toLowerCase();
            return !coinName.includes('usdc') && !coinName.includes('usdt');
        });;
        trendingCoins = filteredTrendingCoins;
        // Take only the first 6 coins
        trendingCoins = trendingCoins.slice(0, 5);
        // Return the filtered trending coins data
        return JSON.stringify(trendingCoins);
    } catch (error) {
        console.error('Error fetching trending coins:', error);
        throw new Error('Could not retrieve trending coins');
    }
}, {
    name: "trending_coins",
    description: "Fetch the list of trending coins, only one of trending_coins and top_gainners should be used",
    schema: z.object({}),
    responseFormat: "json",
    returnDirect: true
}); 