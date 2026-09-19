<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import VoteThankYouModal from '@/components/VoteThankYouModal.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEventStatus } from '@/composables/useEventStatus'
import { submitVote } from '@/lib/api'
import { isContactValid, type ContactMethod } from '@/lib/contact'
import { formatPlateInput, normalizePlateInput } from '@/lib/plates'
import { getLocalVotedCategories, markLocalVoted } from '@/lib/voter'
import type { VehicleCategory } from '../../server/types'

const route = useRoute()
const router = useRouter()
const { status, voterId, refresh } = useEventStatus()

const category = ref<VehicleCategory>('voiture')
const plateInput = ref('')
const loadingVote = ref(false)
const contactMethod = ref<ContactMethod>('phone')
const phone = ref('')
const email = ref('')
const thankYouOpen = ref(false)
const localVoted = ref<VehicleCategory[]>(getLocalVotedCategories())

const normalizedPlate = computed(() => normalizePlateInput(plateInput.value))
const plateOk = computed(() => normalizedPlate.value.length >= 4)
const votingOpen = computed(() => status.value?.votingOpen ?? false)

const votedCategories = computed(() => {
  const fromServer = status.value?.votedCategories ?? []
  return [...new Set([...localVoted.value, ...fromServer])]
})

const alreadyVoted = computed(() => votedCategories.value.includes(category.value))

watch(() => status.value?.votedCategories, (cats) => {
  if (cats?.length) localVoted.value = [...new Set([...localVoted.value, ...cats])]
}, { immediate: true })

const contactOk = computed(() => isContactValid(contactMethod.value, phone.value, email.value))
const canSubmit = computed(() => plateOk.value && contactOk.value && votingOpen.value && !alreadyVoted.value)

function setCategory(value: VehicleCategory) {
  category.value = value
  router.replace({ query: { c: value } })
}

watch(() => route.query.c, (value) => {
  if (value === 'voiture' || value === 'camion') category.value = value
}, { immediate: true })

function onPlateInput(event: Event) {
  const target = event.target as HTMLInputElement
  plateInput.value = formatPlateInput(target.value)
}

async function vote() {
  if (!canSubmit.value) return
  loadingVote.value = true
  try {
    await submitVote(voterId, category.value, normalizedPlate.value, {
      contactMethod: contactMethod.value,
      phone: contactMethod.value === 'phone' ? phone.value : undefined,
      email: contactMethod.value === 'email' ? email.value : undefined,
    })
    markLocalVoted(category.value)
    localVoted.value = [...new Set([...localVoted.value, category.value])]
    plateInput.value = ''
    phone.value = ''
    email.value = ''
    thankYouOpen.value = true
    await refresh()
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : 'Erreur')
  }
  finally {
    loadingVote.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-lg space-y-3 sm:space-y-4 lg:max-w-xl">
    <VoteThankYouModal :open="thankYouOpen" @close="thankYouOpen = false" />

    <div class="flex items-end justify-between gap-2">
      <h2 class="font-race text-xl text-white neon-orange sm:text-2xl">Vote</h2>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="btn-chip panel-race flex items-center justify-center gap-2 py-3 font-race text-xs"
        :class="category === 'voiture' ? 'border-rasso-red bg-rasso-red/20 text-white' : 'text-white/55'"
        @click="setCategory('voiture')"
      >
        <img src="/assets/car.png" alt="" class="h-6 w-auto object-contain" width="28" height="28">
        Voiture
      </button>
      <button
        type="button"
        class="btn-chip panel-race flex items-center justify-center gap-2 py-3 font-race text-xs"
        :class="category === 'camion' ? 'border-rasso-blue bg-rasso-blue/20 text-white' : 'text-white/55'"
        @click="setCategory('camion')"
      >
        <img src="/assets/truck.png" alt="" class="h-6 w-auto object-contain" width="28" height="28">
        Camion
      </button>
    </div>

    <p v-if="!votingOpen" class="panel-race border-rasso-red/50 py-2 text-center text-xs font-bold uppercase text-rasso-red">
      Votes clôturés
    </p>
    <div
      v-else-if="alreadyVoted"
      class="panel-race border-rasso-neon/30 py-3 text-center"
    >
      <p class="text-xs font-bold uppercase text-rasso-neon">
        Vous avez déjà voté
      </p>
      <p class="mt-1 text-[11px] text-muted-foreground">
        {{ category === 'voiture' ? 'Voiture' : 'Camion' }} · enregistré sur cet appareil
      </p>
    </div>

    <div class="space-y-2">
      <Label class="font-race text-xs text-rasso-neon">Plaque du véhicule</Label>
      <Input
        :model-value="plateInput"
        class="h-12 border-rasso-neon/60 bg-black/50 text-center font-mono text-xl font-bold tracking-[0.12em] text-white uppercase placeholder:text-white/35 sm:h-14 sm:text-2xl sm:tracking-[0.15em]"
        placeholder="AB 123 CD"
        autocomplete="off"
        inputmode="text"
        :disabled="!votingOpen || alreadyVoted"
        @input="onPlateInput"
      />
    </div>

    <div class="panel-race space-y-3 p-4">
      <Label class="font-race text-xs text-rasso-neon">Contact</Label>
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="py-2 text-xs font-bold uppercase"
          :class="contactMethod === 'phone' ? 'bg-rasso-neon/20 text-rasso-neon' : 'text-muted-foreground'"
          :disabled="alreadyVoted"
          @click="contactMethod = 'phone'"
        >
          Tél.
        </button>
        <button
          type="button"
          class="py-2 text-xs font-bold uppercase"
          :class="contactMethod === 'email' ? 'bg-rasso-yellow/20 text-rasso-yellow' : 'text-muted-foreground'"
          :disabled="alreadyVoted"
          @click="contactMethod = 'email'"
        >
          E-mail
        </button>
      </div>
      <Input
        v-if="contactMethod === 'phone'"
        v-model="phone"
        class="h-11 border-white/20 bg-black/40 text-white placeholder:text-white/35"
        type="tel"
        inputmode="tel"
        placeholder="0696 12 34 56"
        :disabled="!votingOpen || alreadyVoted"
      />
      <Input
        v-else
        v-model="email"
        class="h-11 border-white/20 bg-black/40 text-white placeholder:text-white/35"
        type="email"
        inputmode="email"
        autocomplete="email"
        placeholder="vous@exemple.com"
        :disabled="!votingOpen || alreadyVoted"
      />
    </div>

    <Button
      class="btn-submit h-12 w-full border-0 font-race text-sm text-white"
      :class="category === 'voiture' ? 'bg-gradient-to-r from-[#ff4a00] to-[#ff8800]' : 'bg-gradient-to-r from-[#0077ff] to-[#00b4ff]'"
      :disabled="loadingVote || !canSubmit"
      @click="vote"
    >
      {{ loadingVote ? '…' : alreadyVoted ? 'Déjà voté' : 'Valider mon vote' }}
    </Button>
  </div>
</template>
