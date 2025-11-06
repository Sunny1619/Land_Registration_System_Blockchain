import axios from 'axios';

const CENTRAL_SERVICE_URL = 'http://localhost:8000';
const BOOTSTRAP_URL = 'http://localhost:5000';

// Get SRO node URL based on selected node
const getSRONodeURL = (nodeId) => {
  const portMap = {
    'SRO_NODE_1': 5001,
    'SRO_NODE_2': 5002,
    'SRO_NODE_3': 5003,
    'SRO_NODE_4': 5004,
    'SRO_NODE_5': 5005,
  };
  const port = portMap[nodeId] || 5001;
  return `http://localhost:${port}`;
};

// API service for SRO Portal
export const api = {
  // Central Service APIs
  central: {
    // Get unverified transactions (awaiting SRO physical verification)
    getUnverifiedTransactions: async () => {
      const response = await axios.get(`${CENTRAL_SERVICE_URL}/transactions/unverified`);
      return response.data;
    },

    // Get pending transactions (SRO verified, ready for blockchain)
    getPendingTransactions: async () => {
      const response = await axios.get(`${CENTRAL_SERVICE_URL}/transactions/pending`);
      return response.data;
    },

    // SRO physically verifies a transaction
    sroVerifyTransaction: async (txId, sroId) => {
      const response = await axios.put(
        `${CENTRAL_SERVICE_URL}/transactions/${txId}/sro-verify`,
        { sro_id: sroId }
      );
      return response.data;
    },

    // Get transaction details
    getTransaction: async (txId) => {
      const response = await axios.get(`${CENTRAL_SERVICE_URL}/transactions/${txId}`);
      return response.data;
    },

    // Get all transactions
    getAllTransactions: async () => {
      const response = await axios.get(`${CENTRAL_SERVICE_URL}/transactions/all`);
      return response.data;
    },

    // Get service status
    getStatus: async () => {
      const response = await axios.get(`${CENTRAL_SERVICE_URL}/status`);
      return response.data;
    },
  },

  // SRO Node APIs
  sro: {
    // Get node status
    getStatus: async (nodeId) => {
      const url = getSRONodeURL(nodeId);
      const response = await axios.get(`${url}/status`);
      return response.data;
    },

    // Get blockchain ledger
    getLedger: async (nodeId) => {
      const url = getSRONodeURL(nodeId);
      const response = await axios.get(`${url}/ledger`);
      return response.data;
    },

    // Propose a new block
    proposeBlock: async (nodeId, transactionIds) => {
      const url = getSRONodeURL(nodeId);
      const response = await axios.post(`${url}/propose`, {
        transaction_ids: transactionIds
      });
      return response.data;
    },

    // Sync ledger with bootstrap
    syncLedger: async (nodeId) => {
      const url = getSRONodeURL(nodeId);
      const response = await axios.get(`${url}/sync`);
      return response.data;
    },

    // Get node info
    getInfo: async (nodeId) => {
      const url = getSRONodeURL(nodeId);
      const response = await axios.get(`${url}/info`);
      return response.data;
    },
  },

  // Bootstrap Node APIs
  bootstrap: {
    // Get all registered nodes
    getNodes: async () => {
      const response = await axios.get(`${BOOTSTRAP_URL}/nodes`);
      return response.data;
    },

    // Get bootstrap ledger
    getLedger: async () => {
      const response = await axios.get(`${BOOTSTRAP_URL}/ledger`);
      return response.data;
    },

    // Get bootstrap status
    getStatus: async () => {
      const response = await axios.get(`${BOOTSTRAP_URL}/status`);
      return response.data;
    },
  },
};

export default api;
