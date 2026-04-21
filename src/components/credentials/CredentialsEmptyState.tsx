import { useNavigate } from 'react-router-dom'
import scanIllustration from '../../assets/scan-qr.png'
import { routes } from '../../constants/routes'

export function CredentialsEmptyState() {
  const navigate = useNavigate()

  return (
    <section className="flex min-h-0 flex-1 flex-col items-center justify-start bg-[#E9ECEF] px-4 pb-8 pt-12">
      <div className="flex w-full max-w-[400px] flex-col items-center gap-8">
        <img
          src={scanIllustration}
          alt="Scan QR code"
          className="h-[200px] w-auto object-contain"
        />
        <div className="space-y-4 text-center">
          <p className="text-[20px] font-semibold text-slate-900">Your wallet is empty.</p>
          <p className="text-[16px] leading-relaxed text-slate-600">
            Scan the QR code and fill your EUDI Cloud Wallet with proof of your digital
            identity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`${routes.scan}?fresh=true`)}
          className="w-full rounded-xl bg-[#99e827] py-3 text-center text-[18px] font-semibold text-slate-900 shadow-[0_2px_7px_rgba(0,0,0,0.22)] transition-all hover:bg-[#8bdc1d] active:scale-[0.98]"
        >
          Add your first Credential
        </button>
      </div>
    </section>
  )
}
