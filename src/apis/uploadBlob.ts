import axios from 'axios';
import AWS from 'aws-sdk';
import { DEXTER_BLOB_TABLE, PUBLISHER_URL } from '../constants'; // Import the constants

// Configure AWS SDKe to your region
AWS.config.update({ region: 'ap-south-1' });
const dynamoDB = new AWS.DynamoDB.DocumentClient();

async function uploadAndSaveBlob(data: { userAddress: string, blobData: Object }) {
    const { userAddress, blobData } = data;

    if (!PUBLISHER_URL) {
        console.error("Error: PUBLISHER_URL is not set.");
        return;
    }

    try {
        const response = await axios.put(`${PUBLISHER_URL}/v1/blobs`, JSON.stringify(blobData), {
            headers: {
                'Content-Type': 'text/plain',
            },
        });

        let blobId;
        if (response.data.newlyCreated) {
            blobId = response.data.newlyCreated.blobObject.blobId;
        } else {
            blobId = response.data.alreadyCertified.blobId; // Assuming this is where the existing blobId is returned
        }

        // Put or update the entry in DynamoDB
        const putParams = {
            TableName: DEXTER_BLOB_TABLE,
            Item: {
                address: userAddress,
                blobId: blobId,
            },
        };

        await dynamoDB.put(putParams).promise();

        return { blobId }; // Return the blobId in both cases
    } catch (error) {
        console.error(`Error uploading string: ${error.message}`);
    }
}

export { uploadAndSaveBlob };