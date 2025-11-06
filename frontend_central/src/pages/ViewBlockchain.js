import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const ViewBlockchain = () => {
  const [blockchain, setBlockchain] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockchain();
  }, []);

  const fetchBlockchain = async () => {
    try {
      const data = await api.getBlockchain();
      setBlockchain(data);
    } catch (error) {
      console.error('Error fetching blockchain:', error);
      toast.error('Failed to load blockchain');
    } finally {
      setLoading(false);
    }
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
      <div>
        <h1 className="page-title">⛓️ Blockchain Ledger</h1>
        <div className="card">
          <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            Unable to load blockchain data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">⛓️ Blockchain Ledger</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Chain Length</h3>
          <div className="stat-value">{blockchain.length || 0}</div>
          <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>Total blocks</p>
        </div>

        <div className="stat-card">
          <h3>Total Transactions</h3>
          <div className="stat-value">
            {blockchain.chain?.reduce((sum, block) => sum + (block.transactions?.length || 0), 0) || 0}
          </div>
          <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>Across all blocks</p>
        </div>

        <div className="stat-card">
          <h3>Blockchain Status</h3>
          <div className="stat-value">
            {blockchain.length > 0 ? '✅' : '⚠️'}
          </div>
          <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>
            {blockchain.length > 0 ? 'Active' : 'Empty'}
          </p>
        </div>
      </div>

      <div className="blockchain-container">
        {blockchain.chain?.map((block) => (
          <div key={block.index} className="block">
            <h3>Block #{block.index}</h3>
            
            <div className="block-info">
              <div className="block-info-item">
                <strong>Block Hash</strong>
                <code style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>
                  {block.block_hash}
                </code>
              </div>
              
              <div className="block-info-item">
                <strong>Previous Hash</strong>
                <code style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>
                  {block.previous_hash}
                </code>
              </div>
              
              <div className="block-info-item">
                <strong>Authority Signature</strong>
                <code style={{ fontSize: '0.85rem' }}>
                  {block.authority_signature}
                </code>
              </div>
              
              <div className="block-info-item">
                <strong>Timestamp</strong>
                <span>{new Date(block.timestamp).toLocaleString()}</span>
              </div>
              
              <div className="block-info-item">
                <strong>Nonce</strong>
                <span>{block.nonce}</span>
              </div>
              
              <div className="block-info-item">
                <strong>Transactions</strong>
                <span>{block.transactions?.length || 0}</span>
              </div>
            </div>

            {block.transactions && block.transactions.length > 0 && (
              <div className="transactions-list">
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Transactions in this block:
                </strong>
                {block.transactions.map((tx, idx) => (
                  <div key={idx} className="transaction-item">
                    <strong style={{ color: '#667eea' }}>
                      {tx.tx_id || 'N/A'}
                    </strong>
                    {' - '}
                    <span className="badge badge-pending">
                      {tx.type || 'UNKNOWN'}
                    </span>
                    {' '}
                    <span style={{ color: '#666' }}>
                      Land: {tx.land_id || 'N/A'}
                    </span>
                    {tx.type === 'REGISTER' && tx.land_details && (
                      <div style={{ marginTop: '0.25rem', fontSize: '0.9rem', color: '#666' }}>
                        Owner: {tx.land_details.owner}, Area: {tx.land_details.area}
                      </div>
                    )}
                    {tx.type === 'TRANSFER' && (
                      <div style={{ marginTop: '0.25rem', fontSize: '0.9rem', color: '#666' }}>
                        {tx.seller} → {tx.buyer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h3>ℹ️ About Blockchain</h3>
        <p style={{ lineHeight: '1.8', color: '#666' }}>
          This blockchain ledger shows all blocks that have been added through consensus voting.
          Each block contains one or more verified transactions. The chain is maintained by
          authority nodes (SRO nodes and Bootstrap) using a voting-based consensus mechanism.
        </p>
      </div>
    </div>
  );
};

export default ViewBlockchain;
