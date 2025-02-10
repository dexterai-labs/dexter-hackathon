import { z } from "zod";
import { tool } from '@langchain/core/tools';
import { SuiClient } from "@mysten/sui/client";
import axios from 'axios';

export const getCoinWalletBalanceTool = tool(async (input) => {
    try {
        const client = new SuiClient({
            url: "https://fullnode.mainnet.sui.io:443",
        });

        // Run both the balance fetch and price fetch in parallel
        const [balances, response] = await Promise.all([
            client.getBalance({ owner: input.address, coinType: input.coinType }),
            axios.get(`https://api-ex.insidex.trade/coins/${input.coinType}/price-data`, {
                headers: {
                    'X-API-Key': '""'
                }
            })
        ]);

        if (response.status !== 200) {
            throw new Error(`Failed to fetch price data: ${response.statusText}`);
        }

        const priceData = response.data;
        const price = priceData.price; // Assuming the price is in a field named 'price'

        // Calculate the dollar value
        const dollarValue = (Number(balances.totalBalance) / 10 ** input.decimals) * price;

        return JSON.stringify({
            balance: balances.totalBalance,
            dollarValue: dollarValue,
            scalledBalance: Number(balances.totalBalance) / 10 ** input.decimals
        });
    } catch (error) {
        return JSON.stringify(error.data);
    }
}, {
    name: "wallet_coin_specific_balance",
    description: "Call to get the wallet balance for a specified fully qualified coin type for the sender's address. ",
    schema: z.object({
        address: z.string().describe("The wallet address to fetch balances for."),
        coinType: z.string().describe("this should be the fully qualified full coin type identifier, and not just the symbol"),
        decimals: z.number().describe("the decimals of the coin type")
    })
});