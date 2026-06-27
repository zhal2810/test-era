const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

const cache = new NodeCache({ stdTTL: 60 }); 
const apiClient = axios.create({
    baseURL: 'https://api2.warera.io',
    headers: { 'Content-Type': 'application/json' }
});

const fetchTRPC = async (procedure, input) => {
    // Karena tRPC POST, kita kirim input sebagai JSON di body
    const url = `/trpc/${procedure}`;
    
    try {
        console.log(`[API POST] Requesting ${procedure} with input:`, input);
        const response = await apiClient.post(url, input);
        
        // tRPC biasanya membungkus data di dalam response.data.result.data
        return response.data.result.data;
    } catch (error) {
        console.error(`[API ERROR] ${procedure}:`, error.message);
        throw error;
    }
};

module.exports = { fetchTRPC };