export class AdminAuthError extends Error {
  constructor() {
    super('Code organisateur incorrect.')
    this.name = 'AdminAuthError'
  }
}

export function getAdminPin(): string {
  return process.env.ADMIN_PIN?.trim() || '656656'
}

export function assertAdminPin(headerPin: string | undefined | null) {
  const pin = headerPin?.trim()
  if (!pin || pin !== getAdminPin()) {
    throw new AdminAuthError()
  }
}
