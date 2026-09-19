<template>
  <div class="race-stage pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
    <!-- Base -->
    <div class="race-stage-base" />

    <!-- Mesh ambient -->
    <div class="race-mesh race-mesh-a" />
    <div class="race-mesh race-mesh-b" />
    <div class="race-mesh race-mesh-c" />

    <!-- Soft beams -->
    <div class="race-beam race-beam-1" />
    <div class="race-beam race-beam-2" />

    <!-- Perspective track -->
    <div class="race-horizon">
      <div class="race-horizon-line" />
      <div class="race-floor">
        <div class="race-floor-grid" />
      </div>
    </div>

    <!-- Specks -->
    <div class="race-specks">
      <span v-for="n in 14" :key="n" class="race-speck" :style="speckStyle(n)" />
    </div>

    <!-- Diagonal sheen -->
    <div class="race-sheen" />

    <!-- Film grain + vignette -->
    <div class="race-grain" />
    <div class="race-vignette" />
  </div>
</template>

<script setup lang="ts">
function speckStyle(n: number) {
  const left = ((n * 37) % 97) + 1.5
  const delay = ((n * 0.73) % 8).toFixed(2)
  const duration = (10 + (n % 7) * 1.4).toFixed(1)
  const size = 1.5 + (n % 4) * 0.55
  const top = 8 + ((n * 19) % 70)
  const hue = n % 2 === 0 ? '255, 90, 20' : '0, 220, 255'
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    background: `rgba(${hue}, 0.85)`,
    boxShadow: `0 0 ${size * 3}px rgba(${hue}, 0.55)`,
  }
}
</script>
