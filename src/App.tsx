import type { ReactNode } from 'react'
import { CredentialDetailPage } from './pages/CredentialDetailPage'
import { RemoveCredentialPage } from './pages/RemoveCredentialPage'
import { CredentialTypeDetailsPage } from './pages/CredentialTypeDetailsPage'
import { CredentialsPage } from './pages/CredentialsPage'
import { HomePage } from './pages/HomePage'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { ScanPage } from './pages/ScanPage'
import { routes } from './constants/routes'
import { CredentialOfferProvider } from './state/issuance.state'
import { PresentationProvider } from './state/presentation.state'
import { CredentialsCacheProvider } from './state/credentialsCache.state'
import { CredentialTypesPage } from './pages/CredentialTypesPage'
import { IssuanceSuccessPage } from './pages/IssuanceSuccessPage'
import { RegistrationPage } from './pages/RegistrationPage'
import { PresentationErrorPage } from './pages/presentation/PresentationErrorPage'
import { PresentationRequestPage } from './pages/presentation/PresentationRequestPage'
import { PresentationSuccessPage } from './pages/presentation/PresentationSuccessPage'
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
      <PresentationProvider>
        <CredentialsCacheProvider>
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
                path={routes.present}
                element={
                  <RequireRegistration>
                    <PresentationRequestPage />
                  </RequireRegistration>
                }
              />
              <Route
                path={routes.presentationSuccess}
                element={
                  <RequireRegistration>
                    <PresentationSuccessPage />
                  </RequireRegistration>
                }
              />
              <Route
                path={routes.presentationError}
                element={
                  <RequireRegistration>
                    <PresentationErrorPage />
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
                path={`${routes.credentials}/:credentialId/remove`}
                element={
                  <RequireRegistration>
                    <RemoveCredentialPage />
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
        </CredentialsCacheProvider>
      </PresentationProvider>
    </CredentialOfferProvider>
  )
}

export default App
