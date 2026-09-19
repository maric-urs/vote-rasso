import type { Connect } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { assertVotingOpen, getEventStatus, VotingClosedError } from './event.js'
import { isValidPlate, normalizePlate } from './plates.js'
import { InvalidContactError, parseVoterContact } from './contact.js'
import type { ContactMethod } from './contact.js'
import { AdminAuthError, assertAdminPin } from './admin.js'
import { AlreadyVotedError, ContactAlreadyUsedError, deleteAdminVote, getRankings, getVoterCategories, listAdminVotes, parseSubmissionId, registerVote, updateAdminVote } from './store.js'
import type { VehicleCategory } from './types.js'
import { loadLocalEnv } from './load-env.js'

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function createDevApiMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next()

    loadLocalEnv()
    const url = new URL(req.url, 'http://localhost')

    try {
      if (url.pathname === '/api/status') {
        const status = getEventStatus()
        let votedCategories: VehicleCategory[] = []
        let voterId = url.searchParams.get('voterId') ?? ''
        if (req.method === 'POST') {
          const body = await readBody(req) as { voterId?: string }
          voterId = body.voterId ?? voterId
        }
        if (voterId) votedCategories = await getVoterCategories(voterId)
        return send(res, 200, { ...status, votedCategories })
      }

      if (url.pathname === '/api/rankings' && req.method === 'GET') {
        const rankings = await getRankings()
        const status = getEventStatus()
        return send(res, 200, {
          ...rankings,
          updatedAt: new Date().toISOString(),
          votingOpen: status.votingOpen,
          closesAt: status.closesAt,
        })
      }

      if (url.pathname === '/api/vote' && req.method === 'POST') {
        assertVotingOpen()
        const body = await readBody(req) as {
          voterId?: string
          plate?: string
          category?: VehicleCategory
          contactMethod?: ContactMethod
          phone?: string
          email?: string
        }
        const voterId = body.voterId?.trim()
        const category = body.category
        const plate = normalizePlate(body.plate ?? '')

        if (!voterId || voterId.length < 8) {
          return send(res, 400, { error: 'Identifiant de vote manquant.' })
        }
        if (category !== 'voiture' && category !== 'camion') {
          return send(res, 400, { error: 'Catégorie invalide.' })
        }
        if (!isValidPlate(plate)) {
          return send(res, 400, { error: 'Plaque trop courte (min. 4 caractères).' })
        }

        const contact = parseVoterContact({
          contactMethod: body.contactMethod,
          phone: body.phone,
          email: body.email,
        })

        const voted = await registerVote(voterId, category, plate, contact)
        return send(res, 200, { ok: true, message: 'Vote enregistré.', ...voted, category })
      }

      if (url.pathname === '/api/admin') {
        const pin = req.headers['x-admin-pin']
        const headerPin = Array.isArray(pin) ? pin[0] : pin
        assertAdminPin(headerPin)

        if (req.method === 'GET') {
          const votes = await listAdminVotes()
          return send(res, 200, { votes })
        }

        if (req.method === 'DELETE') {
          const body = await readBody(req) as { id?: string }
          if (!body.id) return send(res, 400, { error: 'Identifiant manquant.' })
          const parsed = parseSubmissionId(body.id)
          await deleteAdminVote(parsed.voterId, parsed.category)
          return send(res, 200, { ok: true })
        }

        if (req.method === 'PATCH') {
          const body = await readBody(req) as {
            id?: string
            plate?: string
            category?: VehicleCategory
            contactMethod?: ContactMethod
            phone?: string
            email?: string
          }
          if (!body.id) return send(res, 400, { error: 'Identifiant manquant.' })
          const parsed = parseSubmissionId(body.id)
          const updates: {
            plate?: string
            category?: VehicleCategory
            contact?: ReturnType<typeof parseVoterContact>
          } = {}
          if (body.plate !== undefined) {
            const p = normalizePlate(body.plate)
            if (!isValidPlate(p)) return send(res, 400, { error: 'Plaque invalide.' })
            updates.plate = p
          }
          if (body.category !== undefined) {
            if (body.category !== 'voiture' && body.category !== 'camion') {
              return send(res, 400, { error: 'Catégorie invalide.' })
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
          const vote = await updateAdminVote(parsed.voterId, parsed.category, updates)
          return send(res, 200, { vote })
        }

        return send(res, 405, { error: 'Méthode non autorisée' })
      }

      return send(res, 404, { error: 'Route API introuvable' })
    }
    catch (err: unknown) {
      if (err instanceof VotingClosedError) {
        return send(res, 403, { error: err.message })
      }
      if (err instanceof AlreadyVotedError) {
        return send(res, 409, { error: err.message })
      }
      if (err instanceof ContactAlreadyUsedError) {
        return send(res, 409, { error: err.message })
      }
      if (err instanceof InvalidContactError) {
        return send(res, 400, { error: err.message })
      }
      if (err instanceof AdminAuthError) {
        return send(res, 401, { error: err.message })
      }
      const message = err instanceof Error ? err.message : 'Erreur serveur'
      return send(res, 500, { error: message })
    }
  }
}
