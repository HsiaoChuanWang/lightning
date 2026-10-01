import MainLayout from '@/layouts/MainLayout.vue'
import GameResultView from '@/views/GameResultView/GameResultView.vue'
import GameView from '@/views/GameView/GameView.vue'
import LoginView from '@/views/LoginView/LoginView.vue'
import RoundResultView from '@/views/RoundResultView/RoundResultView.vue'
import RoundStartView from '@/views/RoundStartView/RoundStartView.vue'
import StartChallengeView from '@/views/StartChallengeView/StartChallengeView.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', name: 'login', component: LoginView },
        {
          path: 'start-challenge/:matchId',
          name: 'start-challenge',
          component: StartChallengeView,
        },
        { path: 'round-start/:matchId', name: 'round-start', component: RoundStartView },
        { path: 'game/:matchId', name: 'game', component: GameView },
        { path: 'round-result/:matchId', name: 'round-result', component: RoundResultView },
        { path: 'game-result/:matchId', name: 'game-result', component: GameResultView },
      ],
    },
  ],
})

export default router
