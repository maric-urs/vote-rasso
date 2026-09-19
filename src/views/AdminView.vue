<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deleteAdminVote, fetchAdminVotes, updateAdminVote } from '@/lib/admin-api'
import type { ContactMethod } from '@/lib/contact'
import { formatPlateInput, normalizePlateInput } from '@/lib/plates'
import type { AdminVoteRow, VehicleCategory } from '../../server/types'

const PIN_KEY = 'rasso-orga-pin'
const pin = ref(sessionStorage.getItem(PIN_KEY) ?? '')
const unlocked = ref(false)
const loading = ref(false)
const votes = ref<AdminVoteRow[]>([])
const editingId = ref<string | null>(null)

const editPlate = ref('')
const editCategory = ref<VehicleCategory>('voiture')
const editContactMethod = ref<ContactMethod>('phone')
const editPhone = ref('')
const editEmail = ref('')

const filter = ref<'all' | VehicleCategory>('all')
const filteredVotes = computed(() => {
  if (filter.value === 'all') return votes.value
  return votes.value.filter(v => v.category === filter.value)
})

async function loadVotes() {
  loading.value = true
  try {
    votes.value = await fetchAdminVotes(pin.value)
  }
  catch (error) {
    unlocked.value = false
    sessionStorage.removeItem(PIN_KEY)
    throw error
  }
  finally {
    loading.value = false
  }
}

async function unlock() {
  try {
    await loadVotes()
    sessionStorage.setItem(PIN_KEY, pin.value)
    unlocked.value = true
    toast.success(`${votes.value.length} vote(s)`)
  }
  catch {
    toast.error('Code incorrect')
  }
}

onMounted(() => {
  if (pin.value) unlock()
})

function contactLabel(row: AdminVoteRow) {
  if (row.contact.method === 'phone') return row.contact.phone ?? '—'
  const c = row.contact as { email?: string; address?: string }
  return c.email ?? c.address ?? '—'
}

function startEdit(row: AdminVoteRow) {
  editingId.value = row.id
  editPlate.value = row.plateDisplay
  editCategory.value = row.category
  const method = row.contact.method as ContactMethod | 'address'
  editContactMethod.value = method === 'address' ? 'email' : method
  editPhone.value = row.contact.phone ?? ''
  const c = row.contact as { email?: string; address?: string }
  editEmail.value = c.email ?? c.address ?? ''
}

function cancelEdit() {
  editingId.value = null
}

function onEditPlateInput(event: Event) {
  const target = event.target as HTMLInputElement
  editPlate.value = formatPlateInput(target.value)
}

async function saveEdit() {
  if (!editingId.value) return
  const plate = normalizePlateInput(editPlate.value)
  if (plate.length < 4) {
    toast.error('Plaque invalide')
    return
  }
  loading.value = true
  try {
    await updateAdminVote(pin.value, editingId.value, {
      plate,
      category: editCategory.value,
      contactMethod: editContactMethod.value,
      phone: editContactMethod.value === 'phone' ? editPhone.value : undefined,
      email: editContactMethod.value === 'email' ? editEmail.value : undefined,
    })
    toast.success('Vote mis à jour')
    editingId.value = null
    await loadVotes()
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : 'Erreur')
  }
  finally {
    loading.value = false
  }
}

