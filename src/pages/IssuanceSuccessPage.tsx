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
          className="h-[35px] w-[35px] object-contain image-optimize-contrast"
        />
      </div>

      <div className="h-[28px]" />

      <div className="relative">
        <img
          src={illuWallet}
          alt=""
          className="h-[132px] w-[122px] object-contain image-optimize-contrast"
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
      <div className="flex min-h-screen w-full flex-col bg-[#ffffff] font-serif">
        <section
          className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-8 pt-10"
          aria-labelledby="issuance-success-heading"
        >
          <SuccessIllustration />
          <h1
            id="issuance-success-heading"
            className="mt-12 text-center text-[clamp(18px,2.6vw,24px)] font-normal leading-tight text-slate-900"
          >
            Credential added to your wallet
          </h1>
        </section>

        <div className="px-2 pb-2.5">
          <button
            type="button"
            onClick={viewCredential}
            className="h-9 w-full rounded-[4px] border border-slate-400 bg-transparent text-[16px] font-normal text-slate-900 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            View Credential
          </button>
          <button
            type="button"
            onClick={() => navigate(routes.credentials)}
            className="mt-1 h-9 w-full rounded-[4px] bg-[#99e827] text-[16px] font-normal text-slate-900 transition-colors duration-150 hover:bg-[#89d61f] active:bg-[#7dc31a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Done
          </button>
        </div>
      </div>
    </PageContainer>
  )
}
