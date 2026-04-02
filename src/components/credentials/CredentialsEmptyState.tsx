import { useNavigate } from 'react-router-dom'
import scanIllustration from '../../assets/scan-qr.png'
import { routes } from '../../constants/routes'

export function CredentialsEmptyState() {
  const navigate = useNavigate()

  return (
    <section className="flex min-h-0 flex-1 flex-col items-center justify-start bg-[#E9ECEF] px-4 pb-8 pt-10">
      <div className="flex w-full max-w-3xl flex-col items-center gap-[38px]">
        <img
          src={scanIllustration}
          alt=""
          className="h-[240px] w-[139px] max-w-full object-contain"
        />
        <p className="text-center text-slate-900">Your wallet is empty.</p>
        <p className="max-w-[830px] text-center leading-snug text-slate-900">
          Scan the QR code and fill your EUDI-Wallet with proof of your digital identity.
        </p>
        <button
          type="button"
          onClick={() => navigate(`${routes.scan}?fresh=true`)}
          className="w-full rounded-md bg-[#99e827] py-3 text-center text-base font-semibold text-slate-900 shadow-[0_2px_7px_rgba(0,0,0,0.22)] transition-colors hover:bg-[#66b80f] active:bg-[#5aa70d]"
        >
          Add your first Credential
        </button>
      </div>
    </section>
  )
}
