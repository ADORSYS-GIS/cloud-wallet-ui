import { useMemo } from 'react'
import type { CredentialOfferResolutionResponse } from '../types/credentialOffer'

type OfferDialogProps = {
  open: boolean
  offer: CredentialOfferResolutionResponse
  onClose: () => void
}

export function OfferDialog({ open, offer, onClose }: OfferDialogProps) {
  const options = useMemo(() => {
    if (offer.options && offer.options.length > 0) {
      return offer.options.map((o) => ({
        id: o.id,
        label: o.displayName || o.id,
      }))
    }
    return (offer.credentialTypes ?? []).map((t) => ({ id: t, label: t }))
  }, [offer.credentialTypes, offer.options])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 pt-10"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">Credential offer</div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-600 hover:text-slate-900"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-4 pb-4 pt-4">
          <div className="flex items-center gap-3">
            {offer.issuer?.logoUrl ? (
              <img
                src={offer.issuer.logoUrl}
                alt={offer.issuer?.name ? `${offer.issuer.name} logo` : 'Issuer logo'}
                className="h-10 w-10 rounded-lg object-contain ring-1 ring-slate-200"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-slate-100 ring-1 ring-slate-200" />
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">
                {offer.issuer?.name || 'Unknown issuer'}
              </div>
              {offer.issuer?.url && (
                <div className="truncate text-xs text-slate-500">{offer.issuer.url}</div>
              )}
            </div>
          </div>

          <div className="mt-4 text-sm font-medium text-slate-900">
            Available credential types
          </div>

          {options.length === 0 ? (
            <div className="mt-2 text-sm text-slate-600">
              No credential options were returned.
            </div>
          ) : (
            <ul className="mt-2 space-y-2">
              {options.map((o) => (
                <li
                  key={o.id}
                  className="w-full rounded-lg bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 ring-1 ring-slate-200"
                >
                  {o.label}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-[#499c9d] px-4 py-2 text-sm text-white"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
