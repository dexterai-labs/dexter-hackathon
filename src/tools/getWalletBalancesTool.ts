import { z } from "zod";
import { tool } from '@langchain/core/tools';
import { SuiClient } from "@mysten/sui/client";

export const getWalletBalances = tool(async (input) => {
    const client = new SuiClient({
        url: "https://fullnode.mainnet.sui.io:443",
    });

    const balances = await client.getAllBalances({ owner: input.address });
    const nonZeroBalances = balances.filter(balance => Number(balance.totalBalance) > 0);

    // Sort balances in descending order and take the top 25
    const topBalances = nonZeroBalances
        .sort((a, b) => Number(b.totalBalance) - Number(a.totalBalance))
        .slice(0, 20);

    // Ensure specific tokens are always included
    const importantCoinTypesShort = ['usdc', 'usdt', 'sui', 'coin'];
    const importantBalances = nonZeroBalances.filter(balance =>
        importantCoinTypesShort.some(coinType => balance.coinType.toLowerCase().includes(coinType))
    );

    // Merge and remove duplicates
    const mergedBalances = [...new Map([...importantBalances, ...topBalances].map(item => [item.coinType, item])).values()];

    return JSON.stringify(mergedBalances);
}, {
    name: "wallet_all_token_balances",
    description: "Call to get the wallet balances for all tokens for the sender's address, call this only when user asks wallet holdings or wallet balances are required as input to other tool",
    schema: z.object({ address: z.string().describe("The wallet address to fetch balances for.") })
}); 