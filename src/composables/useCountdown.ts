import { computed, onMounted, onUnmounted, ref } from 'vue'

export function useCountdown(targetIso: () => string | undefined) {
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  const remaining = computed(() => {
    const target = targetIso()
    if (!target) return null
    const diff = new Date(target).getTime() - now.value
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, done: true }

    const hours = Math.floor(diff / 3_600_000)
    const minutes = Math.floor((diff % 3_600_000) / 60_000)
    const seconds = Math.floor((diff % 60_000) / 1000)
    return { hours, minutes, seconds, done: false }
  })

  const label = computed(() => {
    const value = remaining.value
    if (!value) return ''
    if (value.done) return 'Votes clôturés'
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(value.hours)}:${pad(value.minutes)}:${pad(value.seconds)}`
  })

  return { remaining, label }
}
