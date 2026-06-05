import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { PageErrorBanner } from '../components/feedback/PageErrorBanner'
import { PageContainer } from '../components/layout/PageContainer'
import { DeletePresentationActivityDialog } from '../components/presentation/DeletePresentationActivityDialog'
import { PresentationActivityEmptyState } from '../components/presentation/PresentationActivityEmptyState'
import { PresentationActivityFilters } from '../components/presentation/PresentationActivityFilters'
import { PresentationActivityItem } from '../components/presentation/PresentationActivityItem'
import { routes } from '../constants/routes'
import { usePresentationActivity } from '../hooks/usePresentationActivity'
import type { PresentationActivityRecord } from '../types/presentationActivity'
import { presentationActivityUserMessage } from '../utils/presentationActivityErrors'
import { verifierDisplayLabel } from '../utils/presentationActivity'

export function PresentationActivityPage() {
  const navigate = useNavigate()
  const {
    items,
    loading,
    loadingMore,
    errorMessage,
    hasMore,
    filters,
    setFilters,
    loadMore,
    removeItem,
    reportError,
    clearError,
  } = usePresentationActivity()

  const [pendingDelete, setPendingDelete] = useState<PresentationActivityRecord | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)

  const hasActiveFilters = Boolean(
    filters.from || filters.to || filters.verifierName.trim()
  )
  const showFilters = !loading && (items.length > 0 || hasActiveFilters)

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await removeItem(pendingDelete.id)
      setPendingDelete(null)
    } catch (err: unknown) {
      reportError(presentationActivityUserMessage(err, 'delete'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <PageContainer>
      <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF] font-serif">
        <Header title="Activity History" />

        {errorMessage && (
          <PageErrorBanner message={errorMessage} onDismiss={clearError} />
        )}

        {showFilters && (
          <PresentationActivityFilters
            filters={filters}
            onChange={setFilters}
            disabled={loading}
          />
        )}

        {loading && (
          <section className="flex flex-1 items-center justify-center bg-[#E9ECEF] py-16 text-slate-600">
            Loading activity…
          </section>
        )}

        {!loading && items.length === 0 && !errorMessage && (
          <PresentationActivityEmptyState />
        )}

        {!loading && items.length > 0 && (
          <section
            className="min-h-0 flex-1 overflow-y-auto bg-[#E9ECEF] py-4"
            aria-label="Presentation activity list"
          >
            <div className="flex flex-col gap-4 px-4">
              {items.map((record) => (
                <PresentationActivityItem
                  key={record.id}
                  record={record}
                  onDeleteRequest={setPendingDelete}
                />
              ))}
              {hasMore && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="mx-auto w-full max-w-xs rounded-md bg-white py-3 text-center text-[15px] font-semibold text-[#4b7c8c] shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          </section>
        )}

        <Footer
          activeTab="activity"
          onScanClick={() => navigate(`${routes.scan}?fresh=true`)}
          scanDisabled={false}
        />
      </div>

      <DeletePresentationActivityDialog
        open={pendingDelete !== null}
        verifierLabel={
          pendingDelete ? verifierDisplayLabel(pendingDelete.verifier) : 'this verifier'
        }
        deleting={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </PageContainer>
  )
}
