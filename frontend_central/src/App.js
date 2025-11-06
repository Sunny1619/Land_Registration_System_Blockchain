import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Import pages
import Dashboard from './pages/Dashboard';
import RegisterLand from './pages/RegisterLand';
import RequestTransfer from './pages/RequestTransfer';
import ViewLands from './pages/ViewLands';
import LandHistory from './pages/LandHistory';
import TransactionStatus from './pages/TransactionStatus';
import ViewBlockchain from './pages/ViewBlockchain';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <h1 className="nav-title">🏛️ Land Registry - Central Service</h1>
            <ul className="nav-menu">
              <li><Link to="/">Dashboard</Link></li>
              <li><Link to="/register">Register Land</Link></li>
              <li><Link to="/transfer">Request Transfer</Link></li>
              <li><Link to="/lands">View Lands</Link></li>
              <li><Link to="/history">Land History</Link></li>
              <li><Link to="/status">Transaction Status</Link></li>
              <li><Link to="/blockchain">Blockchain</Link></li>
            </ul>
          </div>
        </nav>

        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/register" element={<RegisterLand />} />
            <Route path="/transfer" element={<RequestTransfer />} />
            <Route path="/lands" element={<ViewLands />} />
            <Route path="/history" element={<LandHistory />} />
            <Route path="/status" element={<TransactionStatus />} />
            <Route path="/blockchain" element={<ViewBlockchain />} />
          </Routes>
        </div>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </Router>
  );
}

export default App;
