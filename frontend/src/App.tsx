import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { ScannerTestPage } from './pages/ScannerTestPage';
import { AddClientPage } from './pages/AddClientPage';
import { AddContractPage } from './pages/AddContractPage';

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>ScannerDoc</h1>
        <nav>
          <NavLink to="/scanner" end>Scanner test</NavLink>
          <NavLink to="/clients/new">Add client</NavLink>
          <NavLink to="/contracts/new">Add contract</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/scanner" replace />} />
        <Route path="/scanner" element={<ScannerTestPage />} />
        <Route path="/clients" element={<AddClientPage />} />
        <Route path="/clients/new" element={<AddClientPage />} />
        <Route path="/contracts" element={<AddContractPage />} />
        <Route path="/contracts/new" element={<AddContractPage />} />
        <Route path="*" element={<Navigate to="/scanner" replace />} />
      </Routes>
    </div>
  );
}
