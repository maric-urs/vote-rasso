import { onMounted, onUnmounted, ref } from 'vue'
import { fetchEventStatus, type EventStatusResponse } from '@/lib/api'
import { getVoterId, syncLocalVotedCategories } from '@/lib/voter'

const POLL_MS = 15_000

export function useEventStatus() {
  const status = ref<EventStatusResponse | null>(null)
  const loading = ref(true)
  const voterId = getVoterId()
  let timer: ReturnType<typeof setInterval> | undefined

  async function refresh() {
    try {
      status.value = await fetchEventStatus(voterId)
      if (status.value.votedCategories.length) {
        syncLocalVotedCategories(status.value.votedCategories)
      }
    }
    finally {
      loading.value = false
    }
  }

  onMounted(() => {
    refresh()
    timer = setInterval(refresh, POLL_MS)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { status, loading, voterId, refresh }
}
