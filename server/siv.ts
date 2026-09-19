import { SivConfigError, SivLookupError } from './errors.js'
import { loadLocalEnv } from './load-env.js'
import { formatPlateDisplay, normalizePlate } from './plates.js'
import type { VehicleCategory, VehicleInfo } from './types.js'

const TRUCK_GENRE_CODES = new Set(['CAM', 'TRR', 'CTTE', 'CL', 'SREM', 'REM'])

function inferCategory(genreCode?: string): VehicleCategory {
  if (!genreCode) return 'voiture'
  const code = genreCode.toUpperCase()
  return TRUCK_GENRE_CODES.has(code) ? 'camion' : 'voiture'
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() && value.toUpperCase() !== 'INCONNU') {
      return value.trim()
    }
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return String(value)
    }
  }
  return undefined
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value
    if (typeof value === 'string' && value.trim() && value.toUpperCase() !== 'INCONNU') {
      const parsed = Number(value.replace(',', '.').replace(/[^\d.]/g, ''))
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return undefined
}

function collectFields(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...record }
  for (const value of Object.values(record)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, collectFields(value as Record<string, unknown>))
    }
  }
  return out
}

function extractDataRecord(payload: Record<string, unknown>): Record<string, unknown> {
  let candidate: unknown = payload.data ?? payload.vehicle ?? payload.vehicule ?? payload.result ?? payload

  if (Array.isArray(candidate)) candidate = candidate[0]
  if (candidate && typeof candidate === 'object') {
    const obj = candidate as Record<string, unknown>
    if (obj.data && typeof obj.data === 'object') candidate = obj.data
  }

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return collectFields(payload)
  }

  return collectFields(candidate as Record<string, unknown>)
}

function mockVehicle(normalized: string): VehicleInfo {
  const seed = normalized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const isTruck = seed % 5 === 0
  const brands = isTruck ? ['IVECO', 'SCANIA', 'MERCEDES'] : ['RENAULT', 'PEUGEOT', 'AUDI', 'BMW', 'VOLKSWAGEN']
  const models = isTruck ? ['Daily', 'R450', 'Actros'] : ['Clio', '308', 'A3', 'Série 1', 'Golf']
  const brand = brands[seed % brands.length]
  const model = models[seed % models.length]

  return {
    plate: normalized,
    plateDisplay: formatPlateDisplay(normalized),
    brand,
    model,
    version: `Version ${(seed % 9) + 1}.${seed % 4}`,
    color: ['Noir', 'Blanc', 'Gris', 'Rouge'][seed % 4],
    energy: isTruck ? 'Diesel' : ['Essence', 'Diesel', 'Hybride'][seed % 3],
    bodyType: isTruck ? 'Camion' : 'VP',
    genreCode: isTruck ? 'CAM' : 'VP',
    fiscalPower: (seed % 12) + 4,
    powerHp: 90 + (seed % 200),
    powerKw: 70 + (seed % 150),
    co2Emission: 100 + (seed % 120),
    seats: isTruck ? 3 : 5,
    firstRegistration: `20${10 + (seed % 15)}-${String((seed % 12) + 1).padStart(2, '0')}-15`,
    inferredCategory: isTruck ? 'camion' : 'voiture',
    source: 'mock',
  }
}

function mapApiPayload(normalized: string, raw: Record<string, unknown>): VehicleInfo {
  const data = extractDataRecord(raw)

  const genreCode = pickString(
    data.genre_carte_grise,
    data.genreCG,
    data.AWN_genre_carte_grise,
    data.genre,
    data.genre_national,
    data.genre_v,
  )

  const brand = pickString(data.marque, data.AWN_marque, data.brand, data.make)
  const model = pickString(
    data.modele,
    data.modele_exact,
    data.AWN_modele,
    data.model,
    data.modele_etude,
    data.gamme,
  )

  if (!brand && !model) {
    throw new SivLookupError('Réponse SIV incomplète : marque/modèle introuvables.')
  }

  return {
    plate: normalized,
    plateDisplay: formatPlateDisplay(normalized),
    brand: brand ?? '—',
    model: model ?? '—',
    version: pickString(
      data.version,
      data.phase,
      data.serie,
      data.AWN_version,
      data.libelle,
      data.AWN_libelle,
      data.sra_commercial,
    ),
    color: pickString(data.couleur, data.AWN_couleur),
    energy: pickString(data.energie, data.AWN_energie, data.carburant, data.energie_nom),
    bodyType: pickString(data.carrosserie, data.AWN_carrosserie, data.genre, data.type_carrosserie),
    genreCode,
    fiscalPower: pickNumber(
      data.puissance_fiscale,
      data.puissance_administrative,
      data.AWN_puissance_fiscale,
      data.cv_fiscaux,
    ),
    powerHp: pickNumber(
      data.puissance_ch,
      data.puissance_chevaux,
      data.puissance_reelle,
      data.AWN_puissance_chevaux,
      data.ch_din,
    ),
    powerKw: pickNumber(data.puissance_kw, data.AWN_puissance_KW, data.puissance_KW),
    co2Emission: pickNumber(data.co2, data.co_2, data.AWN_emission_co_2, data.emission_co2),
    seats: pickNumber(data.nb_places, data.AWN_nbr_de_places, data.nbr_places),
    vin: pickString(data.vin, data.AWN_VIN, data.numero_serie, data.cint),
    firstRegistration: pickString(
      data.date_mise_en_circulation,
      data.AWN_date_mise_en_circulation,
      data.date_premiere_immatriculation,
    ),
    inferredCategory: inferCategory(genreCode),
    source: 'siv',
  }
}

