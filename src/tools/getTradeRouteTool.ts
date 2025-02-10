import { Aftermath } from "aftermath-ts-sdk";
import { z } from "zod";
import { tool } from '@langchain/core/tools';

export interface SwapContent {
    fromCoinType: string;
    toCoinType: string;
    amount: string;
    fromDecimals: number;
    toDecimals: number;
    recipient: string;
    fromCoinIsVerified: boolean;
    toCoinIsVerified: boolean;
}

export const getTradeRoute = tool(async (input: SwapContent) => {
    try {
        const { fromCoinType, toCoinType, amount, fromDecimals, toDecimals, recipient, fromCoinIsVerified, toCoinIsVerified } = input;
        if (!fromCoinIsVerified) {
            return `From coin ${fromCoinType} is not verified, terminating swap`;
        }
        if (!toCoinIsVerified) {
            return `To coin ${toCoinType} is not verified, terminating swap`;
        }
        const afSdk = new Aftermath("MAINNET");
        const router = afSdk.Router();

        const amountFloat = parseFloat(amount);
        if (isNaN(amountFloat)) {
            throw new Error("Invalid amount: not a number");
        }
        const scaledAmount = amountFloat * Math.pow(10, fromDecimals);
        const amountBigInt = BigInt(Math.round(scaledAmount));

        const route = await router.getCompleteTradeRouteGivenAmountIn({
            coinInType: fromCoinType,
            coinOutType: toCoinType,
            coinInAmount: amountBigInt,
            externalFee: {
                recipient: "0xee7e32d2a5a6132731ec2aaffc6b16b66202f71e6c2bf8ae1f5519e0bb526264",
                feePercentage: 0.01
            }
        });

        const tx = await router.getTransactionForCompleteTradeRoute({
            walletAddress: recipient,
            completeRoute: route,
            slippage: 1, // 1% max slippage
        });
        const txBytes = await tx.build();
        let routeToReturn = route.routes;
        // content and artifact
        return [
            JSON.stringify({
                routeToReturn
            }) + 'use this data to create a display text for showing route details in the exact format: A (protocol name A) -> B (protocol name B) -> C (protocol name C), fees, expected amount out, and full coinType for each coin',
            txBytes
        ];
    } catch (error) {
        console.error("Error in getting trade route:", error);
        return JSON.stringify("Error in getting trade route, due to insufficient balance or route not found.");
    }
}, {
    name: "trade_route",
    description: "Get an optimal trade route for swapping tokens",
    schema: z.object({
        fromCoinType: z.string().describe("The full coinType to swap from a specific coin"),
        fromCoinIsVerified: z.boolean().describe("Whether the from coin is verified"),
        toCoinType: z.string().describe("The full coinType to swap to a specific coin"),
        toCoinIsVerified: z.boolean().describe("Whether the to coin is verified"),
        amount: z.string().describe("The amount of from coin to swap."),
        fromDecimals: z.number().describe("The number of decimals for the from coin."),
        toDecimals: z.number().describe("The number of decimals for the to coin."),
        recipient: z.string().describe("The recipient's wallet address.")
    }),
    responseFormat: "content_and_artifact"
});