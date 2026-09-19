import type { VoterContact } from './contact.js'

export type VehicleCategory = 'voiture' | 'camion'

export interface VoteSubmission {
  voterId: string
  category: VehicleCategory
  plate: string
  plateDisplay: string
  contact: VoterContact
  createdAt: string
}

export interface AdminVoteRow extends VoteSubmission {
  id: string
}

export interface VoteRecord {
  plate: string
  plateDisplay: string
  category: VehicleCategory
  votes: number
}

export interface RankingsResponse {
  voiture: VoteRecord[]
  camion: VoteRecord[]
  updatedAt: string
  votingOpen: boolean
  closesAt: string
}

export interface EventStatus {
  votingOpen: boolean
  closesAt: string
  timezone: string
  eventDate: string
  eventTitle: string
}
