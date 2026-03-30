import gearIcon from '../assets/icon-gear.svg'

export function Header() {
  return (
    <>
      <div className="flex items-center justify-between bg-[#499c9d] px-4 py-2 text-black">
        <span>To access the app from your phone, install now</span>
        <button className="rounded-lg bg-[#99e827] px-24 py-1 text-black">Install</button>
      </div>

      <header className="grid grid-cols-[1fr_auto_1fr] items-center bg-[#4b7c8c] px-4 py-6">
        <div />
        <h1 className="whitespace-nowrap text-center font-semibold leading-none text-slate-100 md:text-[34px]">
          DATEV Cloud Wallet
        </h1>
        <div className="flex justify-end">
          <img src={gearIcon} alt="Settings" className="h-6 w-6" />
        </div>
      </header>
    </>
  )
}
