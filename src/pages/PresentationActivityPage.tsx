import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { PageErrorBanner } from '../components/feedback/PageErrorBanner'
import { PageContainer } from '../components/layout/PageContainer'
import { DeletePresentationActivityDialog } from '../components/presentation/DeletePresentationActivityDialog'
import { PresentationActivityEmptyState } from '../components/presentation/PresentationActivityEmptyState'
import { PresentationActivityItem } from '../components/presentation/PresentationActivityItem'
import { routes } from '../constants/routes'
import { usePresentationActivity } from '../hooks/usePresentationActivity'
import type { PresentationActivityRecord } from '../types/presentationActivity'
import { presentationActivityUserMessage } from '../utils/presentationActivityErrors'

export function PresentationActivityPage() {
  const navigate = useNavigate()
  const {
    items,
    loading,
    loadingMore,
    errorMessage,
    hasMore,
    loadMore,
    removeItem,
    reportError,
    clearError,
  } = usePresentationActivity()

  const [pendingDelete, setPendingDelete] = useState<PresentationActivityRecord | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)

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
      <div className="flex h-dvh w-full flex-col overflow-hidden rounded-none bg-[#E9ECEF] font-serif">
        <div className="shrink-0">
          <Header title="Activity History" />
        </div>

        {errorMessage && (
          <div className="shrink-0">
            <PageErrorBanner message={errorMessage} onDismiss={clearError} />
          </div>
        )}

        <section
          className="min-h-0 flex-1 overflow-y-auto bg-[#E9ECEF]"
          aria-label="Presentation activity list"
        >
          {loading && (
            <div className="flex min-h-full items-center justify-center py-16 text-slate-600">
              Loading activity…
            </div>
          )}

          {!loading && items.length === 0 && <PresentationActivityEmptyState />}

          {!loading && items.length > 0 && (
            <div className="flex flex-col gap-4 px-4 py-4">
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
                  aria-busy={loadingMore}
                  className="mx-auto w-full max-w-xs rounded-md bg-white py-3 text-center text-[15px] font-semibold text-[#4b7c8c] shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          )}
        </section>

        <div className="shrink-0">
          <Footer
            activeTab="activity"
            onScanClick={() => navigate(`${routes.scan}?fresh=true`)}
            scanDisabled={false}
          />
        </div>
      </div>

      <DeletePresentationActivityDialog
        open={pendingDelete !== null}
        deleting={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </PageContainer>
  )
}
