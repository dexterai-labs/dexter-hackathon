import { z } from "zod";
import { tool } from '@langchain/core/tools';

export const getDollarValueTool = tool(async (input: { amount: string, price: string, decimals: string }) => {
    const { amount, price, decimals } = input;
    try {
        const amountNum = parseFloat(amount);
        const priceNum = parseFloat(price);
        let decimalsNum = parseInt(decimals, 10);

        if (isNaN(amountNum) || isNaN(priceNum) || isNaN(decimalsNum)) {
            throw new Error("Invalid input: amount, price, and decimals must be numbers.");
        }

        if (decimalsNum === 0) {
            decimalsNum = 9; // Default to 9 if decimals is zero
        }

        const dollarValue = (amountNum / Math.pow(10, decimalsNum)) * priceNum;
        return dollarValue.toFixed(2); // Return the dollar value rounded to two decimal places
    } catch (error) {
        console.error('Error calculating dollar value:', error);
        throw error;
    }
}, {
    name: "dollar_value_calculator",
    description: "Calculates the dollar value of a coin based on the amount, price, and decimals.",
    schema: z.object({
        amount: z.string().describe("The amount of the coin."),
        price: z.string().describe("The price of the coin in USD."),
        decimals: z.string().describe("The number of decimals for the coin.")
    })
}); 