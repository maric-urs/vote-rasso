import { createRouter, createWebHistory } from 'vue-router'
import AdminView from '@/views/AdminView.vue'
import HomeView from '@/views/HomeView.vue'
import RankingsView from '@/views/RankingsView.vue'
import VoteView from '@/views/VoteView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/voter', name: 'vote', component: VoteView },
    { path: '/classement', name: 'rankings', component: RankingsView },
    { path: '/orga', name: 'orga', component: AdminView },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
