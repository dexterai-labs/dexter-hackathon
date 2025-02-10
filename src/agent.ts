import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { getTopGainers } from "./tools/getTopGainersTool.js";
import { getTokenBasicDataFromName } from "./tools/getTokenBasicDataFriendly.js";
import { getTradeRoute } from "./tools/getTradeRouteTool.js";
import { getTokenMarketData } from "./tools/getTokenMarketDataTool.js";
import { getCoinWalletBalanceTool } from "./tools/getCoinWalletBalanceTool.js";
import { getDollarValueTool } from "./tools/getDollarValueTool.js";
import { getTrendingCoins } from "./tools/getTrendingCoinsTool.js";
import { getTopBuyersByCoin } from "./tools/getTopBuyersByCoinTool.js";
import { getPriceByCoinType } from "./tools/getPriceByCoinTypeTool.js";
import { suiStakeTool } from "./tools/stakeSuiTool.js";
import { suiUnstakeTool } from "./tools/unstakeSuiTool.js";
// Define the tools for the agent to use
const tools = [
    getTopGainers,
    getTokenBasicDataFromName,
    getTradeRoute,
    // getWalletBalances,
    getCoinWalletBalanceTool,
    getTokenMarketData,
    getDollarValueTool,
    getTrendingCoins,
    getTopBuyersByCoin,
    getPriceByCoinType,
    suiStakeTool,
    suiUnstakeTool

];
const toolNode = new ToolNode(tools);

// Create a model and give it access to the tools
const model = new ChatOpenAI({
    configuration: {
        project: "",
        apiKey: "",
    }, model: "gpt-4o", temperature: 0.3, maxTokens: 1000
}).bindTools(tools);

// Define the function that determines whether to continue or not
function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.additional_kwargs.tool_calls && lastMessage.additional_kwargs.tool_calls.length > 0) {
        return "tools";
    }

    return "__end__";
}

// Define the function that calls the model
async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages);

    if (response.content) {
        response.content = (response.content as any).replace(/\n\n/g, "\n");
    }
    // We return a list, because this will get added to the existing list
    return { messages: [response] };
}

// Define a new graph
const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addEdge("__start__", "agent") // __start__ is a special name for the entrypoint
    .addNode("tools", toolNode)
    .addEdge("tools", "agent")
    .addConditionalEdges("agent", shouldContinue);

export const app = workflow.compile();