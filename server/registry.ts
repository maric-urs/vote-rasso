import { Redis } from '@upstash/redis'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { formatPlateDisplay, normalizePlate } from './plates.js'
import type { VehicleCategory, VehicleInfo } from './types.js'

const REGISTRY_KEY = 'rasso:2026:registry'
const REGISTRY_FILE = join(process.cwd(), '.data', 'registry.json')

export interface RegistryInput {
  plate: string
  brand: string
  model: string
  category?: VehicleCategory
  version?: string
  color?: string
  energy?: string
  bodyType?: string
  fiscalPower?: number
  powerHp?: number
  co2Emission?: number
  seats?: number
  firstRegistration?: string
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

async function readFileRegistry(): Promise<Record<string, VehicleInfo>> {
  try {
    const raw = await readFile(REGISTRY_FILE, 'utf8')
    return JSON.parse(raw) as Record<string, VehicleInfo>
  }
  catch {
    return {}
  }
}

async function writeFileRegistry(data: Record<string, VehicleInfo>) {
  await mkdir(join(process.cwd(), '.data'), { recursive: true })
  await writeFile(REGISTRY_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function toVehicleInfo(input: RegistryInput): VehicleInfo {
  const plate = normalizePlate(input.plate)
  const genreCode = input.category === 'camion' ? 'CAM' : 'VP'
  return {
    plate,
    plateDisplay: formatPlateDisplay(plate),
    brand: input.brand.trim(),
    model: input.model.trim(),
    version: input.version?.trim(),
    color: input.color?.trim(),
    energy: input.energy?.trim(),
    bodyType: input.bodyType?.trim(),
    genreCode,
    fiscalPower: input.fiscalPower,
    powerHp: input.powerHp,
    co2Emission: input.co2Emission,
    seats: input.seats,
    firstRegistration: input.firstRegistration?.trim(),
    inferredCategory: input.category ?? 'voiture',
    source: 'registry',
  }
}

export async function upsertRegistryVehicle(input: RegistryInput): Promise<VehicleInfo> {
  const vehicle = toVehicleInfo(input)
  const redis = getRedis()

  if (redis) {
    await redis.hset(REGISTRY_KEY, { [vehicle.plate]: vehicle })
    return vehicle
  }

  const store = await readFileRegistry()
  store[vehicle.plate] = vehicle
  await writeFileRegistry(store)
  return vehicle
}

export async function getRegistryVehicle(rawPlate: string): Promise<VehicleInfo | null> {
  const plate = normalizePlate(rawPlate)
  const redis = getRedis()

  if (redis) {
    const hit = await redis.hget<VehicleInfo>(REGISTRY_KEY, plate)
    return hit ?? null
  }

  const store = await readFileRegistry()
  return store[plate] ?? null
}

export async function listRegistryVehicles(): Promise<VehicleInfo[]> {
  const redis = getRedis()

  if (redis) {
    const all = await redis.hgetall<Record<string, VehicleInfo>>(REGISTRY_KEY)
    if (!all) return []
    return Object.values(all).sort((a, b) => a.plateDisplay.localeCompare(b.plateDisplay))
  }

  const store = await readFileRegistry()
  return Object.values(store).sort((a, b) => a.plateDisplay.localeCompare(b.plateDisplay))
}

export function assertAdminPin(pin: string | undefined): void {
  const expected = process.env.ADMIN_PIN?.trim()
  if (!expected) {
    throw new Error('ADMIN_PIN non configuré sur le serveur.')
  }
  if (!pin || pin !== expected) {
    throw new Error('Code organisateur incorrect.')
  }
}
