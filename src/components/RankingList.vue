<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import type { VoteRecord } from '../../server/types'

defineProps<{
  title: string
  accent: 'voiture' | 'camion'
  items: VoteRecord[]
  loading?: boolean
}>()
</script>

<template>
  <section class="panel-race overflow-hidden">
    <div
      class="flex items-center justify-between px-3 py-2"
      :class="accent === 'voiture' ? 'bg-gradient-to-r from-[#ff4a00] to-[#c41e00]' : 'bg-gradient-to-r from-[#0077ff] to-[#0044aa]'"
    >
      <h3 class="font-race text-sm text-white">{{ title }}</h3>
      <img
        :src="accent === 'voiture' ? '/assets/car.png' : '/assets/truck.png'"
        alt=""
        class="h-6 w-auto object-contain opacity-95"
        width="28"
        height="28"
      >
    </div>

    <div class="space-y-2 p-2">
      <template v-if="loading">
        <Skeleton v-for="i in 3" :key="i" class="h-12 w-full bg-white/5" />
      </template>
      <template v-else-if="!items.length">
        <p class="py-8 text-center text-xs font-bold uppercase text-muted-foreground">—</p>
      </template>
      <template v-else>
        <div
          v-for="(item, index) in items.slice(0, 3)"
          :key="item.plate"
          class="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-3"
        >
          <span
            class="flex size-9 shrink-0 items-center justify-center font-race text-sm"
            :class="index === 0 ? 'text-rasso-yellow' : 'text-muted-foreground'"
          >
            #{{ index + 1 }}
          </span>
          <p class="min-w-0 flex-1 font-mono text-lg font-bold tracking-wide text-white">
            {{ item.plateDisplay }}
          </p>
          <p class="font-race text-rasso-neon">{{ item.votes }}</p>
        </div>
      </template>
    </div>
  </section>
</template>
