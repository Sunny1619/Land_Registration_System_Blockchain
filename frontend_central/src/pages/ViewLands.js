import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const ViewLands = () => {
  const [lands, setLands] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLands();
  }, []);

  const fetchLands = async () => {
    try {
      const [landsData, transactionsData] = await Promise.all([
        api.getAllLands(),
        api.getAllTransactions()
      ]);
      setLands(landsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error fetching lands:', error);
      toast.error('Failed to load lands');
    } finally {
      setLoading(false);
    }
  };

  // Get the verification status for a land based on its transactions
  const getLandStatus = (landId) => {
    // Find REGISTER transaction for this land
    const registerTx = transactions.find(
      tx => tx.land_id === landId && tx.transaction_type === 'REGISTER'
    );
    
    if (!registerTx) {
      return { status: 'Unknown', badge: 'badge-pending' };
    }

    if (registerTx.status === 'COMPLETED' || registerTx.block_hash) {
      return { status: 'On Blockchain', badge: 'badge-completed' };
    } else if (registerTx.verified_by_sro) {
      return { status: 'SRO Verified', badge: 'badge-verified' };
    } else {
      return { status: 'Pending Verification', badge: 'badge-pending' };
    }
  };

  const filteredLands = lands.filter((land) =>
    land.land_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    land.owner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    land.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading lands...
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">🏞️ All Registered Lands</h1>

      <div className="card">
        <h2>Search Lands</h2>
        <input
          type="text"
          placeholder="Search by Land ID, Owner, or Location..."
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
        <h2>Lands Registry ({filteredLands.length})</h2>
        
        {filteredLands.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            {searchTerm ? 'No lands found matching your search' : 'No lands registered yet'}
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Land ID</th>
                  <th>Owner</th>
                  <th>Area</th>
                  <th>Location</th>
                  <th>Property Type</th>
                  <th>Registered</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLands.map((land) => (
                  <tr key={land.land_id}>
                    <td>
                      <strong style={{ color: '#667eea' }}>{land.land_id}</strong>
                    </td>
                    <td>{land.owner}</td>
                    <td>{land.area}</td>
                    <td>{land.location}</td>
                    <td>
                      <span className="badge badge-pending">
                        {land.property_type}
                      </span>
                    </td>
                    <td>{new Date(land.created_at).toLocaleDateString()}</td>
                    <td>
                      {(() => {
                        const landStatus = getLandStatus(land.land_id);
                        return (
                          <span className={`badge ${landStatus.badge}`}>
                            {landStatus.status}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewLands;
