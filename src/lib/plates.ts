import { formatPlateDisplay, normalizePlate } from '../../server/plates'

export function normalizePlateInput(raw: string): string {
  return normalizePlate(raw).slice(0, 12)
}

export function formatPlateInput(raw: string): string {
  const normalized = normalizePlateInput(raw)
  return formatPlateDisplay(normalized)
}
