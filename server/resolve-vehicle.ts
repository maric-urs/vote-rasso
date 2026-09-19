import { SivLookupError } from './errors.js'
import { getRegistryVehicle } from './registry.js'
import { lookupVehicle as lookupSiv } from './siv.js'
import type { VehicleInfo } from './types.js'

/** Registre local (gratuit) → API SIV si configurée → erreur claire. */
export async function resolveVehicle(rawPlate: string): Promise<VehicleInfo> {
  const fromRegistry = await getRegistryVehicle(rawPlate)
  if (fromRegistry) return fromRegistry

  const hasSiv = Boolean(
    process.env.SIV_API_KEY?.trim()
    && process.env.SIV_API_BASE_URL?.trim()
    && process.env.SIV_API_HOST?.trim(),
  )

  if (hasSiv) {
    try {
      return await lookupSiv(rawPlate)
    }
    catch {
      // Si SIV échoue, message unique ci-dessous
    }
  }

  const allowMock = process.env.SIV_ALLOW_MOCK === 'true'
  if (allowMock) {
    return lookupSiv(rawPlate)
  }

  throw new SivLookupError(
    'Véhicule non enregistré. Demandez à l’accueil du rasso d’ajouter la plaque.',
  )
}
