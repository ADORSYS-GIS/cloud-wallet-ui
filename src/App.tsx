import { CredentialDetailPage } from './pages/CredentialDetailPage'
import { CredentialsPage } from './pages/CredentialsPage'
import { HomePage } from './pages/HomePage'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { ScanPage } from './pages/ScanPage'
import { routes } from './constants/routes'

function App() {
  return (
    <Router>
      <Routes>
        <Route path={routes.home} element={<HomePage />} />
        <Route path={routes.scan} element={<ScanPage />} />
        <Route path={routes.credentials} element={<CredentialsPage />} />
        <Route path={`${routes.credentials}/:credentialId`} element={<CredentialDetailPage />} />
        <Route path="*" element={<Navigate to={routes.home} replace />} />
      </Routes>
    </Router>
  )
}

export default App
