import { z } from "zod";
import { tool } from '@langchain/core/tools';
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";

import {
    LENDING_MARKET_ID,
    LENDING_MARKET_TYPE,
    SuilendClient,
    initializeSuilend,
    createObligationIfNoneExists,
    sendObligationToUser,
} from '@suilend/sdk';

export interface DepositContent {
    coinType: string;
    amount: number;
    address: string;
    decimals: number;
}

export const depositToSuilend = tool(async (input: DepositContent) => {
    const { amount, coinType, address, decimals } = input;
    const client = new SuiClient({
        url: "https://fullnode.mainnet.sui.io:443",
    });
    try {
        const suilendClient = await SuilendClient.initialize(
            LENDING_MARKET_ID,
            LENDING_MARKET_TYPE,
            client
        );

        const { coinMetadataMap, obligationOwnerCaps } = await initializeSuilend(
            client,
            suilendClient,
            address
        );

        if (!coinMetadataMap[coinType]) {
            throw new Error(`Invalid coin type: ${coinType}`);
        }


        // Deposit
        const tx = new Transaction();

        const { obligationOwnerCapId, didCreate } = createObligationIfNoneExists(
            suilendClient,
            tx,
            obligationOwnerCaps?.[0],
        );

        await suilendClient.depositIntoObligation(
            address,
            coinType,
            (amount * Math.pow(10, decimals)).toString(),
            tx,
            obligationOwnerCapId
        );

        if (didCreate) {
            sendObligationToUser(obligationOwnerCapId, address, tx);
        }
    } catch (error) {
        console.error("Error in depositing to Suilend:", error);
        return JSON.stringify("Error in depositing to Suilend, please check the inputs and try again.");
    }
}, {
    name: "deposit_to_suilend",
    description: "Deposit a specific amount of a specific coin to Suilend",
    schema: z.object({
        coinType: z.string().describe("The full coin type to deposit."),
        amount: z.number().describe("The amount of coin to deposit."),
        address: z.string().describe("The sender's wallet address."),
        decimals: z.number().describe("The number of decimals for the deposit coin type."),
    }),
    responseFormat: "content_and_artifact"
});