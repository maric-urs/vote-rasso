<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RefreshCw } from '@lucide/vue'
import RankingList from '@/components/RankingList.vue'
import { Button } from '@/components/ui/button'
import { fetchRankings } from '@/lib/api'
import type { RankingsResponse } from '../../server/types'

const data = ref<RankingsResponse | null>(null)
const loading = ref(true)
let timer: ReturnType<typeof setInterval> | undefined

async function refresh() {
  loading.value = !data.value
  try {
    data.value = await fetchRankings()
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  refresh()
  timer = setInterval(refresh, 8_000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="w-full max-w-5xl space-y-4">
    <div class="flex items-center justify-between gap-2">
      <h2 class="font-race text-xl text-white neon-cyan sm:text-2xl lg:text-3xl">Top 3</h2>
      <Button
        variant="outline"
        size="icon"
        class="size-10 border-white/20 bg-black/30"
        :disabled="loading"
        @click="refresh"
      >
        <RefreshCw class="size-4" :class="loading ? 'animate-spin' : ''" />
      </Button>
    </div>

    <div class="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <RankingList title="Voitures" accent="voiture" :items="data?.voiture ?? []" :loading="loading && !data" />
      <RankingList title="Camions" accent="camion" :items="data?.camion ?? []" :loading="loading && !data" />
    </div>
  </div>
</template>
