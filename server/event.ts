import type { EventStatus } from './types.js'

export const EVENT_TIMEZONE = 'America/Martinique'
export const EVENT_TITLE = 'Rasso Péléen Auto-Camion'
export const EVENT_DATE_LABEL = 'Dimanche 20 septembre 2026'
/** Clôture des votes : 20h heure Martinique */
export const VOTING_CLOSE_AT = new Date('2026-09-20T20:00:00-04:00')

export function getEventStatus(now = new Date()): EventStatus {
  const votingOpen = now < VOTING_CLOSE_AT

  return {
    votingOpen,
    closesAt: VOTING_CLOSE_AT.toISOString(),
    timezone: EVENT_TIMEZONE,
    eventDate: EVENT_DATE_LABEL,
    eventTitle: EVENT_TITLE,
  }
}

export function assertVotingOpen(now = new Date()): void {
  if (!getEventStatus(now).votingOpen) {
    throw new VotingClosedError()
  }
}

export class VotingClosedError extends Error {
  constructor() {
    super('Les votes sont clôturés.')
    this.name = 'VotingClosedError'
  }
}
