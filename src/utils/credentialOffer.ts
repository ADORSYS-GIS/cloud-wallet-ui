type CredentialOfferObject = {
  credential_issuer: string
  credential_configuration_ids: string[]
}

export type ParsedCredentialOfferInput = {
  rawValue: string
  normalizedUri: string
}

function isHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function parseCredentialOfferObject(encodedValue: string): CredentialOfferObject | null {
  try {
    const decoded = decodeURIComponent(encodedValue)
    const parsed = JSON.parse(decoded) as Partial<CredentialOfferObject>
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    if (
      typeof parsed.credential_issuer !== 'string' ||
      !isHttpsUrl(parsed.credential_issuer)
    ) {
      return null
    }

    if (
      !Array.isArray(parsed.credential_configuration_ids) ||
      parsed.credential_configuration_ids.length === 0 ||
      parsed.credential_configuration_ids.some(
        (id) => typeof id !== 'string' || id.length === 0
      )
    ) {
      return null
    }

    return {
      credential_issuer: parsed.credential_issuer,
      credential_configuration_ids: parsed.credential_configuration_ids,
    }
  } catch {
    return null
  }
}

function parseOfferParams(
  params: URLSearchParams,
  rawValue: string
): ParsedCredentialOfferInput | null {
  const credentialOffer = params.get('credential_offer')
  const credentialOfferUri = params.get('credential_offer_uri')

  // OpenID4VCI requires exactly one of these parameters.
  if (
    (!credentialOffer && !credentialOfferUri) ||
    (credentialOffer && credentialOfferUri)
  ) {
    return null
  }

  if (credentialOfferUri) {
    if (!isHttpsUrl(credentialOfferUri)) {
      return null
    }

    return {
      rawValue,
      normalizedUri: `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(credentialOfferUri)}`,
    }
  }

  if (!credentialOffer) {
    return null
  }

  const parsedOffer = parseCredentialOfferObject(credentialOffer)
  if (!parsedOffer) {
    return null
  }

  return {
    rawValue,
    normalizedUri: `openid-credential-offer://?credential_offer=${encodeURIComponent(
      decodeURIComponent(credentialOffer)
    )}`,
  }
}

export function parseCredentialOfferInput(
  input: string
): ParsedCredentialOfferInput | null {
  const value = input.trim()
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)
    if (url.protocol === 'openid-credential-offer:') {
      return parseOfferParams(url.searchParams, value)
    }

    // Accept plain https credential_offer_uri as a practical fallback for QR payloads.
    if (url.protocol === 'https:') {
      return {
        rawValue: value,
        normalizedUri: `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(value)}`,
      }
    }
  } catch {
    return null
  }

  return null
}
