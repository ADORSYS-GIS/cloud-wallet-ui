type RemovedCredential = {
  id: string
  name: string
}

const removedCredentials = new Map<string, RemovedCredential>()

export function markCredentialRemoved(id: string, name: string): void {
  removedCredentials.set(id, { id, name })
}

export function isCredentialRemoved(id: string): boolean {
  return removedCredentials.has(id)
}

export function getRemovedCredential(id: string): RemovedCredential | undefined {
  return removedCredentials.get(id)
}

export function getAllRemovedCredentials(): RemovedCredential[] {
  return Array.from(removedCredentials.values())
}

export function clearRemovedCredential(id: string): void {
  removedCredentials.delete(id)
}

/** Clears session removals — intended for tests only. */
export function clearRemovedCredentials(): void {
  removedCredentials.clear()
}
