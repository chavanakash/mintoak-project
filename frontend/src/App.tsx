import { Routes, Route, Link } from 'react-router-dom';
import Merchants from './pages/Merchants';
import Transactions from './pages/Transactions';

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Mintoak Clone — Merchant Dashboard</h1>
        <nav style={{ display: 'flex', gap: 16 }}>
          <Link to="/">Merchants</Link>
          <Link to="/transactions">Transactions</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Merchants />} />
        <Route path="/transactions" element={<Transactions />} />
      </Routes>
    </div>
  );
}
