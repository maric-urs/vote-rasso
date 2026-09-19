const FRENCH_PLATE_PATTERN = /^[A-Z]{2}\d{3}[A-Z]{2}$/

/** Clé unique : majuscules, sans espaces ni tirets. */
export function normalizePlate(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s.\-_]/g, '')
    .replace(/[^A-Z0-9]/g, '')
}

export function formatPlateDisplay(normalized: string): string {
  if (FRENCH_PLATE_PATTERN.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}`
  }
  return normalized
}

export function isValidPlate(normalized: string): boolean {
  return normalized.length >= 4 && normalized.length <= 12
}

/** @deprecated Utiliser isValidPlate */
export function isValidFrenchPlate(normalized: string): boolean {
  return isValidPlate(normalized)
}
