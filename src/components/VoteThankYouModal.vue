<script setup lang="ts">
import { Button } from '@/components/ui/button'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

/** Martinique (+596) — ouvre WhatsApp chat */
const WHATSAPP_URL = 'https://wa.me/596696255605'
const PHONE_DISPLAY = '0696 25 56 05'
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="thank-you-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="thank-you-title"
      @click.self="emit('close')"
    >
      <div class="thank-you-panel panel-race" @click.stop>
        <h2 id="thank-you-title" class="font-race text-lg text-rasso-neon neon-cyan sm:text-xl">
          Merci pour votre vote
        </h2>
        <p class="mt-1 text-2xl" aria-hidden="true">🚀</p>

        <div class="mt-4 space-y-3 text-sm leading-relaxed text-white/90">
          <p class="font-bold text-white">
            Besoin d’un outil digital adapté à votre activité ?
          </p>
          <p>
            Je conçois des <strong>solutions digitales 100 % sur mesure</strong> pour les professionnels et les entreprises. 💻
          </p>
          <ul class="space-y-1 text-white/85">
            <li>🔹 <strong>SaaS sur mesure</strong></li>
            <li>🔹 <strong>Sites internet vitrines professionnels</strong></li>
            <li>🔹 <strong>Logiciels professionnels personnalisés</strong></li>
            <li>🔹 <strong>Outils métiers adaptés à vos besoins</strong></li>
            <li>🔹 <strong>Applications web sur mesure</strong></li>
            <li>🔹 Automatisation et digitalisation de vos tâches</li>
          </ul>
          <p class="font-bold text-rasso-yellow">
            Votre besoin est spécifique ? Je crée l’outil qu’il vous faut.
          </p>
          <p>
            Gagnez du temps, simplifiez votre travail et développez votre activité grâce à une solution pensée spécialement pour vous.
          </p>
          <p class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span>📞 <strong>Contactez-moi au :</strong></span>
            <a
              :href="WHATSAPP_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 rounded-md bg-[#25D366]/15 px-2 py-1 font-bold text-[#25D366] underline decoration-[#25D366]/50 underline-offset-2 transition hover:bg-[#25D366]/25"
              aria-label="Ouvrir WhatsApp pour contacter au 0696 25 56 05"
            >
              {{ PHONE_DISPLAY }}
              <span class="text-[10px] font-bold uppercase tracking-wide no-underline opacity-90">WhatsApp</span>
            </a>
          </p>
          <p class="text-white/80">
            👉 <strong>Parlons de votre projet et construisons votre solution digitale sur mesure.</strong>
          </p>
        </div>

        <Button
          class="mt-5 h-11 w-full shrink-0 font-race text-white bg-gradient-to-r from-[#ff4a00] to-[#ff8800]"
          @click="emit('close')"
        >
          Fermer
        </Button>
      </div>
    </div>
  </Teleport>
</template>
