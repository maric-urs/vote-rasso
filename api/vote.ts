import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertVotingOpen, VotingClosedError } from '../server/event.js'
import { isValidPlate, normalizePlate } from '../server/plates.js'
import { InvalidContactError, parseVoterContact } from '../server/contact.js'
import type { ContactMethod } from '../server/contact.js'
import { AlreadyVotedError, ContactAlreadyUsedError, registerVote } from '../server/store.js'
import type { VehicleCategory } from '../server/types.js'
import { readJsonBody, sendJson, setCors } from '../server/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Méthode non autorisée' })
  }

  try {
    assertVotingOpen()
    const body = readJsonBody<{
      voterId?: string
      plate?: string
      category?: VehicleCategory
      contactMethod?: ContactMethod
      phone?: string
      email?: string
    }>(req)

    const voterId = body.voterId?.trim()
    const category = body.category
    const plate = normalizePlate(body.plate ?? '')

    if (!voterId || voterId.length < 8) {
      return sendJson(res, 400, { error: 'Identifiant de vote manquant.' })
    }
    if (category !== 'voiture' && category !== 'camion') {
      return sendJson(res, 400, { error: 'Catégorie invalide.' })
    }
    if (!isValidPlate(plate)) {
      return sendJson(res, 400, { error: 'Plaque trop courte (min. 4 caractères).' })
    }

    const contact = parseVoterContact({
      contactMethod: body.contactMethod,
      phone: body.phone,
      email: body.email,
    })

    const voted = await registerVote(voterId, category, plate, contact)

    return sendJson(res, 200, {
      ok: true,
      message: 'Vote enregistré.',
      plate: voted.plate,
      plateDisplay: voted.plateDisplay,
      category,
    })
  }
  catch (error) {
    if (error instanceof VotingClosedError) {
      return sendJson(res, 403, { error: error.message })
    }
    if (error instanceof AlreadyVotedError) {
      return sendJson(res, 409, { error: error.message })
    }
    if (error instanceof ContactAlreadyUsedError) {
      return sendJson(res, 409, { error: error.message })
    }
    if (error instanceof InvalidContactError) {
      return sendJson(res, 400, { error: error.message })
    }
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return sendJson(res, 500, { error: message })
  }
}
