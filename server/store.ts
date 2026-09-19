import { Redis } from '@upstash/redis'
import { get as getBlob, put as putBlob } from '@vercel/blob'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { contactIndexPart, type VoterContact } from './contact.js'
import { formatPlateDisplay } from './plates.js'
import type { AdminVoteRow, VehicleCategory, VoteRecord, VoteSubmission } from './types.js'

const PREFIX = 'rasso:2026'

interface FileStoreShape {
  counts: Record<string, number>
  voters: Record<string, VehicleCategory[]>
  submissions: VoteSubmission[]
  /** `${category}:${phone|email}:value` → voterId */
  contactLocks: Record<string, string>
}

const BLOB_PATH = 'rasso-votes.json'

let memoryStore: FileStoreShape = {
  counts: {},
  voters: {},
  submissions: [],
  contactLocks: {},
}

function emptyStore(): FileStoreShape {
  return { counts: {}, voters: {}, submissions: [], contactLocks: {} }
}

function normalizeStore(parsed: Partial<FileStoreShape>): FileStoreShape {
  return {
    counts: parsed.counts ?? {},
    voters: parsed.voters ?? {},
    submissions: parsed.submissions ?? [],
    contactLocks: parsed.contactLocks ?? {},
  }
}

function useBlobStore() {
  return Boolean(process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN)
}

function voteKey(category: VehicleCategory, plate: string) {
  return `${PREFIX}:${category}:plate:${plate}`
}

function voterKey(voterId: string) {
  return `${PREFIX}:voter:${voterId}`
}

function submissionKey(voterId: string, category: VehicleCategory) {
  return `${PREFIX}:submission:${voterId}:${category}`
}

function contactLockKey(category: VehicleCategory, contact: VoterContact) {
  return `${PREFIX}:contact:${category}:${contactIndexPart(contact)}`
}

function fileContactLockKey(category: VehicleCategory, contact: VoterContact) {
  return `${category}:${contactIndexPart(contact)}`
}

export class ContactAlreadyUsedError extends Error {
  constructor() {
    super('Ce numéro ou cet e-mail a déjà été utilisé pour voter dans cette catégorie.')
    this.name = 'ContactAlreadyUsedError'
  }
}

async function assertContactAvailable(
  redis: Redis | null,
  category: VehicleCategory,
  contact: VoterContact,
  voterId: string,
) {
  if (redis) {
    const key = contactLockKey(category, contact)
    let owner = await redis.get<string>(key)
    if (!owner) {
      const part = contactIndexPart(contact)
      const keys = await redis.keys(`${PREFIX}:submission:*`)
      for (const sk of keys) {
        const sub = await redis.get<VoteSubmission>(sk)
        if (sub?.category === category && contactIndexPart(sub.contact) === part) {
          owner = sub.voterId
          break
        }
      }
    }
    if (owner && owner !== voterId) throw new ContactAlreadyUsedError()
    return
  }

  const store = await readFileStore()
  const lockKey = fileContactLockKey(category, contact)
  let owner = store.contactLocks[lockKey]
  if (!owner) {
    const part = contactIndexPart(contact)
    for (const sub of store.submissions) {
      if (sub.category === category && contactIndexPart(sub.contact) === part) {
        owner = sub.voterId
        break
      }
    }
  }
  if (owner && owner !== voterId) throw new ContactAlreadyUsedError()
}

async function setContactLock(
  redis: Redis | null,
  category: VehicleCategory,
  contact: VoterContact,
  voterId: string,
) {
  if (redis) {
    await redis.set(contactLockKey(category, contact), voterId)
    return
  }
  const store = await readFileStore()
  store.contactLocks[fileContactLockKey(category, contact)] = voterId
  await writeFileStore(store)
}

