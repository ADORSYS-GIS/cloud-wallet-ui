import { Link, useLocation } from 'react-router-dom'
import activityIcon from '../assets/icon-activity.svg'
import credsIcon from '../assets/icon-creds.svg'
import qrIcon from '../assets/icon-qr.svg'
import { routes } from '../constants/routes'

export type FooterActiveTab = 'creds' | 'home'

type FooterProps = {
  onScanClick: () => void
  scanDisabled: boolean
  showLabels?: boolean
  activeTab?: FooterActiveTab
}

export function Footer({
  onScanClick,
  scanDisabled,
  showLabels = true,
  activeTab,
}: FooterProps) {
  const location = useLocation()
  const credsActive =
    activeTab === 'creds' || location.pathname.startsWith(routes.credentials)

  const tabClass = (active: boolean) =>
    `flex flex-col items-center gap-1 ${active ? 'text-slate-900' : 'text-slate-500'}`

  return (
    <nav className="relative mt-auto grid grid-cols-3 items-end bg-[#FFFFFF] px-8 pb-7 pt-2 text-slate-900">
      <div className="absolute -top-4 left-1/2 h-8 w-16 -translate-x-1/2 rounded-t-full bg-[#E9ECEF]" />

      <div className={tabClass(false)} aria-label="Activity — coming soon">
        <img src={activityIcon} alt="" className="h-6 w-6" />
        {showLabels && <span className="text-xs leading-none">Activity</span>}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onScanClick}
          disabled={scanDisabled}
          className="absolute -top-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#99e827] disabled:opacity-80"
          aria-label="Scan credential offer QR"
        >
          <img src={qrIcon} alt="" className="h-6 w-6" />
        </button>
      </div>

      <Link
        to={routes.credentials}
        className={tabClass(credsActive)}
        aria-current={credsActive ? 'page' : undefined}
        aria-label={!showLabels ? 'Creds' : undefined}
      >
        <img src={credsIcon} alt="" className="h-6 w-6" />
        {showLabels && <span className="text-xs leading-none">Creds</span>}
      </Link>
    </nav>
  )
}
