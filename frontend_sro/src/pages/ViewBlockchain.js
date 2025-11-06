import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const ViewBlockchain = ({ selectedNode }) => {
  const [blockchain, setBlockchain] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockchain();
  }, [selectedNode]);

  const fetchBlockchain = async () => {
    setLoading(true);
    try {
      const data = await api.sro.getLedger(selectedNode);
      setBlockchain(data);
    } catch (error) {
      console.error('Error fetching blockchain:', error);
      toast.error('Failed to load blockchain');
    } finally {
      setLoading(false);
    }
  };

  const renderTransactionDetails = (tx) => {
    if (tx.type === 'REGISTER') {
      const data = tx.land_details || {};
      return (
        <div style={{ padding: '0.5rem', background: '#f8f9fa', borderRadius: '4px', marginTop: '0.5rem' }}>
          <p><strong>Survey Number:</strong> {data.survey_number || 'N/A'}</p>
          <p><strong>Owner:</strong> {data.owner || 'N/A'}</p>
          <p><strong>Area:</strong> {data.area || 'N/A'}</p>
          <p><strong>Location:</strong> {data.location || 'N/A'}</p>
          <p><strong>Property Type:</strong> {data.property_type || 'N/A'}</p>
        </div>
      );
    } else if (tx.type === 'TRANSFER') {
      return (
        <div style={{ padding: '0.5rem', background: '#f8f9fa', borderRadius: '4px', marginTop: '0.5rem' }}>
          <p><strong>Land ID:</strong> {tx.land_id}</p>
          <p><strong>From:</strong> {tx.seller || 'N/A'}</p>
          <p><strong>To:</strong> {tx.buyer || 'N/A'}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading blockchain...
      </div>
    );
  }

  if (!blockchain || !blockchain.chain) {
    return (
      <div className="card">
        <h2>⛓️ Blockchain Ledger</h2>
        <div className="empty-state">
          <h3>❌ Error</h3>
          <p>Failed to load blockchain data.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">⛓️ Blockchain Ledger - {selectedNode}</h1>

      <div className="card">
        <h2>📊 Blockchain Info</h2>
        <div style={{ marginTop: '1rem' }}>
          <p><strong>Chain Length:</strong> {blockchain.length} blocks</p>
          <p><strong>Status:</strong> {blockchain.length > 0 ? '✅ Active' : '⚠️ Empty'}</p>
          <p><strong>Last Updated:</strong> {new Date().toLocaleString()}</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={fetchBlockchain}
          style={{ marginTop: '1rem' }}
        >
          🔄 Refresh
        </button>
      </div>

      <div className="blockchain-container">
        {blockchain.chain.map((block, index) => (
          <div key={index} className="block">
            <h3>
              Block #{block.index} 
              {block.index === 0 && ' (Genesis Block)'}
              {block.index === blockchain.length - 1 && block.index !== 0 && ' (Latest)'}
            </h3>
            
            <div className="block-info">
              <div className="block-info-item">
                <strong>Timestamp</strong>
                <div>{new Date(block.timestamp).toLocaleString()}</div>
              </div>
              
              <div className="block-info-item">
                <strong>Authority</strong>
                <div><span className="badge badge-verified">{block.authority_signature || 'GENESIS'}</span></div>
              </div>
              
              <div className="block-info-item">
                <strong>Transactions</strong>
                <div>{block.transactions.length}</div>
              </div>
              
              <div className="block-info-item">
                <strong>Nonce</strong>
                <div>{block.nonce}</div>
              </div>
            </div>

            <div className="block-info">
              <div className="block-info-item" style={{ gridColumn: '1 / -1' }}>
                <strong>Block Hash</strong>
                <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {block.block_hash}
                </div>
              </div>
              
              <div className="block-info-item" style={{ gridColumn: '1 / -1' }}>
                <strong>Previous Hash</strong>
                <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {block.previous_hash}
                </div>
              </div>
            </div>

            {block.transactions.length > 0 && (
              <div className="transactions-list">
                <strong>📋 Transactions:</strong>
                {block.transactions.map((tx, txIndex) => (
                  <div key={txIndex} className="transaction-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <strong>{txIndex + 1}. </strong>
                        <code>{tx.tx_id}</code>
                      </div>
                      <span className={`badge badge-${tx.type === 'REGISTER' ? 'register' : 'transfer'}`}>
                        {tx.type}
                      </span>
                    </div>
                    <p><strong>Land ID:</strong> {tx.land_id}</p>
                    <p><strong>Verified By:</strong> <span className="badge badge-verified">{tx.verifier || 'N/A'}</span></p>
                    <p><strong>Timestamp:</strong> {new Date(tx.timestamp).toLocaleString()}</p>
                    {renderTransactionDetails(tx)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>ℹ️ Understanding the Blockchain</h2>
        <ul style={{ marginTop: '1rem', paddingLeft: '2rem', lineHeight: '1.8', color: '#666' }}>
          <li><strong>Block Hash:</strong> Unique identifier calculated from block contents</li>
          <li><strong>Previous Hash:</strong> Links this block to the previous one, forming a chain</li>
          <li><strong>Authority Signature:</strong> Identifies which SRO node created this block</li>
          <li><strong>Transactions:</strong> Land registrations and transfers included in this block</li>
          <li><strong>Immutable:</strong> Once added, blocks cannot be modified without breaking the chain</li>
        </ul>
      </div>
    </div>
  );
};

export default ViewBlockchain;