async function remove(row: AdminVoteRow) {
  if (!confirm(`Supprimer le vote ${row.plateDisplay} (${row.category}) ?`)) return
  loading.value = true
  try {
    await deleteAdminVote(pin.value, row.id)
    toast.success('Vote supprimé')
    if (editingId.value === row.id) editingId.value = null
    await loadVotes()
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : 'Erreur')
  }
  finally {
    loading.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    timeZone: 'America/Martinique',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
</script>

<template>
  <div class="space-y-4">
    <h2 class="font-race text-2xl text-white neon-orange">Orga</h2>

    <div v-if="!unlocked" class="panel-race space-y-3 p-4">
      <Label class="text-rasso-neon">Code</Label>
      <Input
        v-model="pin"
        type="password"
        inputmode="numeric"
        class="border-white/20 bg-black/40 text-white"
        placeholder="••••••"
        autocomplete="off"
        @keyup.enter="unlock"
      />
      <Button class="w-full font-race" @click="unlock">Entrer</Button>
    </div>

    <template v-else>
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm text-rasso-neon">{{ votes.length }} vote(s)</p>
        <Button variant="outline" size="sm" class="text-xs" :disabled="loading" @click="loadVotes">
          Actualiser
        </Button>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          class="panel-race py-2 text-[10px] font-bold uppercase"
          :class="filter === 'all' ? 'text-white' : 'text-muted-foreground'"
          @click="filter = 'all'"
        >
          Tous
        </button>
        <button
          type="button"
          class="panel-race py-2 text-[10px] font-bold uppercase"
          :class="filter === 'voiture' ? 'text-rasso-red' : 'text-muted-foreground'"
          @click="filter = 'voiture'"
        >
          Voiture
        </button>
        <button
          type="button"
          class="panel-race py-2 text-[10px] font-bold uppercase"
          :class="filter === 'camion' ? 'text-rasso-blue' : 'text-muted-foreground'"
          @click="filter = 'camion'"
        >
          Camion
        </button>
      </div>

      <p v-if="loading && !votes.length" class="text-center text-xs text-muted-foreground">Chargement…</p>
      <p v-else-if="!filteredVotes.length" class="panel-race py-6 text-center text-xs text-muted-foreground">
        Aucun vote
      </p>

      <div v-for="row in filteredVotes" :key="row.id" class="panel-race space-y-2 p-3">
        <template v-if="editingId === row.id">
          <Input
            :model-value="editPlate"
            class="font-mono text-center uppercase text-white"
            @input="onEditPlateInput"
          />
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="py-2 text-xs font-bold uppercase"
              :class="editCategory === 'voiture' ? 'text-rasso-red' : 'text-muted-foreground'"
              @click="editCategory = 'voiture'"
            >
              Voiture
            </button>
            <button
              type="button"
              class="py-2 text-xs font-bold uppercase"
              :class="editCategory === 'camion' ? 'text-rasso-blue' : 'text-muted-foreground'"
              @click="editCategory = 'camion'"
            >
              Camion
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="py-1 text-[10px] font-bold uppercase"
              :class="editContactMethod === 'phone' ? 'text-rasso-neon' : 'text-muted-foreground'"
              @click="editContactMethod = 'phone'"
            >
              Tél.
            </button>
            <button
              type="button"
              class="py-1 text-[10px] font-bold uppercase"
              :class="editContactMethod === 'email' ? 'text-rasso-yellow' : 'text-muted-foreground'"
              @click="editContactMethod = 'email'"
            >
              E-mail
            </button>
          </div>
          <Input
            v-if="editContactMethod === 'phone'"
            v-model="editPhone"
            type="tel"
            class="text-white"
          />
          <Input
            v-else
            v-model="editEmail"
            type="email"
            class="text-white"
          />
          <div class="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" @click="cancelEdit">Annuler</Button>
            <Button size="sm" class="font-race" :disabled="loading" @click="saveEdit">Enregistrer</Button>
          </div>
        </template>

        <template v-else>
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-mono text-lg font-bold text-white">{{ row.plateDisplay }}</p>
              <p class="text-[10px] font-bold uppercase text-muted-foreground">
                {{ row.category }} · {{ formatDate(row.createdAt) }}
              </p>
            </div>
            <span
              class="shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase"
              :class="row.category === 'voiture' ? 'bg-rasso-red/30 text-rasso-red' : 'bg-rasso-blue/30 text-rasso-blue'"
            >
              {{ row.category }}
            </span>
          </div>
          <p class="break-words text-xs text-white/80">
            <span class="text-rasso-neon">{{ row.contact.method === 'phone' ? 'Tél.' : 'E-mail' }}</span>
            {{ contactLabel(row) }}
          </p>
          <p class="truncate text-[10px] text-muted-foreground" :title="row.voterId">
            ID appareil : {{ row.voterId }}
          </p>
          <div class="grid grid-cols-2 gap-2 pt-1">
            <Button size="sm" variant="outline" class="text-xs" @click="startEdit(row)">Modifier</Button>
            <Button size="sm" variant="destructive" class="text-xs" :disabled="loading" @click="remove(row)">
              Supprimer
            </Button>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
