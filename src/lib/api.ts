import type { ContactMethod } from '@/lib/contact'
import type { RankingsResponse, VehicleCategory } from '../../server/types'

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json() as T & { error?: string }
  if (!response.ok) {
    throw new Error(data.error ?? 'Une erreur est survenue.')
  }
  return data
}

export interface EventStatusResponse {
  votingOpen: boolean
  closesAt: string
  timezone: string
  eventDate: string
  eventTitle: string
  votedCategories: VehicleCategory[]
}

export async function fetchEventStatus(voterId: string): Promise<EventStatusResponse> {
  const response = await fetch(`/api/status?voterId=${encodeURIComponent(voterId)}`)
  return parseJson(response)
}

export async function submitVote(
  voterId: string,
  category: VehicleCategory,
  plate: string,
  contact: {
    contactMethod: ContactMethod
    phone?: string
    email?: string
  },
): Promise<void> {
  const response = await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voterId, category, plate, ...contact }),
  })
  await parseJson(response)
}

export async function fetchRankings(): Promise<RankingsResponse> {
  const response = await fetch('/api/rankings')
  return parseJson(response)
}