async function clearContactLock(
  redis: Redis | null,
  category: VehicleCategory,
  contact: VoterContact,
) {
  if (redis) {
    await redis.del(contactLockKey(category, contact))
    return
  }
  const store = await readFileStore()
  delete store.contactLocks[fileContactLockKey(category, contact)]
  await writeFileStore(store)
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

async function readBlobStore(): Promise<FileStoreShape> {
  const result = await getBlob(BLOB_PATH, { access: 'private', useCache: false })
  if (!result || result.statusCode !== 200 || !result.stream) return emptyStore()
  const text = await new Response(result.stream).text()
  if (!text.trim()) return emptyStore()
  return normalizeStore(JSON.parse(text) as Partial<FileStoreShape>)
}

async function writeBlobStore(data: FileStoreShape) {
  await putBlob(BLOB_PATH, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  })
}

function localStorePath() {
  if (process.env.VERCEL) return join('/tmp', 'rasso-votes.json')
  return join(process.cwd(), '.data', 'votes.json')
}

async function readFileStore(): Promise<FileStoreShape> {
  if (useBlobStore()) {
    return readBlobStore()
  }

  const path = localStorePath()
  try {
    const raw = await readFile(path, 'utf8')
    return normalizeStore(JSON.parse(raw) as Partial<FileStoreShape>)
  }
  catch {
    return memoryStore
  }
}

async function writeFileStore(data: FileStoreShape) {
  memoryStore = data
  if (useBlobStore()) {
    await writeBlobStore(data)
    return
  }

  const path = localStorePath()
  const dir = join(path, '..')
  await mkdir(dir, { recursive: true })
  await writeFile(path, JSON.stringify(data, null, 2), 'utf8')
}

export class AlreadyVotedError extends Error {
  constructor(category: VehicleCategory) {
    super(`Vous avez déjà voté pour la catégorie ${category}.`)
    this.name = 'AlreadyVotedError'
  }
}

export async function registerVote(
  voterId: string,
  category: VehicleCategory,
  plate: string,
  contact: VoterContact,
): Promise<{ plate: string; plateDisplay: string }> {
  const plateDisplay = formatPlateDisplay(plate)
  const submission: VoteSubmission = {
    voterId,
    category,
    plate,
    plateDisplay,
    contact,
    createdAt: new Date().toISOString(),
  }

  const redis = getRedis()

  if (redis) {
    const existing = await redis.sismember(voterKey(voterId), category)
    if (existing) throw new AlreadyVotedError(category)
    await assertContactAvailable(redis, category, contact, voterId)

    await redis
      .multi()
      .sadd(voterKey(voterId), category)
      .incr(voteKey(category, plate))
      .set(submissionKey(voterId, category), submission)
      .set(contactLockKey(category, contact), voterId)
      .exec()

    return { plate, plateDisplay }
  }

  const store = await readFileStore()
  const voted = store.voters[voterId] ?? []
  if (voted.includes(category)) throw new AlreadyVotedError(category)
  await assertContactAvailable(null, category, contact, voterId)

  const countKey = voteKey(category, plate)
  store.counts[countKey] = (store.counts[countKey] ?? 0) + 1
  store.voters[voterId] = [...voted, category]
  store.submissions.push(submission)
  store.contactLocks[fileContactLockKey(category, contact)] = voterId
  await writeFileStore(store)

  return { plate, plateDisplay }
}

async function loadRankingsFromRedis(
  redis: Redis,
  category: VehicleCategory,
): Promise<VoteRecord[]> {
  const pattern = `${PREFIX}:${category}:plate:*`
  const keys = await redis.keys(pattern)
  if (!keys.length) return []

  const records: VoteRecord[] = []

  for (const key of keys) {
    const plate = key.split(':').pop()!
    const votes = Number(await redis.get(key)) || 0
    if (votes <= 0) continue

    records.push({
      plate,
      plateDisplay: formatPlateDisplay(plate),
      category,
      votes,
    })
  }

  return records.sort((a, b) => b.votes - a.votes).slice(0, 10)
}

