import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// API service for Central Service
export const api = {
  // Register new land
  registerLand: async (landData) => {
    const response = await axios.post(`${API_BASE_URL}/land/register`, landData);
    return response.data;
  },

  // Request land transfer
  requestTransfer: async (transferData) => {
    const response = await axios.post(`${API_BASE_URL}/land/transfer`, transferData);
    return response.data;
  },

  // Get all lands
  getAllLands: async () => {
    const response = await axios.get(`${API_BASE_URL}/land/all`);
    return response.data; // Returns array directly
  },

  // Get all transactions
  getAllTransactions: async () => {
    const response = await axios.get(`${API_BASE_URL}/transactions/all`);
    return response.data; // Returns array directly
  },

  // Get transaction by ID
  getTransaction: async (txId) => {
    const response = await axios.get(`${API_BASE_URL}/transactions/${txId}`);
    return response.data;
  },

  // Get service statistics
  getStats: async () => {
    const response = await axios.get(`${API_BASE_URL}/status`);
    return response.data;
  },

  // Get blockchain
  getBlockchain: async () => {
    const response = await axios.get(`${API_BASE_URL}/blockchain`);
    return response.data;
  },
};

export default api;
