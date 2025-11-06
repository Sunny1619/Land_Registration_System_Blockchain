import React, { useState, useEffect } from 'react';
import api from '../services/api';
import axios from 'axios';

const NodeSelector = ({ selectedNode, onNodeChange }) => {
  const [availableNodes, setAvailableNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to check if a node is running
  const checkNodeStatus = async (nodeId, port) => {
    try {
      const response = await axios.get(`http://localhost:${port}/status`, { timeout: 2000 });
      return { nodeId, port, running: true, data: response.data };
    } catch (err) {
      return { nodeId, port, running: false };
    }
  };

  // Fetch running nodes on component mount
  useEffect(() => {
    const fetchRunningNodes = async () => {
      setLoading(true);
      setError(null);

      try {
        // First, try to get registered nodes from bootstrap
        const bootstrapResponse = await api.bootstrap.getNodes();
        
        // Convert nodes object to array
        let registeredNodes = [];
        if (bootstrapResponse.nodes && typeof bootstrapResponse.nodes === 'object') {
          registeredNodes = Object.values(bootstrapResponse.nodes)
            .filter(node => node.node_id !== 'BOOTSTRAP'); // Exclude bootstrap itself
        }

        // Check which nodes are actually running
        const nodeChecks = registeredNodes.map(node => {
          const port = parseInt(node.url.split(':').pop());
          return checkNodeStatus(node.node_id, port);
        });

        const results = await Promise.all(nodeChecks);
        const runningNodes = results
          .filter(node => node.running)
          .map(node => ({
            id: node.nodeId,
            name: node.nodeId.replace(/_/g, ' '),
            port: node.port,
          }));

        if (runningNodes.length === 0) {
          // Fallback: Check default ports if bootstrap returns no running nodes
          const defaultPorts = [5001, 5002, 5003, 5004, 5005];
          const defaultChecks = defaultPorts.map((port, index) => 
            checkNodeStatus(`SRO_NODE_${index + 1}`, port)
          );

          const defaultResults = await Promise.all(defaultChecks);
          const fallbackNodes = defaultResults
            .filter(node => node.running)
            .map(node => ({
              id: node.nodeId,
              name: node.nodeId.replace(/_/g, ' '),
              port: node.port,
            }));

          setAvailableNodes(fallbackNodes);
        } else {
          setAvailableNodes(runningNodes);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching nodes:', err);
        
        // Fallback: Check default ports directly
        const defaultPorts = [5001, 5002, 5003, 5004, 5005];
        const defaultChecks = defaultPorts.map((port, index) => 
          checkNodeStatus(`SRO_NODE_${index + 1}`, port)
        );

        const defaultResults = await Promise.all(defaultChecks);
        const fallbackNodes = defaultResults
          .filter(node => node.running)
          .map(node => ({
            id: node.nodeId,
            name: node.nodeId.replace(/_/g, ' '),
            port: node.port,
          }));

        setAvailableNodes(fallbackNodes);
        setLoading(false);
      }
    };

    fetchRunningNodes();

    // Refresh node list every 30 seconds
    const interval = setInterval(fetchRunningNodes, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-select first available node if current selection is not available
  useEffect(() => {
    if (availableNodes.length > 0 && !availableNodes.find(n => n.id === selectedNode)) {
      onNodeChange(availableNodes[0].id);
    }
  }, [availableNodes, selectedNode, onNodeChange]);

  if (loading) {
    return (
      <div className="node-selector">
        <label><strong>🖥️ Select SRO Node:</strong></label>
        <div className="loading">Loading available nodes...</div>
      </div>
    );
  }

  if (error || availableNodes.length === 0) {
    return (
      <div className="node-selector">
        <label><strong>🖥️ Select SRO Node:</strong></label>
        <div className="error">
          ⚠️ No running nodes found. Please start at least one SRO node.
        </div>
      </div>
    );
  }

  return (
    <div className="node-selector">
      <label htmlFor="node-select">
        <strong>🖥️ Select SRO Node:</strong>
        <span style={{ fontSize: '0.85em', marginLeft: '10px', color: '#28a745' }}>
          ({availableNodes.length} node{availableNodes.length !== 1 ? 's' : ''} online)
        </span>
      </label>
      <select 
        id="node-select"
        value={selectedNode} 
        onChange={(e) => onNodeChange(e.target.value)}
        className="node-select"
      >
        {availableNodes.map(node => (
          <option key={node.id} value={node.id}>
            {node.name} (Port {node.port})
          </option>
        ))}
      </select>
    </div>
  );
};

export default NodeSelector;
