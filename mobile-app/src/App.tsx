import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import SalesPlatform from './pages/SalesPlatform'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Sales Platform - Main entry point */}
        <Route path="/" element={<SalesPlatform />} />
        <Route path="/sales/*" element={<SalesPlatform />} />

        {/* Legacy Analytics Dashboard */}
        <Route path="/analytics" element={<Dashboard />} />

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
