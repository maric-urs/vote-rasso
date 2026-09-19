import type { ContactMethod } from '@/lib/contact'
import type { AdminVoteRow, VehicleCategory } from '../../server/types'

function headers(pin: string) {
  return {
    'Content-Type': 'application/json',
    'x-admin-pin': pin,
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json() as T & { error?: string }
  if (!response.ok) {
    throw new Error(data.error ?? 'Une erreur est survenue.')
  }
  return data
}

export async function fetchAdminVotes(pin: string): Promise<AdminVoteRow[]> {
  const response = await fetch('/api/admin', { headers: headers(pin) })
  const data = await parseJson<{ votes: AdminVoteRow[] }>(response)
  return data.votes
}

export async function deleteAdminVote(pin: string, id: string): Promise<void> {
  const response = await fetch(`/api/admin?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(pin),
    body: JSON.stringify({ id }),
  })
  await parseJson(response)
}

export async function updateAdminVote(
  pin: string,
  id: string,
  payload: {
    plate?: string
    category?: VehicleCategory
    contactMethod?: ContactMethod
    phone?: string
    email?: string
  },
): Promise<AdminVoteRow> {
  const response = await fetch('/api/admin', {
    method: 'PATCH',
    headers: headers(pin),
    body: JSON.stringify({ id, ...payload }),
  })
  const data = await parseJson<{ vote: AdminVoteRow }>(response)
  return data.vote
}