async function loadRankingsFromFile(category: VehicleCategory): Promise<VoteRecord[]> {
  const store = await readFileStore()
  const records: VoteRecord[] = []

  for (const [key, votes] of Object.entries(store.counts)) {
    if (!key.startsWith(`${PREFIX}:${category}:plate:`)) continue
    const plate = key.split(':').pop()!
    if (votes <= 0) continue

    records.push({
      plate,
      plateDisplay: formatPlateDisplay(plate),
      category,
      votes,
    })
  }

  return records.sort((a, b) => b.votes - a.votes).slice(0, 10)
}

export async function getRankings(): Promise<{ voiture: VoteRecord[]; camion: VoteRecord[] }> {
  const redis = getRedis()

  if (redis) {
    return {
      voiture: await loadRankingsFromRedis(redis, 'voiture'),
      camion: await loadRankingsFromRedis(redis, 'camion'),
    }
  }

  return {
    voiture: await loadRankingsFromFile('voiture'),
    camion: await loadRankingsFromFile('camion'),
  }
}

export async function getVoterCategories(voterId: string): Promise<VehicleCategory[]> {
  const redis = getRedis()
  if (redis) {
    const members = await redis.smembers(voterKey(voterId))
    return members as VehicleCategory[]
  }

  const store = await readFileStore()
  return store.voters[voterId] ?? []
}

export function makeSubmissionId(voterId: string, category: VehicleCategory): string {
  return `${voterId}:${category}`
}

export function parseSubmissionId(id: string): { voterId: string; category: VehicleCategory } {
  const sep = id.lastIndexOf(':')
  if (sep <= 0) throw new Error('Identifiant de vote invalide.')
  const category = id.slice(sep + 1)
  if (category !== 'voiture' && category !== 'camion') {
    throw new Error('Identifiant de vote invalide.')
  }
  return { voterId: id.slice(0, sep), category }
}

function toAdminRow(sub: VoteSubmission): AdminVoteRow {
  return { ...sub, id: makeSubmissionId(sub.voterId, sub.category) }
}

async function bumpPlateCount(
  redis: Redis,
  category: VehicleCategory,
  plate: string,
  delta: number,
) {
  const key = voteKey(category, plate)
  if (delta > 0) {
    await redis.incrby(key, delta)
    return
  }
  const next = Number(await redis.get(key)) - Math.abs(delta)
  if (next <= 0) await redis.del(key)
  else await redis.set(key, next)
}

