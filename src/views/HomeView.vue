<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Clock3, MapPin, Trophy } from '@lucide/vue'
import RaceCta from '@/components/brand/RaceCta.vue'
import { useEventStatus } from '@/composables/useEventStatus'

const { status, loading } = useEventStatus()
const disabled = computed(() => loading.value || status.value?.votingOpen === false)
</script>

<template>
  <div class="w-full space-y-4 md:space-y-5">
    <section class="panel-race relative overflow-hidden">
      <img
        src="/flyer.jpg"
        alt="Affiche Rasso Péléen"
        class="aspect-[4/5] max-h-[min(48vh,380px)] w-full object-cover object-top sm:max-h-[min(50vh,420px)] md:aspect-[21/9] md:max-h-[280px] lg:max-h-[320px]"
      >
      <div class="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/45 to-transparent md:via-[#050608]/25" />
      <div class="absolute inset-x-0 bottom-0 p-3 sm:p-4 md:p-5">
        <img src="/assets/flame-streak.svg" alt="" class="mb-2 h-5 w-full max-w-md opacity-90 sm:h-6">
        <h2 class="font-race text-2xl leading-none text-white neon-orange sm:text-3xl md:text-4xl">
          Vote
        </h2>
      </div>
    </section>

    <div class="grid grid-cols-3 gap-2">
      <div class="panel-race p-2.5 text-center sm:p-3">
        <Clock3 class="mx-auto mb-1 size-4 text-rasso-yellow" />
        <p class="text-[10px] font-bold uppercase text-muted-foreground">Heure</p>
        <p class="text-xs font-bold sm:text-sm">10h-19h</p>
      </div>
      <div class="panel-race col-span-2 p-2.5 sm:p-3">
        <MapPin class="mb-1 size-4 text-rasso-neon" />
        <p class="text-[10px] font-bold uppercase text-muted-foreground">Lieu</p>
        <p class="text-xs font-bold uppercase leading-snug sm:text-sm">Millenium · Morne-Rouge</p>
      </div>
    </div>

    <div class="grid gap-3 sm:gap-4 md:grid-cols-2">
      <RaceCta
        to="/voter?c=voiture"
        title="Voitures"
        subtitle="Top 3 — Élection"
        variant="car"
        :disabled="disabled"
        class="btn-stagger-1"
      />
      <RaceCta
        to="/voter?c=camion"
        title="Camions"
        subtitle="Top 3 — Élection"
        variant="truck"
        :disabled="disabled"
        class="btn-stagger-2"
      />
    </div>

    <RouterLink
      to="/classement"
      class="btn-live group panel-race flex items-center justify-between gap-2 px-4 py-3.5"
    >
      <div class="flex min-w-0 items-center gap-3">
        <Trophy class="size-5 shrink-0 text-rasso-yellow transition-transform duration-300 group-hover:rotate-12" />
        <span class="font-race truncate text-sm text-white sm:text-base">Classement live</span>
      </div>
      <span class="btn-live-dot shrink-0 font-race text-rasso-neon neon-cyan">LIVE</span>
    </RouterLink>

    <RouterLink
      to="/orga"
      class="block py-1 text-center text-[10px] font-bold uppercase tracking-widest text-white/25 hover:text-white/40"
    >
      Orga
    </RouterLink>
  </div>
</template>
