import { Navigate, useNavigate } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { routes } from '../../constants/routes'
import { usePresentationState } from '../../state/presentation.state'

/**
 * Shown after a successful cross-device presentation (issue #90 / #91).
 * Same-device flows redirect via `redirect_uri` before reaching this page.
 */
export function PresentationSuccessPage() {
  const navigate = useNavigate()
  const presentation = usePresentationState()

  if (presentation.status !== 'success') {
    return <Navigate to={routes.home} replace />
  }

  const handleGoHome = () => {
    presentation.clear()
    navigate(routes.home)
  }

  return (
    <PageContainer fullWidth>
      <div className="flex min-h-screen w-full flex-col bg-white font-serif">
        <section
          className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-8 pt-10"
          aria-labelledby="presentation-success-heading"
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#99e827]/20"
            aria-hidden
          >
            <span className="text-2xl text-[#5a9a12]">✓</span>
          </div>
          <h1
            id="presentation-success-heading"
            className="mt-8 text-center text-[clamp(18px,2.6vw,24px)] font-normal leading-tight text-slate-900"
          >
            Information sent successfully
          </h1>
          <p className="mt-3 max-w-sm text-center text-[15px] text-slate-600">
            The verifier received your presentation.
          </p>
        </section>

        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={handleGoHome}
            className="h-10 w-full rounded-[4px] bg-[#99e827] text-[16px] font-normal text-slate-900 transition-colors duration-150 hover:bg-[#89d61f] active:bg-[#7dc31a]"
          >
            Go back home
          </button>
        </div>
      </div>
    </PageContainer>
  )
}
