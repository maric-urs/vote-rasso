export type ContactMethod = 'phone' | 'email'

export function isContactValid(
  method: ContactMethod,
  phone: string,
  email: string,
): boolean {
  if (method === 'phone') {
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 10
  }
  const value = email.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
}
