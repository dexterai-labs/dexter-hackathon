import { tool } from '@langchain/core/tools';
import axios from 'axios';
import { z } from 'zod';

export const getTopBuyersByCoin = tool(async (input: { coinType: string }) => {
    const { coinType } = input;

    try {
        const response = await axios.get(`https://api-ex.insidex.trade/spot-trades/${coinType}/top-buyers?limit=20&skip=0`, {
            headers: {
                'X-API-Key': '""'
            }
        });

        if (response.status !== 200) {
            throw new Error(`Failed to fetch top buyers: ${response.statusText}`);
        }

        const topBuyers = response.data;

        // Return the top buyers data
        return JSON.stringify(topBuyers) + 'from this data, provide a short summary of your findings in an informational way';
    } catch (error) {
        console.error('Error fetching top buyers:', error);
        throw new Error('Could not retrieve top buyers');
    }
}, {
    name: "top_buyers_by_coin",
    description: "Fetch the list of top buyers for a specific coin",
    schema: z.object({
        coinType: z.string().describe("The full coinType to get top buyers for specified coin")
    }),
    responseFormat: "json"
}); 