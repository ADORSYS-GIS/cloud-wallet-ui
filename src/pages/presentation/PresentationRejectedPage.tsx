import { Navigate, useNavigate } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { routes } from '../../constants/routes'
import { usePresentationState } from '../../state/presentation.state'

export function PresentationRejectedPage() {
  const navigate = useNavigate()
  const presentation = usePresentationState()

  if (presentation.status !== 'rejected') {
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
          aria-labelledby="presentation-rejected-heading"
        >
          <h1
            id="presentation-rejected-heading"
            className="text-center text-[clamp(18px,2.6vw,24px)] font-normal leading-tight text-slate-900"
          >
            Presentation declined
          </h1>
          <p className="mt-3 max-w-sm text-center text-[15px] text-slate-600">
            You chose not to share your credentials with the verifier.
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
