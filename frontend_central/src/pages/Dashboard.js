import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
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
      <h1 className="page-title">📊 Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Pending Transactions</h3>
          <div className="stat-value">{stats?.pending_transactions || 0}</div>
          <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>
            Awaiting SRO verification
          </p>
        </div>

        <div className="stat-card">
          <h3>SRO Verified</h3>
          <div className="stat-value">{stats?.verified_by_sro_pending || 0}</div>
          <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>
            Ready for blockchain
          </p>
        </div>

        <div className="stat-card">
          <h3>In Blockchain</h3>
          <div className="stat-value">{stats?.blockchain_verified || 0}</div>
          <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>
            Permanently recorded
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={() => navigate('/register')}>
            📝 Register New Land
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/transfer')}>
            🔄 Request Transfer
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/lands')}>
            🏞️ View All Lands
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/status')}>
            📋 Transaction Status
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/blockchain')}>
            ⛓️ View Blockchain
          </button>
        </div>
      </div>

      <div className="card">
        <h2>ℹ️ About This System</h2>
        <p style={{ lineHeight: '1.8', color: '#666' }}>
          This is a blockchain-based land registry system where:
        </p>
        <ul style={{ marginTop: '1rem', paddingLeft: '2rem', lineHeight: '1.8', color: '#666' }}>
          <li>Land registrations are submitted through this Central Service</li>
          <li>SRO (Sub-Registrar Office) nodes physically verify transactions</li>
          <li>Verified transactions are added to the blockchain through consensus voting</li>
          <li>All records are immutable and permanently stored on the blockchain</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
