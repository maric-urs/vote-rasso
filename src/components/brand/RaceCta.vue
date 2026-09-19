<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{
  to: string
  title: string
  subtitle: string
  variant: 'car' | 'truck'
  disabled?: boolean
}>()
</script>

<template>
  <RouterLink
    :to="to"
    class="btn-alive group relative block overflow-hidden border-2 border-white/15 p-3 sm:p-4"
    :class="[
      disabled ? 'pointer-events-none opacity-40' : '',
      variant === 'car' ? 'btn-alive-car bg-gradient-to-br from-[#ff4a00] to-[#b91c00]' : 'btn-alive-truck bg-gradient-to-br from-[#0077ff] to-[#003d99]',
    ]"
  >
    <span class="btn-alive-shine" aria-hidden="true" />
    <span class="btn-alive-glow" aria-hidden="true" />
    <div class="absolute inset-0 bg-[url('/assets/speed-lines.svg')] bg-cover opacity-20 transition-opacity duration-300 group-hover:opacity-35" />
    <div class="relative flex items-center justify-between gap-2 sm:gap-3">
      <div class="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <div class="flex size-12 shrink-0 items-center justify-center bg-black/25 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105 sm:size-14">
          <img
            :src="variant === 'car' ? '/assets/car.png' : '/assets/truck.png'"
            alt=""
            class="h-8 w-auto object-contain transition-transform duration-300 group-hover:-translate-x-0.5 sm:h-9"
            width="48"
            height="48"
          >
        </div>
        <div class="min-w-0">
          <p class="font-race truncate text-xl leading-none text-white drop-shadow-md sm:text-2xl">{{ title }}</p>
          <p class="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-white/90 sm:text-[11px] sm:tracking-[0.18em]">{{ subtitle }}</p>
        </div>
      </div>
      <span class="btn-alive-go shrink-0 font-race text-lg text-rasso-neon sm:text-xl">GO</span>
    </div>
  </RouterLink>
</template>
