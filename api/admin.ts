import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AdminAuthError, assertAdminPin } from '../server/admin.js'
import type { ContactMethod } from '../server/contact.js'
import { InvalidContactError, parseVoterContact } from '../server/contact.js'
import { isValidPlate, normalizePlate } from '../server/plates.js'
import {
  deleteAdminVote,
  listAdminVotes,
  parseSubmissionId,
  updateAdminVote,
} from '../server/store.js'
import type { VehicleCategory } from '../server/types.js'
import { readJsonBody, sendJson, setCors } from '../server/http.js'

function getPin(req: VercelRequest): string | undefined {
  const raw = req.headers['x-admin-pin']
  return Array.isArray(raw) ? raw[0] : raw
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    assertAdminPin(getPin(req))

    if (req.method === 'GET') {
      const votes = await listAdminVotes()
      return sendJson(res, 200, { votes })
    }

    if (req.method === 'DELETE') {
      const body = readJsonBody<{ id?: string }>(req)
      if (!body.id) return sendJson(res, 400, { error: 'Identifiant manquant.' })
      const { voterId, category } = parseSubmissionId(body.id)
      await deleteAdminVote(voterId, category)
      return sendJson(res, 200, { ok: true })
    }

    if (req.method === 'PATCH') {
      const body = readJsonBody<{
        id?: string
        plate?: string
        category?: VehicleCategory
        contactMethod?: ContactMethod
        phone?: string
        email?: string
      }>(req)

      if (!body.id) return sendJson(res, 400, { error: 'Identifiant manquant.' })
      const { voterId, category } = parseSubmissionId(body.id)

      const updates: {
        plate?: string
        category?: VehicleCategory
        contact?: ReturnType<typeof parseVoterContact>
      } = {}

      if (body.plate !== undefined) {
        const plate = normalizePlate(body.plate)
        if (!isValidPlate(plate)) {
          return sendJson(res, 400, { error: 'Plaque invalide.' })
        }
        updates.plate = plate
      }

      if (body.category !== undefined) {
        if (body.category !== 'voiture' && body.category !== 'camion') {
          return sendJson(res, 400, { error: 'Catégorie invalide.' })
        }
        updates.category = body.category
      }

      if (body.contactMethod !== undefined) {
        updates.contact = parseVoterContact({
          contactMethod: body.contactMethod,
          phone: body.phone,
          email: body.email,
        })
      }

      const vote = await updateAdminVote(voterId, category, updates)
      return sendJson(res, 200, { vote })
    }

    return sendJson(res, 405, { error: 'Méthode non autorisée' })
  }
  catch (error) {
    if (error instanceof AdminAuthError) {
      return sendJson(res, 401, { error: error.message })
    }
    if (error instanceof InvalidContactError) {
      return sendJson(res, 400, { error: error.message })
    }
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    const status = message.includes('introuvable') ? 404 : 500
    return sendJson(res, status, { error: message })
  }
}
