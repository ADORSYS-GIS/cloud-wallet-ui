// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../constants/routes'
import { RegistrationPage } from '../RegistrationPage'
import { initAuth } from '../../auth/authService'
import { getStoredTenantId, registerTenant, storeTenantId } from '../../auth/tenant'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../auth/authService', () => ({
  initAuth: vi.fn(),
}))

vi.mock('../../auth/tenant', () => ({
  DEFAULT_TENANT_NAME: 'DATEV Cloud Wallet',
  getStoredTenantId: vi.fn(),
  registerTenant: vi.fn(),
  storeTenantId: vi.fn(),
}))

const mockedInitAuth = vi.mocked(initAuth)
const mockedGetStoredTenantId = vi.mocked(getStoredTenantId)
const mockedRegisterTenant = vi.mocked(registerTenant)
const mockedStoreTenantId = vi.mocked(storeTenantId)

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[routes.registration]}>
      <RegistrationPage />
    </MemoryRouter>
  )
}

describe('RegistrationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetStoredTenantId.mockReturnValue(null)
    mockedRegisterTenant.mockResolvedValue({
      tenant_id: 'tenant-1',
      name: 'DATEV Cloud Wallet',
    })
    mockedInitAuth.mockResolvedValue('tenant-1')
  })

  afterEach(() => {
    cleanup()
  })

  it('registers tenant when no tenant is stored and then navigates home', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => {
      expect(mockedRegisterTenant).toHaveBeenCalledOnce()
      expect(mockedStoreTenantId).toHaveBeenCalledWith('tenant-1')
      expect(mockedInitAuth).toHaveBeenCalledOnce()
      expect(navigateMock).toHaveBeenCalledWith(routes.home, { replace: true })
    })
  })

  it('skips tenant registration when tenant id already exists', async () => {
    mockedGetStoredTenantId.mockReturnValue('existing-tenant')
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => {
      expect(mockedRegisterTenant).not.toHaveBeenCalled()
      expect(mockedStoreTenantId).not.toHaveBeenCalled()
      expect(mockedInitAuth).toHaveBeenCalledOnce()
    })
  })

  it('shows backend error message when registration fails with Error', async () => {
    mockedRegisterTenant.mockRejectedValue(new Error('Could not register tenant'))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByText('Could not register tenant')).toBeDefined()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('shows fallback error message for non-Error rejection values', async () => {
    mockedRegisterTenant.mockRejectedValue('bad response')
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByText('Tenant registration failed.')).toBeDefined()
  })

  it('ignores repeated register clicks while request is in flight', async () => {
    let resolveRegistration: ((value: { tenant_id: string; name: string }) => void) | null = null
    mockedRegisterTenant.mockReturnValue(
      new Promise((resolve) => {
        resolveRegistration = resolve
      })
    )

    renderPage()
    const registerButton = screen.getByRole('button', { name: 'Register' })
    fireEvent.click(registerButton)
    fireEvent.click(registerButton)

    expect(mockedRegisterTenant).toHaveBeenCalledTimes(1)

    resolveRegistration?.({ tenant_id: 'tenant-1', name: 'DATEV Cloud Wallet' })
    await waitFor(() => {
      expect(mockedInitAuth).toHaveBeenCalledOnce()
    })
  })

  it('returns early from handler when already registering', async () => {
    mockedRegisterTenant.mockReturnValue(new Promise(() => {}))

    renderPage()
    const registerButton = screen.getByRole('button', { name: 'Register' })
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Registering...' })).toBeDefined()
    })

    const forcedEnabledButton = screen.getByRole('button', {
      name: 'Registering...',
    }) as HTMLButtonElement
    forcedEnabledButton.disabled = false
    fireEvent.click(forcedEnabledButton)

    expect(mockedRegisterTenant).toHaveBeenCalledTimes(1)
    expect(mockedInitAuth).not.toHaveBeenCalled()
  })
})
