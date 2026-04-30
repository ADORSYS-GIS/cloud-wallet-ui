// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Header } from '../Header'
import { usePWA } from '../../hooks/usePWA'

vi.mock('../../hooks/usePWA', () => ({
  usePWA: vi.fn(),
}))

const mockedUsePwa = vi.mocked(usePWA)

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUsePwa.mockReturnValue({
      installApp: vi.fn(async () => {}),
      isInstallable: false,
      isInstalling: false,
      isInstalled: false,
      isIosInstallable: false,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders installed state and disables install button', () => {
    mockedUsePwa.mockReturnValue({
      installApp: vi.fn(async () => {}),
      isInstallable: false,
      isInstalling: false,
      isInstalled: true,
      isIosInstallable: false,
    })

    render(<Header />)
    const button = screen.getByRole('button', { name: 'Install app' })
    expect(button.textContent).toBe('Installed')
    expect(button.getAttribute('disabled')).not.toBeNull()
  })

  it('shows Installing label while installation is in progress', () => {
    mockedUsePwa.mockReturnValue({
      installApp: vi.fn(async () => {}),
      isInstallable: false,
      isInstalling: true,
      isInstalled: false,
      isIosInstallable: false,
    })

    render(<Header />)
    const button = screen.getByRole('button', { name: 'Install app' })
    expect(button.textContent).toBe('Installing...')
    expect(button.getAttribute('disabled')).not.toBeNull()
  })

  it('calls installApp when app is installable', () => {
    const installApp = vi.fn(async () => {})
    mockedUsePwa.mockReturnValue({
      installApp,
      isInstallable: true,
      isInstalling: false,
      isInstalled: false,
      isIosInstallable: false,
    })

    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: 'Install app' }))

    expect(installApp).toHaveBeenCalledOnce()
    expect(screen.queryByText(/Install prompt is unavailable right now\./i)).toBeNull()
  })

  it('toggles iOS install instructions when iOS install flow is used', () => {
    mockedUsePwa.mockReturnValue({
      installApp: vi.fn(async () => {}),
      isInstallable: false,
      isInstalling: false,
      isInstalled: false,
      isIosInstallable: true,
    })

    render(<Header />)
    const button = screen.getByRole('button', { name: 'Install app' })
    fireEvent.click(button)
    expect(screen.getByText(/To install on iOS:/i)).toBeDefined()

    fireEvent.click(button)
    expect(screen.queryByText(/To install on iOS:/i)).toBeNull()
  })

  it('shows fallback hint when install prompt is unavailable', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: 'Install app' }))
    expect(screen.getByText(/Install prompt is unavailable right now\./i)).toBeDefined()
  })

  it('hides banner and main header when props disable them', () => {
    render(<Header hidePwaBanner showMainHeader={false} />)
    expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })
})
