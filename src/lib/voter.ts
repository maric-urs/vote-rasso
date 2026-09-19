import type { VehicleCategory } from '../../server/types'

const STORAGE_KEY = 'rasso-voter-id'
const VOTED_KEY = 'rasso-voted-categories'

export function getVoterId(): string {
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) return existing

  const id = crypto.randomUUID()
  localStorage.setItem(STORAGE_KEY, id)
  return id
}

export function getLocalVotedCategories(): VehicleCategory[] {
  try {
    const raw = localStorage.getItem(VOTED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as VehicleCategory[]
    return parsed.filter(c => c === 'voiture' || c === 'camion')
  }
  catch {
    return []
  }
}

export function markLocalVoted(category: VehicleCategory) {
  const set = new Set(getLocalVotedCategories())
  set.add(category)
  localStorage.setItem(VOTED_KEY, JSON.stringify([...set]))
}

export function syncLocalVotedCategories(categories: VehicleCategory[]) {
  const set = new Set<VehicleCategory>()
  for (const c of categories) {
    if (c === 'voiture' || c === 'camion') set.add(c)
  }
  for (const c of getLocalVotedCategories()) set.add(c)
  localStorage.setItem(VOTED_KEY, JSON.stringify([...set]))
}

export function hasLocalVoted(category: VehicleCategory): boolean {
  return getLocalVotedCategories().includes(category)
}
