<script setup lang="ts">
import { computeWinRate } from '@/utils/helpers'
import { useRoute } from 'vue-router'
import PlayerCard from './components/PlayerCard.vue'
import { useChallengePreparation } from './composables/useChallengePreparation'

const route = useRoute()
const { userInfo, opponentInfo } = useChallengePreparation({
  matchId: route.params.matchId,
  prompt: '請分別描述圖片的內容，不需要特別分離',
})
</script>

<template>
  <div class="start-challenge-view">
    <PlayerCard
      :delay="0"
      :user-id="userInfo.userId"
      :is-me="true"
      :user-name="userInfo.userName"
      :info-data="{
        winCount: userInfo.winCount,
        lossCount: userInfo.lossCount,
        winRate: computeWinRate(userInfo.winCount, userInfo.lossCount),
      }"
    />

    <PlayerCard
      :delay="0.8"
      :user-id="opponentInfo.opponentId"
      :is-me="false"
      :user-name="opponentInfo.opponentName"
      :info-data="{
        winCount: opponentInfo.winCount,
        lossCount: opponentInfo.lossCount,
        winRate: computeWinRate(opponentInfo.winCount, opponentInfo.lossCount),
      }"
    />
  </div>
</template>

<style scoped>
.start-challenge-view {
  min-height: 100vh;
  background-image:
    url('@/assets/images/startChallenge/startChallengeBackground.png'),
    linear-gradient(to bottom, var(--color-blue-300), var(--color-blue-700));
  background-size:
    auto 100%,
    cover;
  background-position: center, center;
  background-repeat: no-repeat, no-repeat;

  display: flex;
  flex-direction: column;
  gap: 30px;
  justify-content: center;
  align-items: center;
}
</style>
