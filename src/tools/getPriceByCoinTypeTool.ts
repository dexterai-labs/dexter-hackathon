import { tool } from '@langchain/core/tools';
import axios from 'axios';
import { z } from 'zod';

export const getPriceByCoinType = tool(async (input: { coinType: string }) => {
    var { coinType } = input;
    if (coinType.toLowerCase().endsWith('::sui')) {
        coinType = '0x2::sui::SUI';
    }
    try {
        const response = await axios.get(`https://api-ex.insidex.trade/coins/${coinType}/price-data`, {
            headers: {
                'X-API-Key': '""'
            }
        });

        if (response.status !== 200) {
            throw new Error(`Failed to fetch price data: ${response.statusText}`);
        }

        const priceData = response.data;

        // Return the price data
        return JSON.stringify(priceData);
    } catch (error) {
        console.error('Error fetching price data:', error);
        throw new Error('Could not retrieve price data');
    }
}, {
    name: "price_by_coin_type",
    description: "Fetch the price data for a specific coin type",
    schema: z.object({
        coinType: z.string().describe("The full coinType to get price data for a specific coin")
    }),
    responseFormat: "json"
}); 