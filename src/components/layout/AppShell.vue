<script setup lang="ts">
import { Home, Trophy, Vote } from '@lucide/vue'
import { RouterLink, useRoute } from 'vue-router'
import RacingBackdrop from '@/components/brand/RacingBackdrop.vue'
import CountdownBanner from '@/components/CountdownBanner.vue'
import { useEventStatus } from '@/composables/useEventStatus'

const route = useRoute()
const { status } = useEventStatus()

const nav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/voter', label: 'Vote', icon: Vote },
  { to: '/classement', label: 'Top 3', icon: Trophy },
]

function isActive(to: string) {
  return route.path === to
}
</script>

<template>
  <RacingBackdrop />

  <div class="relative flex min-h-dvh min-h-svh flex-col">
    <div class="h-1 shrink-0 stripe-race" />

    <header class="sticky top-0 z-40 border-b border-white/10 bg-[#050608]/90 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div class="flex min-w-0 items-center gap-3">
          <div class="min-w-0">
            <p class="font-race truncate text-lg leading-none text-white neon-orange sm:text-xl">
              Rasso Péléen
            </p>
            <p class="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.22em] text-rasso-neon sm:text-[10px] sm:tracking-[0.28em]">
              Auto · Camion
            </p>
          </div>
          <img
            src="/assets/checkered.svg"
            alt=""
            class="hidden size-8 shrink-0 opacity-90 sm:block lg:size-9"
            width="36"
            height="36"
          >
        </div>

        <!-- Nav desktop / tablette large -->
        <nav class="nav-desktop items-center gap-1" aria-label="Navigation">
          <RouterLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors"
            :class="isActive(item.to)
              ? 'bg-gradient-to-r from-[#ff4a00] to-[#c41e00] text-white'
              : 'text-muted-foreground hover:bg-white/5 hover:text-white'"
          >
            <component :is="item.icon" class="size-4" stroke-width="2.2" />
            {{ item.label }}
          </RouterLink>
        </nav>

        <img
          src="/assets/checkered.svg"
          alt=""
          class="size-8 shrink-0 opacity-90 sm:hidden"
          width="32"
          height="32"
        >
      </div>
      <CountdownBanner v-if="status" :closes-at="status.closesAt" :open="status.votingOpen" />
    </header>

    <main class="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-nav-safe md:px-6 md:pt-6">
      <slot />
    </main>
  </div>

  <!-- Hors du layout overflow : toujours visible sur téléphone -->
  <Teleport to="body">
    <nav class="nav-mobile" aria-label="Navigation mobile">
      <div class="nav-mobile-bar">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-mobile-item"
          :class="isActive(item.to) ? 'nav-mobile-item-active' : ''"
        >
          <component :is="item.icon" class="size-5" stroke-width="2.2" />
          {{ item.label }}
        </RouterLink>
      </div>
    </nav>
  </Teleport>
</template>
