<script setup lang="ts">
import { useCountdown } from '@/composables/useCountdown'

const props = defineProps<{
  closesAt: string
  open: boolean
}>()

const { label } = useCountdown(() => props.closesAt)
</script>

<template>
  <div
    class="border-t border-white/10 px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.2em]"
    :class="open ? 'text-muted-foreground' : 'bg-rasso-red/25 text-rasso-red'"
  >
    <template v-if="open">
      Clôture 20h · <span class="font-mono text-rasso-neon">{{ label }}</span>
    </template>
    <template v-else>
      Votes clôturés
    </template>
  </div>
</template>
