import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'
import {
  DEFAULT_TENANT_NAME,
  getStoredTenantId,
  registerTenant,
  storeTenantId,
} from '../auth/tenant'
import { initAuth } from '../auth/authService'

export function RegistrationPage() {
  const navigate = useNavigate()
  const [isRegistering, setIsRegistering] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleRegister = async () => {
    if (isRegistering) return

    setIsRegistering(true)
    setErrorMessage(null)

    try {
      const existingTenantId = getStoredTenantId()

      if (!existingTenantId) {
        const response = await registerTenant(DEFAULT_TENANT_NAME)
        storeTenantId(response.tenant_id)
      }

      await initAuth()
      navigate(routes.home, { replace: true })
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Tenant registration failed.')
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <PageContainer fullWidth>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#e7eaed] font-serif">
        {/* Sub-header */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-[#96a8b2] bg-gradient-to-r from-[#3f6f7e] to-[#4e7f8f] px-2 py-2">
          <div className="w-10" />
          <div className="text-center text-[16px] md:text-[18px] font-semibold leading-none text-white">
            Registration
          </div>
          <div className="w-10" />
        </div>

        <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="mb-4 text-sm text-slate-700">Register to wallet</p>
          <button
            type="button"
            onClick={() => void handleRegister()}
            disabled={isRegistering}
            className="min-w-[220px] rounded-md bg-[#59ff20] px-10 py-2 text-[24px] font-semibold leading-none text-black shadow disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isRegistering ? 'Registering...' : 'Register'}
          </button>
          {errorMessage && <p className="mt-4 max-w-md text-sm text-red-700">{errorMessage}</p>}
        </section>
      </div>
    </PageContainer>
  )
}
