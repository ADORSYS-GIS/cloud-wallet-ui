const removedCredentialIds = new Set<string>()

export function markCredentialRemoved(id: string): void {
  removedCredentialIds.add(id)
}

export function isCredentialRemoved(id: string): boolean {
  return removedCredentialIds.has(id)
}

/** Clears session removals — intended for tests only. */
export function clearRemovedCredentials(): void {
  removedCredentialIds.clear()
}