function rapidApiHeaders(apiKey: string, apiHost: string): Record<string, string> {
  return {
    Accept: 'application/json',
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': apiHost,
  }
}

function parseApiError(payload: Record<string, unknown>, status: number): string {
  const message = pickString(payload.message, payload.error, payload.detail)
  if (message?.toLowerCase().includes('not subscribed')) {
    return 'Abonnement RapidAPI manquant : cliquez sur « Subscribe to Test » sur l’API, puis réessayez.'
  }
  return message ?? `Erreur SIV (${status}).`
}

async function fetchFromRapidApi(
  normalized: string,
  apiKey: string,
  apiHost: string,
  apiBase: string,
): Promise<VehicleInfo> {
  const plateDisplay = formatPlateDisplay(normalized)
  const method = (process.env.SIV_API_METHOD ?? 'POST').toUpperCase()
  const formField = process.env.SIV_FORM_FIELD ?? 'immatriculation'

  let response: Response

  if (method === 'POST') {
    const form = new FormData()
    form.append(formField, plateDisplay)
    response = await fetch(apiBase, {
      method: 'POST',
      headers: rapidApiHeaders(apiKey, apiHost),
      body: form,
    })
  }
  else {
    const url = new URL(apiBase.includes('://') ? apiBase : `https://${apiBase}`)
    if (!url.searchParams.has('immatriculation') && !url.searchParams.has('plaque')) {
      url.searchParams.set('immatriculation', plateDisplay)
    }
    const token = process.env.SIV_RAPIDAPI_TOKEN?.trim()
    const hostName = process.env.SIV_RAPIDAPI_HOST_NAME?.trim()
    if (token) url.searchParams.set('token', token)
    if (hostName) url.searchParams.set('host_name', hostName)

    response = await fetch(url.toString(), {
      method: 'GET',
      headers: rapidApiHeaders(apiKey, apiHost),
    })
  }

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>

  if (!response.ok) {
    throw new SivLookupError(parseApiError(payload, response.status))
  }

  if (payload.error === true || payload.success === false) {
    throw new SivLookupError(pickString(payload.message, payload.error) ?? 'Véhicule introuvable dans le SIV.')
  }

  const vehicle = mapApiPayload(normalized, payload)

  if (vehicle.brand === '—' && vehicle.model === '—') {
    throw new SivLookupError('Véhicule introuvable ou données SIV vides.')
  }

  return vehicle
}

export async function lookupVehicle(rawPlate: string): Promise<VehicleInfo> {
  loadLocalEnv()

  const normalized = normalizePlate(rawPlate)
  const apiKey = process.env.SIV_API_KEY?.trim()
  const apiHost = process.env.SIV_API_HOST?.trim()
  const apiBase = process.env.SIV_API_BASE_URL?.trim()

  if (!apiKey || !apiBase || !apiHost) {
    const allowMock = process.env.SIV_ALLOW_MOCK === 'true'
      || (process.env.SIV_ALLOW_MOCK !== 'false' && process.env.NODE_ENV !== 'production')

    if (allowMock) {
      return mockVehicle(normalized)
    }

    throw new SivConfigError(
      'API SIV non configurée. Ajoutez SIV_API_KEY, SIV_API_HOST et SIV_API_BASE_URL dans .env.',
    )
  }

  return fetchFromRapidApi(normalized, apiKey, apiHost, apiBase)
}
