import axios from 'axios';
import { AGGREGATOR_URL } from '../constants';

// Function to read a blob file using axios
async function readBlobFile(blobId: string, aggregator: string = AGGREGATOR_URL) {
    if (!aggregator) {
        console.error("Error: AGGREGATOR environment variable is not set.");
        return;
    }

    try {
        const response = await axios.get(`${aggregator}/v1/blobs/${blobId}`);

        // Return the blob data instead of logging it
        return response.data;
    } catch (error) {
        console.error(`Error reading blob: ${error.message}`);
        throw error; // Re-throw the error to handle it in the calling function
    }
}

export { readBlobFile };