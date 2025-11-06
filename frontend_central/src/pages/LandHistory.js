import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const LandHistory = () => {
  const [lands, setLands] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedLandId, setSelectedLandId] = useState('');
  const [landHistory, setLandHistory] = useState([]);
  const [landDetails, setLandDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [landsData, transactionsData] = await Promise.all([
        api.getAllLands(),
        api.getAllTransactions()
      ]);
      setLands(landsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLandSelect = (landId) => {
    setSelectedLandId(landId);
    
    // Get land details
    const land = lands.find(l => l.land_id === landId);
    setLandDetails(land);
    
    // Get all transactions for this land
    const history = transactions
      .filter(tx => tx.land_id === landId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    setLandHistory(history);
  };

  const handleSearch = () => {
    const land = lands.find(
      l => l.land_id.toLowerCase() === searchQuery.toLowerCase() ||
           l.survey_number?.toLowerCase() === searchQuery.toLowerCase()
    );
    
    if (land) {
      handleLandSelect(land.land_id);
      toast.success('Land found!');
    } else {
      toast.error('Land not found. Please check the Land ID or Survey Number.');
    }
  };

  const getOwnershipChain = () => {
    if (!landHistory.length) return [];
    
    const chain = [];
    let currentOwner = null;
    
    landHistory.forEach(tx => {
      if (tx.transaction_type === 'REGISTER') {
        const data = tx.data || {};
        currentOwner = data.owner;
        chain.push({
          type: 'REGISTERED',
          owner: currentOwner,
          timestamp: tx.timestamp,
          txId: tx.transaction_id,
          status: tx.status
        });
      } else if (tx.transaction_type === 'TRANSFER') {
        chain.push({
          type: 'TRANSFERRED',
          from: tx.seller,
          to: tx.buyer,
          timestamp: tx.timestamp,
          txId: tx.transaction_id,
          status: tx.status
        });
        currentOwner = tx.buyer;
      }
    });
    
    return chain;
  };

  const renderTransactionDetails = (tx) => {
    if (tx.transaction_type === 'REGISTER') {
      const data = tx.data || {};
      return (
        <div style={{ marginTop: '0.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '6px' }}>
          <p><strong>📝 Registration Details:</strong></p>
          <p>Survey Number: {data.survey_number || 'N/A'}</p>
          <p>Owner: {data.owner || 'N/A'}</p>
          <p>Area: {data.area || 'N/A'}</p>
          <p>Location: {data.location || 'N/A'}</p>
          <p>Property Type: {data.property_type || 'N/A'}</p>
        </div>
      );
    } else if (tx.transaction_type === 'TRANSFER') {
      return (
        <div style={{ marginTop: '0.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '6px' }}>
          <p><strong>🔄 Transfer Details:</strong></p>
          <p>From: {tx.seller || 'N/A'}</p>
          <p>To: {tx.buyer || 'N/A'}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading land data...
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">📜 Land History</h1>

      <div className="card">
        <h2>🔍 Search Land</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Enter Land ID or Survey Number to view complete history
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Enter Land ID (e.g., LAND12345678) or Survey Number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '8px',
              border: '2px solid #e0e0e0',
              fontSize: '1rem',
            }}
          />
          <button className="btn btn-primary" onClick={handleSearch}>
            Search
          </button>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Or select from list:
          </label>
          <select
            value={selectedLandId}
            onChange={(e) => handleLandSelect(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '2px solid #e0e0e0',
              fontSize: '1rem',
            }}
          >
            <option value="">-- Select a Land --</option>
            {lands.map(land => (
              <option key={land.land_id} value={land.land_id}>
                {land.land_id} - {land.owner} ({land.location})
              </option>
            ))}
          </select>
        </div>
      </div>

      {landDetails && (
        <>
          <div className="card">
            <h2>🏞️ Land Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <p><strong>Land ID:</strong></p>
                <p style={{ color: '#667eea', fontSize: '1.1rem' }}>{landDetails.land_id}</p>
              </div>
              <div>
                <p><strong>Survey Number:</strong></p>
                <p>{landDetails.survey_number || 'N/A'}</p>
              </div>
              <div>
                <p><strong>Current Owner:</strong></p>
                <p style={{ color: '#28a745', fontSize: '1.1rem', fontWeight: 'bold' }}>{landDetails.owner}</p>
              </div>
              <div>
                <p><strong>Area:</strong></p>
                <p>{landDetails.area}</p>
              </div>
              <div>
                <p><strong>Location:</strong></p>
                <p>{landDetails.location}</p>
              </div>
              <div>
                <p><strong>Property Type:</strong></p>
                <p>{landDetails.property_type}</p>
              </div>
              <div>
                <p><strong>Registered On:</strong></p>
                <p>{new Date(landDetails.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>👥 Ownership Chain</h2>
            <div style={{ marginTop: '1rem' }}>
              {getOwnershipChain().map((item, index) => (
                <div key={index} style={{ 
                  padding: '1rem', 
                  background: item.status === 'COMPLETED' ? '#d4edda' : '#fff3cd',
                  borderLeft: '4px solid ' + (item.status === 'COMPLETED' ? '#28a745' : '#ffc107'),
                  marginBottom: '1rem',
                  borderRadius: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {item.type === 'REGISTERED' ? (
                        <p style={{ margin: 0 }}>
                          <strong style={{ fontSize: '1.1rem' }}>📝 Registered</strong> by {item.owner}
                        </p>
                      ) : (
                        <p style={{ margin: 0 }}>
                          <strong style={{ fontSize: '1.1rem' }}>🔄 Transferred</strong> from {item.from} to {item.to}
                        </p>
                      )}
                      <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                        <code>{item.txId}</code>
                      </p>
                    </div>
                    <div>
                      <span className={`badge ${item.status === 'COMPLETED' ? 'badge-completed' : item.status === 'PENDING' ? 'badge-pending' : 'badge-verified'}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>📋 Complete Transaction History</h2>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              All transactions related to this land in chronological order
            </p>
            
            {landHistory.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                No transactions found for this land
              </p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Transaction ID</th>
                      <th>Type</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                      <th>Verified By</th>
                      <th>Block Hash</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {landHistory.map((tx, index) => (
                      <tr key={tx.transaction_id}>
                        <td>{index + 1}</td>
                        <td><code>{tx.transaction_id}</code></td>
                        <td>
                          <span className={`badge badge-${tx.transaction_type === 'REGISTER' ? 'register' : 'transfer'}`}>
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td>{new Date(tx.timestamp).toLocaleString()}</td>
                        <td>
                          <span className={`badge badge-${
                            tx.status === 'COMPLETED' ? 'completed' : 
                            tx.verified_by_sro ? 'verified' : 'pending'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td>
                          {tx.verifying_sro ? (
                            <span className="badge badge-verified">{tx.verifying_sro}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {tx.block_hash ? (
                            <code style={{ fontSize: '0.75rem' }}>{tx.block_hash.substring(0, 16)}...</code>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {renderTransactionDetails(tx)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!landDetails && (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <h3>👆 Select a land to view its history</h3>
            <p>Search by Land ID / Survey Number or select from the dropdown above</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandHistory;
