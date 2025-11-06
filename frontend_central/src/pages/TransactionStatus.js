import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const TransactionStatus = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const data = await api.getAllTransactions();
      setTransactions(data); // data is already an array
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (tx) => {
    if (tx.block_hash) {
      return <span className="badge badge-completed">In Blockchain</span>;
    } else if (tx.verified_by_sro) {
      return <span className="badge badge-verified">SRO Verified</span>;
    } else {
      return <span className="badge badge-pending">Pending Verification</span>;
    }
  };

  const filteredTransactions = transactions.filter((tx) =>
    tx.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.land_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading transactions...
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">📋 Transaction Status</h1>

      <div className="card">
        <h2>Search Transactions</h2>
        <input
          type="text"
          placeholder="Search by Transaction ID or Land ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '2px solid #e0e0e0',
            fontSize: '1rem',
          }}
        />
      </div>

      <div className="card">
        <h2>All Transactions ({filteredTransactions.length})</h2>
        
        {filteredTransactions.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            {searchTerm ? 'No transactions found' : 'No transactions yet'}
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Type</th>
                  <th>Land ID</th>
                  <th>Details</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.transaction_id}>
                    <td>
                      <strong style={{ color: '#667eea' }}>
                        {tx.transaction_id}
                      </strong>
                    </td>
                    <td>
                      <span className="badge badge-pending">
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td>{tx.land_id}</td>
                    <td>
                      {tx.transaction_type === 'REGISTER' ? (
                        <div>
                          <strong>Owner:</strong> {tx.data?.owner || 'N/A'}<br />
                          <strong>Area:</strong> {tx.data?.area || 'N/A'}
                        </div>
                      ) : (
                        <div>
                          <strong>From:</strong> {tx.seller || 'N/A'}<br />
                          <strong>To:</strong> {tx.buyer || 'N/A'}
                        </div>
                      )}
                    </td>
                    <td>{new Date(tx.timestamp).toLocaleString()}</td>
                    <td>{getStatusBadge(tx)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>ℹ️ Transaction Status Explained</h3>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>
            <span className="badge badge-pending">Pending Verification</span> - 
            Awaiting physical verification by SRO
          </li>
          <li>
            <span className="badge badge-verified">SRO Verified</span> - 
            Documents verified, ready for blockchain
          </li>
          <li>
            <span className="badge badge-completed">In Blockchain</span> - 
            Permanently recorded on blockchain
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TransactionStatus;
