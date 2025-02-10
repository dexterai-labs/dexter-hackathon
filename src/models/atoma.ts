import { AtomaSDK } from "atoma-sdk";
import { ChatCompletionMessage } from "atoma-sdk/models/components/chatcompletionmessage.js";

export class AtomaModel {
    private sdk: AtomaSDK;
    private model: string;
    private temperature: number;
    private tools: any[];

    constructor(config: {
        bearerAuth: string,
        model?: string,
        temperature?: number
    }) {
        this.sdk = new AtomaSDK({
            bearerAuth: config.bearerAuth
        });
        this.model = config.model;
        this.temperature = config.temperature;
        this.tools = [];
    }

    bindTools(tools: any[]) {
        this.tools = tools;
        return this;
    }

    async generate(messages: ChatCompletionMessage[]) {
        return await this.sdk.chat.create({
            messages,
            model: this.model,
            temperature: this.temperature,
            tools: this.tools,
            toolChoice: "auto"
        });
    }
}