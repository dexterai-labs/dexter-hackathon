import { z } from "zod";
import { tool } from '@langchain/core/tools';
import { SuiClient } from "@mysten/sui/client";
import { LstClient, fetchLiquidStakingInfo } from "@suilend/springsui-sdk";
import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";

const LIQUID_STAKING_INFO = {
    id: "0x15eda7330c8f99c30e430b4d82fd7ab2af3ead4ae17046fcb224aa9bad394f6b",
    type: "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI",
    weightHookId: "0xbbafcb2d7399c0846f8185da3f273ad5b26b3b35993050affa44cfa890f1f144",
};

const SUI_DECIMALS = 9;
const SSUI_DECIMALS = 9;
const EXTERNAL_FEE_RECIPIENT = "0xee7e32d2a5a6132731ec2aaffc6b16b66202f71e6c2bf8ae1f5519e0bb526264";
const EXTERNAL_FEE_PERCENTAGE = 0.001;

export const suiUnstakeTool = tool(async (input: { amount: number, address: string }) => {
    try {
        var { amount, address } = input;
        amount = amount * 1e9;
        const client = new SuiClient({
            url: "https://fullnode.mainnet.sui.io:443",
        });

        const lstClient = await LstClient.initialize(client, LIQUID_STAKING_INFO);

        // Fetch LST coins
        const lstCoins = await client.getCoins({
            owner: address,
            coinType: LIQUID_STAKING_INFO.type,
            limit: 1000,
        });
        let lstCoinsBalance = lstCoins.data.reduce((acc, coin) => acc + Number(coin.balance), 0);

        // Check if user has sufficient balance
        if (amount + amount * EXTERNAL_FEE_PERCENTAGE > lstCoinsBalance) {
            return `Insufficient balance. You are trying to unstake ${amount / 1e9} LST but your current balance is ${lstCoinsBalance / 1e9} LST.`;
        }

        // Fetch liquid staking info to calculate the unstake rate
        const [rawLiquidStakingInfo] = await Promise.all([
            fetchLiquidStakingInfo(LIQUID_STAKING_INFO, client)
        ]);
        const totalSuiSupply = new BigNumber(rawLiquidStakingInfo.storage.totalSuiSupply.toString()).div(10 ** SUI_DECIMALS);
        const totalLstSupply = new BigNumber(rawLiquidStakingInfo.lstTreasuryCap.totalSupply.value.toString()).div(10 ** SSUI_DECIMALS);

        // Calculate the unstake rate
        const unstakeRate = !totalLstSupply.eq(0) ? totalSuiSupply.div(totalLstSupply) : new BigNumber(0);
        const suiReceived = new BigNumber(amount).times(unstakeRate);

        // Create a new transaction
        const tx = new Transaction();

        if (lstCoins.data.length > 1) {
            tx.mergeCoins(
                lstCoins.data[0].coinObjectId,
                lstCoins.data.slice(1).map((c) => c.coinObjectId),
            );
        }

        const [lst] = tx.splitCoins(lstCoins.data[0].coinObjectId, [
            BigInt(amount),
        ]);
        const [feeLst] = tx.splitCoins(lstCoins.data[0].coinObjectId, [
            BigInt(amount * EXTERNAL_FEE_PERCENTAGE),
        ]);
        const sui = lstClient.redeem(tx, lst);

        // Transfer the redeemed SUI to the sender's address
        tx.transferObjects([sui], address);
        tx.transferObjects([feeLst], EXTERNAL_FEE_RECIPIENT);
        tx.setSender(address);
        tx.setGasBudget(50000000);
        const txBytes = await tx.build({ client });

        return [
            `Unstake transaction created successfully, sign the transaction with your wallet to complete the unstake. You will receive approximately ${suiReceived.toFixed()} SUI.`,
            txBytes
        ];
    } catch (error) {
        console.error("An error occurred while creating the unstake transaction:", error);
        return "An error occurred while creating the unstake transaction";
    }
}, {
    name: "unstake_sui_tool",
    description: "Unstake LST to receive SUI back on Spring SUI",
    schema: z.object({
        amount: z.number().describe("The amount of LST to unstake."),
        address: z.string().describe("The sender's wallet address.")
    }),
    responseFormat: "content_and_artifact"
}); 