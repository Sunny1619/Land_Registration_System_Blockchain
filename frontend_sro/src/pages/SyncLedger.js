import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const SyncLedger = ({ selectedNode }) => {
  const [nodeStatus, setNodeStatus] = useState(null);
  const [bootstrapStatus, setBootstrapStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, [selectedNode]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      // Fetch node status
      const nodeData = await api.sro.getStatus(selectedNode);
      setNodeStatus(nodeData);

      // Fetch bootstrap status
      const bootstrapData = await api.bootstrap.getStatus();
      setBootstrapStatus(bootstrapData);
    } catch (error) {
      console.error('Error fetching status:', error);
      toast.error('Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.sro.syncLedger(selectedNode);
      toast.success(result.message || 'Ledger synced successfully!');
      // Refresh status
      await fetchStatus();
    } catch (error) {
      console.error('Error syncing ledger:', error);
      toast.error('Failed to sync ledger');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading sync status...
      </div>
    );
  }

  const isOutOfSync = nodeStatus?.blockchain_length !== bootstrapStatus?.blockchain_length;

  return (
    <div>
      <h1 className="page-title">🔄 Sync Ledger</h1>

      {isOutOfSync && (
        <div className="alert alert-warning">
          <strong>⚠️ Warning:</strong> Your node is out of sync with the bootstrap node!
          Current: {nodeStatus?.blockchain_length || 0} blocks | 
          Bootstrap: {bootstrapStatus?.blockchain_length || 0} blocks
        </div>
      )}

      {!isOutOfSync && (
        <div className="alert alert-success">
          <strong>✅ Synchronized:</strong> Your node is in sync with the bootstrap node.
          ({nodeStatus?.blockchain_length || 0} blocks)
        </div>
      )}

      <div className="card">
        <h2>📊 Synchronization Status</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
          <div>
            <h3 style={{ color: '#1e3c72', marginBottom: '1rem' }}>🖥️ Your Node ({selectedNode})</h3>
            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
              <p><strong>Status:</strong> <span className="badge badge-completed">{nodeStatus?.status || 'Unknown'}</span></p>
              <p><strong>Blockchain Length:</strong> {nodeStatus?.blockchain_length || 0} blocks</p>
              <p><strong>Port:</strong> {nodeStatus?.port || 'N/A'}</p>
              <p><strong>Known Nodes:</strong> {nodeStatus?.known_nodes || 0}</p>
            </div>
          </div>

          <div>
            <h3 style={{ color: '#1e3c72', marginBottom: '1rem' }}>🌐 Bootstrap Node</h3>
            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
              <p><strong>Status:</strong> <span className="badge badge-completed">{bootstrapStatus?.status || 'Unknown'}</span></p>
              <p><strong>Blockchain Length:</strong> {bootstrapStatus?.blockchain_length || 0} blocks</p>
              <p><strong>Port:</strong> 5000</p>
              <p><strong>Authority Nodes:</strong> {bootstrapStatus?.authority_nodes || 0}</p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? '⏳ Syncing...' : '🔄 Sync with Bootstrap'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={fetchStatus}
            style={{ marginLeft: '1rem' }}
          >
            🔍 Check Status
          </button>
        </div>
      </div>

      <div className="card">
        <h2>ℹ️ About Ledger Synchronization</h2>
        <p style={{ marginTop: '1rem', lineHeight: '1.8', color: '#666' }}>
          In a distributed blockchain network, all nodes must maintain identical copies of the ledger.
          Synchronization ensures data consistency across the network.
        </p>
        
        <h3 style={{ marginTop: '1.5rem', color: '#333' }}>When to Sync:</h3>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '2rem', lineHeight: '1.8', color: '#666' }}>
          <li>After restarting a node</li>
          <li>When blockchain length differs from other nodes</li>
          <li>After network connectivity issues</li>
          <li>Periodically to ensure consistency</li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', color: '#333' }}>How It Works:</h3>
        <ol style={{ marginTop: '0.5rem', paddingLeft: '2rem', lineHeight: '1.8', color: '#666' }}>
          <li>Node requests current ledger from bootstrap node</li>
          <li>Bootstrap sends complete blockchain</li>
          <li>Node validates received blockchain</li>
          <li>If valid and longer, node replaces its local copy</li>
          <li>Node saves updated ledger to disk</li>
        </ol>

        <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
          <strong>💡 Tip:</strong> In a production system, nodes would automatically sync in the background.
          For this demo, manual sync helps you understand the process.
        </div>
      </div>
    </div>
  );
};

export default SyncLedger;
