import { useNavigate } from 'react-router-dom'
import line from '../assets/line.png'
import scanIllustration from '../assets/scan-qr.png'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'

export function HomePage() {
  const navigate = useNavigate()

  return (
    <PageContainer>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF]">
        <Header />

        <section className="flex flex-1 flex-col items-center px-6 pb-0 pt-14">
          <img
            src={scanIllustration}
            alt="scan-qr.png"
            className="mb-5 h-[280px] w-[220px] translate-y-24 object-contain"
          />

          <p className="mt-24 max-w-[830px] text-center leading-tight text-slate-900">
            Scan the QR code and fill your EUDI Cloud Wallet with proof of your digital identity.
          </p>

          <img src={line} alt="" className="mb-2 mt-24 h-[100px]" />
        </section>

        <Footer
          onScanClick={() => navigate(`${routes.scan}?fresh=true`)}
          scanDisabled={false}
        />
      </div>
    </PageContainer>
  )
}
