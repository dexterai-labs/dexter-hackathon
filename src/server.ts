import express from 'express';
import cors from 'cors'; // Import the CORS middleware
import { HumanMessage, AIMessage, ToolMessage, SystemMessage } from "@langchain/core/messages";
import { app as agentApp } from './agent.js'; // Assuming you export 'app' from agent.ts
import { isWhitelisted } from './whitelists/phase1.js';
import { readBlobFile } from './apis/readBlob'; // Import the readBlobFile function
import { uploadAndSaveBlob } from './apis/uploadBlob'; // Import the uploadAndSaveBlob function
import AWS from 'aws-sdk';
import { DEXTER_BLOB_TABLE } from './constants.js';
import { Role, Message } from './types'; // Import the Role enum and Message interface

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Configure AWS SDK
AWS.config.update({ region: 'ap-south-1' }); // Update with your region
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Define a type guard to check if the message is a ToolMessage with an artifact
function isToolMessageWithArtifact(message: any): boolean {
    return message instanceof ToolMessage;
}

// POST endpoint to handle user queries
app.post('/query', async (req, res) => {
    try {
        const userMessage = req.body.query;
        if (!userMessage) {
            return res.status(400).send({ error: 'Message is required' });
        }
        if (userMessage.length > 150) {
            return res.status(400).send({ error: 'Message cannot exceed 150 characters' });
        }

        // Extract wallet address from user message if it contains signerAddress
        let signerAddress = null;
        const signerMatch = userMessage.match(/signerAddress: (0x[a-fA-F0-9]+)/);
        if (signerMatch) {
            signerAddress = signerMatch[1];
        }

        if (!signerAddress || !isWhitelisted(signerAddress)) {
            return res.status(403).send({ error: 'You are not whitelisted' });
        }

        // Invoke the agent with the user's message
        const finalState = await agentApp.invoke({
            messages: [new HumanMessage('Hi Dexter, keep the response to the point & explain things briefly, following is the user message:' + userMessage)],
        });

        // Extract the last message content
        const lastMessageContent = finalState.messages[finalState.messages.length - 1].content;

        // Initialize artifact as null
        let artifact = null;

        // Iterate from the last message to the first to find the first non-null artifact in ToolMessages
        for (let i = finalState.messages.length - 1; i >= 0; i--) {
            if (isToolMessageWithArtifact(finalState.messages[i])) {
                artifact = (finalState.messages[i] as ToolMessage).artifact;
                if (artifact) {
                    break;
                }
            }
        }

        // Construct the response object
        const response = {
            content: lastMessageContent,
            artifact: artifact
        };

        // Send the response back to the client
        res.send(response);
    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

// POST endpoint to handle user queries with history
app.post('/query-with-history', async (req, res) => {
    try {
        // const jsonBody = JSON.parse(req.body);
        const query = req.body.query;
        const history = req.body.history;
        if (!query) {
            return res.status(400).send({ error: 'Query is required' });
        }
        if (query.length > 150) {
            return res.status(400).send({ error: 'Query cannot exceed 150 characters' });
        }

        // Extract wallet address from query if it contains signerAddress
        let signerAddress = null;
        const signerMatch = query.match(/signerAddress: (0x[a-fA-F0-9]+)/);
        if (signerMatch) {
            signerAddress = signerMatch[1];
        }

        if (!signerAddress || !isWhitelisted(signerAddress)) {
            return res.status(403).send({ error: 'You are not whitelisted' });
        }

        // Directly use the history as an array of Message objects
        const parsedHistory: Message[] = history;

        // Invoke the agent with the user's query and parsed history
        const finalState = await agentApp.invoke({
            messages: [
                // new SystemMessage('Hi Dexter, keep the response to the point & explain things briefly & in detail when required. Sound crypto degen. Last message in the list is users query, all other AI & human messages are part history context. Pick information from the history only when sufficient information is not present in the users latest query'),
                // ...parsedHistory.map(entry =>
                //     entry.role === Role.AI ?
                //         new AIMessage(entry.message) :
                //         new HumanMessage(entry.message)
                // ),
                new HumanMessage(query),
            ],
        });

        // Extract the last message content
        const lastMessageContent = finalState.messages[finalState.messages.length - 1].content;
        // Remove first entry from history
        parsedHistory.shift();

        // Add latest message as AI response to history
        parsedHistory.push({
            role: Role.AI,
            message: lastMessageContent.toString()
        });

        // Save updated history if we have a signer address
        if (signerAddress) {
            try {
                await uploadAndSaveBlob({
                    userAddress: signerAddress,
                    blobData: parsedHistory
                });
            } catch (err) {
                console.error('Error saving chat history:', err);
                // Continue execution even if save fails
            }
        }
        // Initialize artifact as null
        let artifact = null;

        // Iterate from the last message to the first to find the first non-null artifact in ToolMessages
        for (let i = finalState.messages.length - 1; i >= 0; i--) {
            if (isToolMessageWithArtifact(finalState.messages[i])) {
                artifact = (finalState.messages[i] as ToolMessage).artifact;
                if (artifact) {
                    break;
                }
            }
        }

        // Construct the response object
        const response = {
            content: lastMessageContent,
            artifact: artifact
        };

        // Send the response back to the client
        res.send(response);
    } catch (error) {
        console.error('Error processing query with history:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

// New endpoint to read a blob using userAddress
app.get('/blob/:userAddress', async (req, res) => {
    const userAddress = req.params.userAddress;

    try {
        // Fetch blobId from DynamoDB using userAddress
        const params = {
            TableName: DEXTER_BLOB_TABLE, // Replace with your table name
            Key: {
                address: userAddress
            }
        };

        const data = await dynamoDB.get(params).promise();
        const blobId = data.Item ? data.Item.blobId : null;

        if (!blobId) {
            return res.status(404).send({ error: 'Blob not found for the given user address' });
        }

        // Read the blob using the fetched blobId
        const blobData = await readBlobFile(blobId);
        // Return the blob data as the API response
        res.status(200).send({ message: 'Blob read successfully', data: blobData });
    } catch (error) {
        console.error('Error reading blob:', error);
        res.status(500).send({ error: 'Failed to read blob' });
    }
});

// New endpoint to upload a blob
app.post('/blob', async (req, res) => {
    const data = req.body;
    try {
        const result = await uploadAndSaveBlob(data);
        res.status(200).send({ message: 'Blob uploaded successfully', result });
    } catch (error) {
        console.error('Error uploading blob:', error);
        res.status(500).send({ error: 'Failed to upload blob' });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
});