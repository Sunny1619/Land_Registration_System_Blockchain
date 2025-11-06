import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';

const Dashboard = ({ selectedNode }) => {
  const navigate = useNavigate();
  const [nodeStatus, setNodeStatus] = useState(null);
  const [centralStatus, setCentralStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedNode]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch node status
      const nodeData = await api.sro.getStatus(selectedNode);
      setNodeStatus(nodeData);

      // Fetch central service status
      const centralData = await api.central.getStatus();
      setCentralStatus(centralData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">📊 SRO Dashboard - {selectedNode}</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Blockchain Length</h3>
          <div className="stat-value">{nodeStatus?.blockchain_length || 0}</div>
          <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>
            Total blocks in chain
          </p>
        </div>

        <div className="stat-card">
          <h3>Unverified Transactions</h3>
          <div className="stat-value">{centralStatus?.pending_transactions || 0}</div>
          <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>
            Awaiting SRO verification
          </p>
        </div>

        <div className="stat-card">
          <h3>Ready for Blockchain</h3>
          <div className="stat-value">{centralStatus?.verified_by_sro_pending || 0}</div>
          <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>
            SRO verified, can be proposed
          </p>
        </div>

        <div className="stat-card">
          <h3>Blockchain Verified</h3>
          <div className="stat-value">{centralStatus?.blockchain_verified || 0}</div>
          <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>
            Added to blockchain
          </p>
        </div>
      </div>

      <div className="card">
        <h2>🖥️ Node Information</h2>
        <div style={{ marginTop: '1rem' }}>
          <p><strong>Node ID:</strong> {nodeStatus?.node_id || selectedNode}</p>
          <p><strong>Port:</strong> {nodeStatus?.port || 'N/A'}</p>
          <p><strong>Status:</strong> <span className="badge badge-completed">{nodeStatus?.status || 'Unknown'}</span></p>
          <p><strong>Known Nodes:</strong> {nodeStatus?.known_nodes || 0}</p>
        </div>
      </div>

      <div className="card">
        <h2>⚡ Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button className="btn btn-warning" onClick={() => navigate('/verify')}>
            ✅ Verify Transactions
          </button>
          <button className="btn btn-success" onClick={() => navigate('/propose')}>
            📦 Propose Block
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/blockchain')}>
            ⛓️ View Blockchain
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/sync')}>
            🔄 Sync Ledger
          </button>
        </div>
      </div>

      <div className="card">
        <h2>ℹ️ SRO Node Functions</h2>
        <ul style={{ marginTop: '1rem', paddingLeft: '2rem', lineHeight: '1.8', color: '#666' }}>
          <li><strong>Verify Transactions:</strong> Physically verify land registration/transfer documents and mark transactions as verified</li>
          <li><strong>Propose Blocks:</strong> Create new blocks with verified transactions and initiate consensus voting</li>
          <li><strong>Vote on Proposals:</strong> Automatically vote on block proposals from other SRO nodes (happens in background)</li>
          <li><strong>Maintain Ledger:</strong> Keep blockchain ledger synchronized across all authority nodes</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
