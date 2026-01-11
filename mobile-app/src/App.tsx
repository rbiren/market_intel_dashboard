import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import SalesPlatform from './pages/SalesPlatform'
import RepIntelPlatform from './pages/RepIntelPlatform'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page - Version Selector (A/B/C Testing) */}
        <Route path="/" element={<LandingPage />} />

        {/* Version A: Rep Intel Platform (NEW) */}
        <Route path="/rep-intel/*" element={<RepIntelPlatform />} />

        {/* Version B: Sales Hub (Current) */}
        <Route path="/sales/*" element={<SalesPlatform />} />

        {/* Version C: Analytics Dashboard (Legacy) */}
        <Route path="/analytics" element={<Dashboard />} />

        {/* Redirect unknown routes to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
