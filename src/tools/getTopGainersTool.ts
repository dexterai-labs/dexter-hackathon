import fetch from "node-fetch";
import { z } from "zod";
import { tool } from '@langchain/core/tools';

const API_URL = "https://api-ex.insidex.trade/coins/top-gainers";
const API_KEY = """";

export const getTopGainers = tool(async (input) => {
    const response = await fetch(API_URL, {
        headers: {
            "x-api-key": API_KEY,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorText}`
        );
    }

    const data = await response.json();
    var filteredData = data.map(item => ({
        coin: item.coin ?? 'Unknown Coin',
        priceChange4h: item.priceChange4h ?? 0,
        symbol: item.coinMetadata.symbol ?? ''
    }));
    // Take only the first 5 coins
    filteredData = filteredData.slice(0, 6);

    return JSON.stringify(filteredData);
}, {
    name: "top_gainers",
    description: "Call to get the top gainers, only one of trending_coins and top_gainners should be used",
    schema: z.object({ noOp: z.string().optional().describe("No-op parameter.") }),
    responseFormat: "json",
    returnDirect: true
});