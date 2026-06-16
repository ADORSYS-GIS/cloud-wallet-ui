import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import checkCirclePrimary from '../../assets/check-circle-primary.png'
import presentingIllustration from '../../assets/presenting.png'
import { PageContainer } from '../../components/layout/PageContainer'
import { routes } from '../../constants/routes'
import { usePresentationState } from '../../state/presentation.state'

function PresentationSuccessIllustration() {
  const [checkmarkVisible, setCheckmarkVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setCheckmarkVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col items-center">
      <div
        className={[
          'z-20 transition-all duration-500 ease-out',
          checkmarkVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
        ].join(' ')}
      >
        <img
          src={checkCirclePrimary}
          alt=""
          className="h-[35px] w-[35px] object-contain image-optimize-contrast"
        />
      </div>

      <div className="h-[28px]" />

      <div className="relative">
        <img
          src={presentingIllustration}
          alt=""
          className="h-[195px] w-[110px] object-contain image-optimize-contrast"
        />
      </div>
    </div>
  )
}

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

  const verifierRedirectUri =
    presentation.submissionResult?.verifier_response?.redirect_uri

  return (
    <PageContainer fullWidth>
      <div className="flex min-h-screen w-full flex-col bg-[#ffffff] font-serif">
        <section
          className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-8 pt-10"
          aria-labelledby="presentation-success-heading"
        >
          <PresentationSuccessIllustration />
          <h1
            id="presentation-success-heading"
            className="mt-12 text-center text-[clamp(18px,2.6vw,24px)] font-normal leading-tight text-slate-900"
          >
            Information sent successfully
          </h1>
        </section>

        <div className="px-2 pb-2.5 space-y-2">
          {typeof verifierRedirectUri === 'string' && (
            <a
              href={verifierRedirectUri}
              className="flex h-9 w-full items-center justify-center rounded-[4px] bg-[#3f6f7e] text-[16px] font-normal text-white transition-colors duration-150 hover:bg-[#355d6a] active:bg-[#2c4f5a]"
            >
              Return to verifier
            </a>
          )}
          <button
            type="button"
            onClick={handleGoHome}
            className="h-9 w-full rounded-[4px] bg-[#99e827] text-[16px] font-normal text-slate-900 transition-colors duration-150 hover:bg-[#89d61f] active:bg-[#7dc31a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Go back home
          </button>
        </div>
      </div>
    </PageContainer>
  )
}
