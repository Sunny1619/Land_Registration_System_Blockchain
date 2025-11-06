import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const VerifyTransactions = ({ selectedNode }) => {
  const [unverifiedTransactions, setUnverifiedTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);

  useEffect(() => {
    fetchUnverifiedTransactions();
  }, [selectedNode]);

  const fetchUnverifiedTransactions = async () => {
    setLoading(true);
    try {
      const data = await api.central.getUnverifiedTransactions();
      setUnverifiedTransactions(data.unverified_transactions || []);
    } catch (error) {
      console.error('Error fetching unverified transactions:', error);
      toast.error('Failed to load unverified transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (txId) => {
    setVerifying(txId);
    try {
      await api.central.sroVerifyTransaction(txId, selectedNode);
      toast.success(`Transaction ${txId} verified successfully!`);
      // Refresh the list
      await fetchUnverifiedTransactions();
    } catch (error) {
      console.error('Error verifying transaction:', error);
      toast.error('Failed to verify transaction');
    } finally {
      setVerifying(null);
    }
  };

  const renderTransactionDetails = (tx) => {
    if (tx.transaction_type === 'REGISTER') {
      const data = tx.data || {};
      return (
        <div className="transaction-details">
          <p><strong>Type:</strong> <span className="badge badge-register">Land Registration</span></p>
          <p><strong>Survey Number:</strong> {data.survey_number || 'N/A'}</p>
          <p><strong>Owner:</strong> {data.owner || 'N/A'}</p>
          <p><strong>Area:</strong> {data.area || 'N/A'}</p>
          <p><strong>Location:</strong> {data.location || 'N/A'}</p>
          <p><strong>Property Type:</strong> {data.property_type || 'N/A'}</p>
        </div>
      );
    } else if (tx.transaction_type === 'TRANSFER') {
      return (
        <div className="transaction-details">
          <p><strong>Type:</strong> <span className="badge badge-transfer">Land Transfer</span></p>
          <p><strong>Land ID:</strong> {tx.land_id || 'N/A'}</p>
          <p><strong>From (Seller):</strong> {tx.seller || 'N/A'}</p>
          <p><strong>To (Buyer):</strong> {tx.buyer || 'N/A'}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading unverified transactions...
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">✅ Verify Transactions</h1>

      <div className="card">
        <h2>🔍 Unverified Transactions ({unverifiedTransactions.length})</h2>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          These transactions are awaiting physical document verification at the SRO office.
          After verifying the legal documents, mark the transaction as verified.
        </p>

        {unverifiedTransactions.length === 0 ? (
          <div className="empty-state">
            <h3>✓ All Clear!</h3>
            <p>No unverified transactions at the moment.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Type</th>
                  <th>Land ID</th>
                  <th>Timestamp</th>
                  <th>Details</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {unverifiedTransactions.map(tx => (
                  <tr key={tx.transaction_id}>
                    <td><code>{tx.transaction_id}</code></td>
                    <td>
                      <span className={`badge badge-${tx.transaction_type === 'REGISTER' ? 'register' : 'transfer'}`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td><code>{tx.land_id}</code></td>
                    <td>{new Date(tx.timestamp).toLocaleString()}</td>
                    <td>
                      {renderTransactionDetails(tx)}
                    </td>
                    <td>
                      <button
                        className="btn btn-success"
                        onClick={() => handleVerify(tx.transaction_id)}
                        disabled={verifying === tx.transaction_id}
                      >
                        {verifying === tx.transaction_id ? '⏳ Verifying...' : '✅ Verify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>📋 Verification Process</h2>
        <ol style={{ marginTop: '1rem', paddingLeft: '2rem', lineHeight: '1.8', color: '#666' }}>
          <li>Citizen submits land registration/transfer request online</li>
          <li>Citizen visits SRO office with original documents (sale deed, identity proof, etc.)</li>
          <li><strong>SRO officer physically verifies all documents</strong></li>
          <li>If documents are valid, click "Verify" button above</li>
          <li>Transaction becomes eligible for blockchain inclusion</li>
          <li>SRO node can then propose a block with verified transactions</li>
        </ol>
      </div>
    </div>
  );
};

export default VerifyTransactions;
