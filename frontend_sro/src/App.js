import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Import components
import NodeSelector from './components/NodeSelector';

// Import pages
import Dashboard from './pages/Dashboard';
import VerifyTransactions from './pages/VerifyTransactions';
import ProposeBlock from './pages/ProposeBlock';
import ViewBlockchain from './pages/ViewBlockchain';
import SyncLedger from './pages/SyncLedger';

function App() {
  const [selectedNode, setSelectedNode] = useState('SRO_NODE_1');

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <div className="nav-header">
              <h1 className="nav-title">🏛️ SRO Portal - Land Registry Blockchain</h1>
              <NodeSelector 
                selectedNode={selectedNode} 
                onNodeChange={setSelectedNode} 
              />
            </div>
            <ul className="nav-menu">
              <li><Link to="/">Dashboard</Link></li>
              <li><Link to="/verify">Verify Transactions</Link></li>
              <li><Link to="/propose">Propose Block</Link></li>
              <li><Link to="/blockchain">View Blockchain</Link></li>
              <li><Link to="/sync">Sync Ledger</Link></li>
            </ul>
          </div>
        </nav>

        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard selectedNode={selectedNode} />} />
            <Route path="/verify" element={<VerifyTransactions selectedNode={selectedNode} />} />
            <Route path="/propose" element={<ProposeBlock selectedNode={selectedNode} />} />
            <Route path="/blockchain" element={<ViewBlockchain selectedNode={selectedNode} />} />
            <Route path="/sync" element={<SyncLedger selectedNode={selectedNode} />} />
          </Routes>
        </div>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </Router>
  );
}

export default App;
