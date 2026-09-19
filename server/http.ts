import type { VercelRequest, VercelResponse } from '@vercel/node'

export function sendJson(res: VercelResponse, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(body))
}

export function readJsonBody<T>(req: VercelRequest): T {
  try {
    const raw = req.body as unknown
    if (raw == null || raw === '') return {} as T
    if (typeof raw === 'string') {
      const text = raw.trim()
      if (!text) return {} as T
      return JSON.parse(text) as T
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw)) {
      const text = raw.toString('utf8').trim()
      if (!text) return {} as T
      return JSON.parse(text) as T
    }
    return raw as T
  }
  catch {
    return {} as T
  }
}

export function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin')
}
