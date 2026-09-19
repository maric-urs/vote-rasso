export type ContactMethod = 'phone' | 'email'

export interface VoterContact {
  method: ContactMethod
  phone?: string
  email?: string
}

export class InvalidContactError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidContactError'
  }
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function normalizePhone(raw: string): string {
  let digits = digitsOnly(raw)
  if (digits.startsWith('596')) digits = digits.slice(3)
  if (digits.startsWith('0')) return digits
  if (digits.length === 9) return `0${digits}`
  return digits
}

export function isValidPhone(raw: string): boolean {
  const normalized = normalizePhone(raw)
  return /^0(690|691|692|693|694|695|696|697|698|699)\d{6}$/.test(normalized)
    || /^0[1-9]\d{8}$/.test(normalized)
}

export function isValidEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function parseVoterContact(input: {
  contactMethod?: ContactMethod | 'address'
  phone?: string
  email?: string
  address?: string
}): VoterContact {
  let method = input.contactMethod
  if (method === 'address') method = 'email'

  if (method !== 'phone' && method !== 'email') {
    throw new InvalidContactError('Choisissez téléphone ou e-mail.')
  }

  if (method === 'phone') {
    const phone = input.phone?.trim() ?? ''
    if (!isValidPhone(phone)) {
      throw new InvalidContactError('Numéro invalide (ex. 0696 12 34 56).')
    }
    return { method: 'phone', phone: normalizePhone(phone) }
  }

  const email = (input.email ?? input.address)?.trim() ?? ''
  if (!isValidEmail(email)) {
    throw new InvalidContactError('E-mail invalide.')
  }

  return { method: 'email', email: normalizeEmail(email) }
}

/** Clé stable pour empêcher le même contact de voter deux fois (par catégorie). */
export function contactIndexPart(contact: {
  method?: string
  phone?: string
  email?: string
  address?: string
}): string {
  if (contact.method === 'phone' && contact.phone) {
    return `phone:${contact.phone}`
  }
  const email = contact.email
    ?? (contact.method === 'address' ? contact.address : undefined)
  if (email) return `email:${normalizeEmail(email)}`
  return 'unknown'
}
