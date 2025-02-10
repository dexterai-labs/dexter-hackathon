import fetch from "node-fetch";
import { z } from "zod";
import { tool } from '@langchain/core/tools';
import { Aftermath } from "aftermath-ts-sdk";

export interface TokenDetails {
    symbol: string;
    name: string;
    coinType: string;
    decimals: number;
    isVerifiedCoin: boolean;
}

export const getTokenBasicDataFromName = tool(async (input: { tokenType: string }) => {
    const { tokenType } = input;

    // Check if the token type is already in fully qualified format
    if (/^0x[a-fA-F0-9]{64}::[a-zA-Z0-9_]+::[a-zA-Z0-9_]+$/.test(tokenType)) {
        return JSON.stringify({
            symbol: tokenType,
            name: tokenType,
            coinType: tokenType,
            decimals: 9,
            isVerifiedCoin: true
        });
    }

    // Convert to lowercase for case-insensitive comparison
    const normalizedTokenType = tokenType.toLowerCase();

    // Return SUI coin type directly if token is SUI
    if (
        normalizedTokenType === "sui" ||
        normalizedTokenType === "0x2::sui::sui"
    ) {
        return JSON.stringify({
            symbol: "SUI",
            name: "SUI",
            coinType: "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
            decimals: 9,
            isVerifiedCoin: true
        });
    }
    const afSdk = new Aftermath("MAINNET");

    try {
        // Use the new API endpoint for non-SUI tokens
        const response = await fetch(
            `https://api-ex.insidex.trade/search/coin/${tokenType}`,
            {
                headers: {
                    "X-API-Key": """", // Example of a custom header
                },
            }
        );
        const data = await response.json();

        // Check if the response contains the expected data
        if (!data || data.length === 0) {
            return `No coin type found for symbol ${tokenType}`
        }
        let verifiedCoins = await afSdk.Coin().getVerifiedCoins();
        let bestMatch = null;
        let highestMatchScore = 0;

        for (let i = 0; i < data.length; i++) {
            const entry = data[i];
            const isVerified = verifiedCoins.some(coinType => coinType === entry.coinType);
            let matchScore = 0;

            if (isVerified) {
                matchScore += 2; // Prioritize verified entries
            }
            if (entry.name.toLowerCase() === normalizedTokenType) {
                matchScore += 1;
            }
            if (entry.symbol.toLowerCase() === normalizedTokenType) {
                matchScore += 1;
            }

            if (matchScore > highestMatchScore) {
                highestMatchScore = matchScore;
                bestMatch = entry;
            }
        }

        if (!bestMatch) {
            return `No suitable coin type found for symbol ${tokenType}`;
        }

        const { symbol, name, coinType, decimals } = bestMatch;

        return JSON.stringify({
            symbol,
            name,
            coinType,
            decimals,
            isVerifiedCoin: verifiedCoins.includes(coinType)
        });
    } catch (error) {
        console.error("Error fetching token details:", error);
    }
}, {
    name: "get_full_coin_type_by_symbol",
    description: "Call to get token basic data by ticker or friendly name, returns fully qualified coinType, decimals and if the coin is verified.",
    schema: z.object({ tokenType: z.string().describe("The ticker or friendly name of the token.") })
}); 