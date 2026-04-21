import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { credentialDetailPath, routes } from '../constants/routes'
import checkCirclePrimary from '../assets/check-circle-primary.png'
import illuWallet from '../assets/illu-wallet.png'

type SuccessLocationState = {
  credentialId?: string
}

function normalizeCredentialId(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function SuccessIllustration() {
  return (
    <div className="flex flex-col items-center">
      <div className="z-20">
        <img
          src={checkCirclePrimary}
          alt=""
          className="h-[39px] w-[39px] object-contain"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      </div>

      <div className="h-[28px]" />

      <div className="relative">
        <img
          src={illuWallet}
          alt=""
          className="h-[142px] w-[122px] object-contain"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      </div>
    </div>
  )
}

export function IssuanceSuccessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { credentialId: credentialIdParam } = useParams<{ credentialId?: string }>()

  const locationState = location.state as SuccessLocationState | null
  const resolvedCredentialId = normalizeCredentialId(
    credentialIdParam ?? searchParams.get('credentialId') ?? locationState?.credentialId
  )

  const viewCredential = () => {
    if (resolvedCredentialId) {
      navigate(credentialDetailPath(resolvedCredentialId))
      return
    }
    navigate(routes.credentials)
  }

  return (
    <PageContainer fullWidth>
      <div className="flex min-h-screen w-full flex-col bg-[#e7eaed]">
        <section
          className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-8 pt-10"
          aria-labelledby="issuance-success-heading"
        >
          <SuccessIllustration />
          <h1
            id="issuance-success-heading"
            className="mt-6 text-center text-[clamp(18px,2.6vw,24px)] font-semibold leading-tight text-slate-900"
          >
            Credential added to your wallet
          </h1>
        </section>

        <div className="w-full px-2 pb-2.5">
          <button
            type="button"
            onClick={viewCredential}
            className="w-full rounded-xl border border-slate-500 bg-[#e7eaed] py-2.5 text-center text-[16px] font-medium text-slate-900 shadow-[0_2px_7px_rgba(0,0,0,0.08)] transition-colors duration-200 hover:bg-[#dfe3e7]"
          >
            View Credential
          </button>
          <button
            type="button"
            onClick={() => navigate(routes.credentials)}
            className="mt-2 w-full rounded-xl bg-[#99e827] py-2.5 text-center text-[18px] font-semibold text-slate-900 shadow-[0_2px_7px_rgba(0,0,0,0.22)] transition-colors duration-200 hover:bg-[#8bdc1d]"
          >
            Done
          </button>
        </div>
      </div>
    </PageContainer>
  )
}
