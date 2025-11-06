import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const ProposeBlock = ({ selectedNode }) => {
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [selectedTxs, setSelectedTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [lastProposal, setLastProposal] = useState(null);

  useEffect(() => {
    fetchPendingTransactions();
  }, [selectedNode]);

  const fetchPendingTransactions = async () => {
    setLoading(true);
    try {
      const data = await api.central.getPendingTransactions();
      setPendingTransactions(data.pending_transactions || []);
      setSelectedTxs([]);
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
      toast.error('Failed to load pending transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedTxs.length === pendingTransactions.length) {
      setSelectedTxs([]);
    } else {
      setSelectedTxs(pendingTransactions.map(tx => tx.transaction_id));
    }
  };

  const handleSelectTx = (txId) => {
    if (selectedTxs.includes(txId)) {
      setSelectedTxs(selectedTxs.filter(id => id !== txId));
    } else {
      setSelectedTxs([...selectedTxs, txId]);
    }
  };

  const handleProposeBlock = async () => {
    if (selectedTxs.length === 0) {
      toast.warning('Please select at least one transaction');
      return;
    }

    setProposing(true);
    try {
      const result = await api.sro.proposeBlock(selectedNode, selectedTxs);
      
      setLastProposal(result);
      
      if (result.message && result.message.includes('accepted')) {
        toast.success(`Block accepted! (${result.accept_count}/${result.total_votes} votes)`);
      } else {
        toast.error(`Block rejected (${result.accept_count}/${result.total_votes} votes)`);
      }
      
      // Refresh the list
      await fetchPendingTransactions();
    } catch (error) {
      console.error('Error proposing block:', error);
      const errorMsg = error.response?.data?.message || 'Failed to propose block';
      toast.error(errorMsg);
      
      // If there's vote information in the error, show it
      if (error.response?.data) {
        setLastProposal(error.response.data);
      }
    } finally {
      setProposing(false);
    }
  };

  const renderTransactionDetails = (tx) => {
    if (tx.transaction_type === 'REGISTER') {
      const data = tx.data || {};
      return (
        <div className="transaction-details">
          <p><strong>Survey Number:</strong> {data.survey_number || 'N/A'}</p>
          <p><strong>Owner:</strong> {data.owner || 'N/A'}</p>
          <p><strong>Area:</strong> {data.area || 'N/A'}</p>
          <p><strong>Location:</strong> {data.location || 'N/A'}</p>
        </div>
      );
    } else if (tx.transaction_type === 'TRANSFER') {
      return (
        <div className="transaction-details">
          <p><strong>Land ID:</strong> {tx.land_id}</p>
          <p><strong>From:</strong> {tx.seller || 'N/A'}</p>
          <p><strong>To:</strong> {tx.buyer || 'N/A'}</p>
        </div>
      );
    }
    return null;
  };

  const renderVotingResults = () => {
    if (!lastProposal || !lastProposal.votes) return null;

    const votes = lastProposal.votes;
    const isAccepted = lastProposal.accept_count >= Math.ceil(lastProposal.total_votes / 2);

    return (
      <div className={`alert ${isAccepted ? 'alert-success' : 'alert-warning'}`}>
        <h3>🗳️ Last Voting Results</h3>
        <p>
          <strong>Status:</strong> {isAccepted ? '✅ ACCEPTED' : '❌ REJECTED'} 
          ({lastProposal.accept_count}/{lastProposal.total_votes} votes)
        </p>
        <div style={{ marginTop: '1rem' }}>
          <strong>Vote Breakdown:</strong>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '2rem' }}>
            {Object.entries(votes).map(([nodeId, vote]) => (
              <li key={nodeId}>
                <strong>{nodeId}:</strong> {vote === 'ACCEPT' ? '✅' : '❌'} {vote}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading pending transactions...
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">📦 Propose Block</h1>

      {renderVotingResults()}

      <div className="card">
        <h2>✅ SRO-Verified Transactions ({pendingTransactions.length})</h2>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          These transactions have been physically verified by an SRO and are ready to be added to the blockchain.
          Select transactions and propose a block to initiate consensus voting.
        </p>

        {pendingTransactions.length === 0 ? (
          <div className="empty-state">
            <h3>📭 No Pending Transactions</h3>
            <p>All verified transactions have been added to the blockchain.</p>
          </div>
        ) : (
          <>
            <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleSelectAll}
              >
                {selectedTxs.length === pendingTransactions.length ? '❌ Deselect All' : '✅ Select All'}
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleProposeBlock}
                disabled={proposing || selectedTxs.length === 0}
                style={{ marginLeft: '1rem' }}
              >
                {proposing ? '⏳ Proposing...' : `📦 Propose Block (${selectedTxs.length} selected)`}
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input 
                        type="checkbox" 
                        checked={selectedTxs.length === pendingTransactions.length && pendingTransactions.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Transaction ID</th>
                    <th>Type</th>
                    <th>Land ID</th>
                    <th>Verified By</th>
                    <th>Timestamp</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTransactions.map(tx => (
                    <tr key={tx.transaction_id}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedTxs.includes(tx.transaction_id)}
                          onChange={() => handleSelectTx(tx.transaction_id)}
                        />
                      </td>
                      <td><code>{tx.transaction_id}</code></td>
                      <td>
                        <span className={`badge badge-${tx.transaction_type === 'REGISTER' ? 'register' : 'transfer'}`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td><code>{tx.land_id}</code></td>
                      <td><span className="badge badge-verified">{tx.verifying_sro || 'N/A'}</span></td>
                      <td>{new Date(tx.timestamp).toLocaleString()}</td>
                      <td>
                        {renderTransactionDetails(tx)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>🗳️ Block Proposal & Consensus</h2>
        <p style={{ marginTop: '1rem', lineHeight: '1.8', color: '#666' }}>
          When you propose a block:
        </p>
        <ol style={{ marginTop: '1rem', paddingLeft: '2rem', lineHeight: '1.8', color: '#666' }}>
          <li>Your node creates a new block with selected transactions</li>
          <li>Block is broadcast to all other authority nodes for voting</li>
          <li>Each node validates the block and votes ACCEPT or REJECT</li>
          <li>If majority votes ACCEPT (≥ N/2), block is added to blockchain</li>
          <li>All nodes update their ledgers with the new block</li>
          <li>Transactions are marked as "COMPLETED" in central database</li>
        </ol>
      </div>
    </div>
  );
};

export default ProposeBlock;
