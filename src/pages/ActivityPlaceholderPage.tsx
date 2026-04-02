import { useNavigate } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { PageContainer } from '../components/layout/PageContainer'
import { routes } from '../constants/routes'

export function ActivityPlaceholderPage() {
  const navigate = useNavigate()

  return (
    <PageContainer>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF]">
        <Header title="Activity" />
        <section className="flex flex-1 items-center justify-center bg-[#F6F7F9] px-4 text-center text-slate-600">
          Activity history will be available here.
        </section>
        <Footer
          activeTab="activity"
          onScanClick={() => navigate(`${routes.scan}?fresh=true`)}
          scanDisabled={false}
        />
      </div>
    </PageContainer>
  )
}