export async function listAdminVotes(): Promise<AdminVoteRow[]> {
  const redis = getRedis()
  if (redis) {
    const keys = await redis.keys(`${PREFIX}:submission:*`)
    if (!keys.length) return []
    const rows: AdminVoteRow[] = []
    for (const key of keys) {
      const sub = await redis.get<VoteSubmission>(key)
      if (sub && typeof sub === 'object' && sub.voterId) rows.push(toAdminRow(sub))
    }
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  const store = await readFileStore()
  return store.submissions.map(toAdminRow).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function deleteAdminVote(voterId: string, category: VehicleCategory): Promise<void> {
  const redis = getRedis()

  if (redis) {
    const sub = await redis.get<VoteSubmission>(submissionKey(voterId, category))
    if (!sub) throw new Error('Vote introuvable.')

    await bumpPlateCount(redis, category, sub.plate, -1)
    await redis.srem(voterKey(voterId), category)
    await redis.del(submissionKey(voterId, category))
    await clearContactLock(redis, category, sub.contact)
    return
  }

  const store = await readFileStore()
  const index = store.submissions.findIndex(
    s => s.voterId === voterId && s.category === category,
  )
  if (index < 0) throw new Error('Vote introuvable.')

  const sub = store.submissions[index]
  const countKey = voteKey(category, sub.plate)
  store.counts[countKey] = Math.max(0, (store.counts[countKey] ?? 1) - 1)
  if (store.counts[countKey] === 0) delete store.counts[countKey]

  store.voters[voterId] = (store.voters[voterId] ?? []).filter(c => c !== category)
  if (!store.voters[voterId]?.length) delete store.voters[voterId]

  store.submissions.splice(index, 1)
  delete store.contactLocks[fileContactLockKey(category, sub.contact)]
  await writeFileStore(store)
}

export async function updateAdminVote(
  voterId: string,
  category: VehicleCategory,
  updates: {
    plate?: string
    category?: VehicleCategory
    contact?: VoterContact
  },
): Promise<AdminVoteRow> {
  const newCategory = updates.category ?? category
  const redis = getRedis()

  if (redis) {
    const key = submissionKey(voterId, category)
    const sub = await redis.get<VoteSubmission>(key)
    if (!sub) throw new Error('Vote introuvable.')

    const newPlate = updates.plate ?? sub.plate
    const contact = updates.contact ?? sub.contact

    if (newCategory !== category) {
      const taken = await redis.sismember(voterKey(voterId), newCategory)
      if (taken) throw new Error(`Ce votant a déjà un vote ${newCategory}.`)
    }

    const contactChanged = contactIndexPart(contact) !== contactIndexPart(sub.contact)
      || newCategory !== category
    if (contactChanged) {
      await assertContactAvailable(redis, newCategory, contact, voterId)
    }

    if (sub.plate !== newPlate || sub.category !== newCategory) {
      await bumpPlateCount(redis, sub.category, sub.plate, -1)
      await bumpPlateCount(redis, newCategory, newPlate, 1)
    }

    if (newCategory !== category) {
      await redis.srem(voterKey(voterId), category)
      await redis.sadd(voterKey(voterId), newCategory)
      await redis.del(key)
    }

    const updated: VoteSubmission = {
      ...sub,
      category: newCategory,
      plate: newPlate,
      plateDisplay: formatPlateDisplay(newPlate),
      contact,
    }
    await redis.set(submissionKey(voterId, newCategory), updated)
    if (contactChanged) {
      await clearContactLock(redis, sub.category, sub.contact)
      await setContactLock(redis, newCategory, contact, voterId)
    }
    return toAdminRow(updated)
  }

  const store = await readFileStore()
  const index = store.submissions.findIndex(
    s => s.voterId === voterId && s.category === category,
  )
  if (index < 0) throw new Error('Vote introuvable.')

  const sub = store.submissions[index]
  const newPlate = updates.plate ?? sub.plate
  const contact = updates.contact ?? sub.contact

  if (newCategory !== category && (store.voters[voterId] ?? []).includes(newCategory)) {
    throw new Error(`Ce votant a déjà un vote ${newCategory}.`)
  }

  const contactChanged = contactIndexPart(contact) !== contactIndexPart(sub.contact)
    || newCategory !== category
  if (contactChanged) {
    await assertContactAvailable(null, newCategory, contact, voterId)
  }

  if (sub.plate !== newPlate || sub.category !== newCategory) {
    const oldKey = voteKey(sub.category, sub.plate)
    store.counts[oldKey] = Math.max(0, (store.counts[oldKey] ?? 1) - 1)
    if (store.counts[oldKey] === 0) delete store.counts[oldKey]

    const newKey = voteKey(newCategory, newPlate)
    store.counts[newKey] = (store.counts[newKey] ?? 0) + 1
  }

  if (newCategory !== category) {
    store.voters[voterId] = (store.voters[voterId] ?? [])
      .filter(c => c !== category)
      .concat(newCategory)
  }

  const updated: VoteSubmission = {
    ...sub,
    category: newCategory,
    plate: newPlate,
    plateDisplay: formatPlateDisplay(newPlate),
    contact,
  }
  store.submissions[index] = updated
  if (contactChanged) {
    delete store.contactLocks[fileContactLockKey(sub.category, sub.contact)]
    store.contactLocks[fileContactLockKey(newCategory, contact)] = voterId
  }
  await writeFileStore(store)
  return toAdminRow(updated)
}
