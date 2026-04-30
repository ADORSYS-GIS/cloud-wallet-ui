// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePWA } from '../usePWA'

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  })
}

function setStandaloneFlag(value?: boolean) {
  Object.defineProperty(window.navigator, 'standalone', {
    configurable: true,
    value,
  })
}

function setMatchMedia(matchesStandalone: boolean, matchesMinimalUi = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches:
        query === '(display-mode: standalone)'
          ? matchesStandalone
          : query === '(display-mode: minimal-ui)'
            ? matchesMinimalUi
            : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('usePWA', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64)')
    setStandaloneFlag(undefined)
    setMatchMedia(false, false)
  })

  it('is not installable by default when no prompt event exists', () => {
    const { result } = renderHook(() => usePWA())
    expect(result.current.isInstallable).toBe(false)
    expect(result.current.isInstalled).toBe(false)
    expect(result.current.isIosInstallable).toBe(false)
  })

  it('installApp no-ops when no deferred prompt exists', async () => {
    const { result } = renderHook(() => usePWA())

    await act(async () => {
      await result.current.installApp()
    })

    expect(result.current.isInstalling).toBe(false)
    expect(result.current.isInstallable).toBe(false)
  })

  it('becomes installable after beforeinstallprompt and resets after installApp', async () => {
    const prompt = vi.fn(async () => {})
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
    }
    event.prompt = prompt
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })

    const { result } = renderHook(() => usePWA())
    act(() => {
      window.dispatchEvent(event)
    })

    expect(result.current.isInstallable).toBe(true)

    await act(async () => {
      await result.current.installApp()
    })

    expect(prompt).toHaveBeenCalledOnce()
    expect(result.current.isInstallable).toBe(false)
    expect(result.current.isInstalling).toBe(false)
  })

  it('marks app as installed when appinstalled event fires', async () => {
    const { result } = renderHook(() => usePWA())

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    await waitFor(() => {
      expect(result.current.isInstalled).toBe(true)
      expect(result.current.isInstallable).toBe(false)
    })
  })

  it('exposes iOS installable state when on iPhone and not standalone', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)')
    const { result } = renderHook(() => usePWA())
    expect(result.current.isIosInstallable).toBe(true)
  })
})
