import { ApiError } from '../api/client'
import { IssuanceError } from '../api/issuance'
import type { IssuanceApiError } from '../types/issuance'

export function toIssuanceApiError(error: unknown): IssuanceApiError {
  if (error instanceof IssuanceError) {
    return {
      httpStatus: error.httpStatus,
      error: error.error,
      error_description: error.error_description,
    }
  }

  if (error instanceof ApiError) {
    return {
      httpStatus: error.status,
      error: error.errorCode ?? 'internal_error',
      error_description: error.errorDescription,
    }
  }

  return {
    httpStatus: 0,
    error: 'internal_error',
    error_description: null,
  }
}

function userLeadFor502MetadataError(error: IssuanceApiError): string | null {
  if (error.error === 'issuer_metadata_fetch_failed') {
    return "We couldn't load information from the credential issuer. Your wallet is working; the problem is on the issuer or network side."
  }
  if (error.error === 'auth_server_metadata_fetch_failed') {
    return "We couldn't load the issuer's authorization server details. Your wallet is working; the issuer's login service may be temporarily unavailable."
  }
  return null
}

export function issuanceUserMessage(error: IssuanceApiError): string {
  // OpenAPI 502 + ErrorResponse: surface issuer/AS context before generic copy.
  if (error.httpStatus === 502) {
    const lead = userLeadFor502MetadataError(error)
    const detail = error.error_description?.trim() ?? null
    if (lead) {
      return detail ? `${lead}\n\n${detail}` : lead
    }
    if (detail) {
      return detail
    }
    return "We couldn't reach the credential issuer or its authorization server. This is usually temporary and not caused by your wallet. Please try again shortly."
  }

  if (error.error_description?.trim()) {
    return error.error_description.trim()
  }

  switch (error.error) {
    case 'invalid_credential_offer':
      return 'The scanned QR code does not contain a valid credential offer. Please try again.'
    case 'unauthorized':
      return 'Authentication failed. Please restart the flow and try again.'
    case 'issuer_metadata_fetch_failed':
      return 'Could not reach the credential issuer. Check your connection and try again.'
    case 'auth_server_metadata_fetch_failed':
      return 'Could not reach the authorization server. Check your connection and try again.'
    case 'invalid_tx_code':
      return 'The transaction code is invalid. Check it and try again.'
    case 'session_not_found':
      return 'Your issuance session expired. Please restart the flow.'
    case 'invalid_session_state':
      return 'This issuance step is no longer valid. Please restart the flow.'
    case 'invalid_request':
      return 'The request could not be processed. Please retry.'
    case 'internal_error':
      return 'An unexpected server error occurred. Please try again later.'
    default:
      return error.httpStatus >= 500
        ? 'The server encountered an error. Please try again later.'
        : 'The request could not be completed. Please retry or restart the flow.'
  }
}
