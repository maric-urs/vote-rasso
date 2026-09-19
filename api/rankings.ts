import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getEventStatus } from '../server/event'
import { getRankings } from '../server/store'
import { sendJson, setCors } from '../server/http'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Méthode non autorisée' })
  }

  const rankings = await getRankings()
  const status = getEventStatus()

  return sendJson(res, 200, {
    ...rankings,
    updatedAt: new Date().toISOString(),
    votingOpen: status.votingOpen,
    closesAt: status.closesAt,
  })
}
