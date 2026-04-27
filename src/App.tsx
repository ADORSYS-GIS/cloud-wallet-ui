import type { ReactNode } from 'react'
import { CredentialDetailPage } from './pages/CredentialDetailPage'
import { CredentialTypeDetailsPage } from './pages/CredentialTypeDetailsPage'
import { CredentialsPage } from './pages/CredentialsPage'
import { HomePage } from './pages/HomePage'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { ScanPage } from './pages/ScanPage'
import { routes } from './constants/routes'
import { CredentialOfferProvider } from './state/issuance.state'
import { CredentialTypesPage } from './pages/CredentialTypesPage'
import { IssuanceSuccessPage } from './pages/IssuanceSuccessPage'
import { RegistrationPage } from './pages/RegistrationPage'
import { getStoredTenantId } from './auth/tenant'

function RequireRegistration({ children }: { children: ReactNode }) {
  const isRegistered = Boolean(getStoredTenantId())
  if (!isRegistered) {
    return <Navigate to={routes.registration} replace />
  }
  return children
}

function App() {
  return (
    <CredentialOfferProvider>
      <Router>
        <Routes>
          <Route
            path={routes.registration}
            element={
              getStoredTenantId() ? (
                <Navigate to={routes.home} replace />
              ) : (
                <RegistrationPage />
              )
            }
          />
          <Route
            path={routes.home}
            element={
              <RequireRegistration>
                <HomePage />
              </RequireRegistration>
            }
          />
          <Route
            path={routes.scan}
            element={
              <RequireRegistration>
                <ScanPage />
              </RequireRegistration>
            }
          />
          <Route
            path={routes.credentialTypeDetails}
            element={
              <RequireRegistration>
                <CredentialTypeDetailsPage />
              </RequireRegistration>
            }
          />
          <Route
            path={routes.credentialTypes}
            element={
              <RequireRegistration>
                <CredentialTypesPage />
              </RequireRegistration>
            }
          />
          <Route
            path={routes.issuanceSuccess}
            element={
              <RequireRegistration>
                <IssuanceSuccessPage />
              </RequireRegistration>
            }
          />
          <Route
            path={routes.credentials}
            element={
              <RequireRegistration>
                <CredentialsPage />
              </RequireRegistration>
            }
          />
          <Route
            path={`${routes.credentials}/:credentialId`}
            element={
              <RequireRegistration>
                <CredentialDetailPage />
              </RequireRegistration>
            }
          />
          <Route
            path="*"
            element={
              getStoredTenantId() ? (
                <Navigate to={routes.home} replace />
              ) : (
                <Navigate to={routes.registration} replace />
              )
            }
          />
        </Routes>
      </Router>
    </CredentialOfferProvider>
  )
}

export default App
