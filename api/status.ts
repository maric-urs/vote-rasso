import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getEventStatus } from '../server/event.js'
import { getVoterCategories } from '../server/store.js'
import { readJsonBody, sendJson, setCors } from '../server/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Méthode non autorisée' })
  }

  const status = getEventStatus()
  let votedCategories: string[] = []
  const voterId = req.method === 'POST'
    ? (readJsonBody<{ voterId?: string }>(req).voterId ?? '')
    : String(req.query.voterId ?? '')

  if (voterId) {
    votedCategories = await getVoterCategories(voterId)
  }

  return sendJson(res, 200, { ...status, votedCategories })
}
