import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';

const RequestTransfer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    land_id: '',
    seller: '',
    buyer: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await api.requestTransfer(formData);
      
      toast.success(`Transfer request submitted! Transaction ID: ${result.tx_id}`);

      // Reset form
      setFormData({
        land_id: '',
        seller: '',
        buyer: '',
      });

      // Navigate to status page
      setTimeout(() => {
        navigate('/status');
      }, 2000);
    } catch (error) {
      console.error('Error requesting transfer:', error);
      const errorMsg = error.response?.data?.error || 'Failed to request transfer';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">🔄 Request Land Transfer</h1>

      <div className="card">
        <h2>Transfer Request Form</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Submit a request to transfer land ownership. All fields are required.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="land_id">Land ID *</label>
            <input
              type="text"
              id="land_id"
              name="land_id"
              value={formData.land_id}
              onChange={handleChange}
              placeholder="e.g., LAND1234ABCD"
              required
            />
            <small>The unique ID of the land to transfer</small>
          </div>

          <div className="form-group">
            <label htmlFor="seller">Current Owner (Seller) *</label>
            <input
              type="text"
              id="seller"
              name="seller"
              value={formData.seller}
              onChange={handleChange}
              placeholder="e.g., Alice Sharma"
              required
            />
            <small>Must match the current owner exactly</small>
          </div>

          <div className="form-group">
            <label htmlFor="buyer">New Owner (Buyer) *</label>
            <input
              type="text"
              id="buyer"
              name="buyer"
              value={formData.buyer}
              onChange={handleChange}
              placeholder="e.g., Bob Kumar"
              required
            />
          </div>

          <div className="action-buttons">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : '✅ Submit Transfer Request'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>ℹ️ Transfer Process</h3>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Submit transfer request with valid Land ID and seller name</li>
          <li>SRO will verify the transfer documents physically</li>
          <li>After SRO verification, transaction will be added to blockchain</li>
          <li>Land ownership will be updated automatically after blockchain confirmation</li>
        </ol>
        <p style={{ marginTop: '1rem', color: '#666' }}>
          <strong>Note:</strong> You can find Land IDs in the "View Lands" page
        </p>
      </div>
    </div>
  );
};

export default RequestTransfer;
