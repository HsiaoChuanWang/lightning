<script setup lang="ts">
import type { ColorKey } from '@/components/ui-components/ButtonComponent.vue'
import ModalComponent, { type ModalButton } from '@/components/ui-components/ModalComponent.vue'
import type { RevengeStatus } from '@/stores/revenge'
import { computed } from 'vue'

interface PlayAgainAction {
  text: string
  colorTheme: ColorKey
  status: RevengeStatus
}

const props = defineProps<{
  isInviter: boolean
  isWin: boolean
  show: boolean
  status: RevengeStatus
}>()

const emit = defineEmits<{
  (event: 'reply', status: RevengeStatus): void
}>()

const modalData = computed(() => {
  const initiatorMap: Record<
    RevengeStatus,
    { title: string; description: string; actions: PlayAgainAction[] }
  > = {
    pending: {
      title: 'Pending',
      description: 'Waiting for the opponent to accept',
      actions: [{ text: 'Cancel', colorTheme: 'neutral', status: 'canceled' }],
    },
    matched: { title: 'Matched', description: 'The opponent has accepted', actions: [] },
    rejected: { title: 'Rejected', description: 'The opponent rejected your challenge', actions: [] },
    canceled: { title: 'Canceled', description: 'The rematch request has been canceled', actions: [] },
  }

  const invitedMap: Record<
    RevengeStatus,
    { title: string; description: string; actions: PlayAgainAction[] }
  > = {
    pending: {
      title: 'PLAY AGAIN?',
      description: props.isWin
        ? 'Your defeated opponent has challenged you to a rematch. Do you accept?'
        : 'Your opponent wants a rematch. Ready for revenge?',
      actions: [
        { text: props.isWin ? 'Sure!' : "Let's go!", colorTheme: 'mustard', status: 'matched' },
        { text: props.isWin ? 'No thanks' : 'No way', colorTheme: 'neutral', status: 'rejected' },
      ],
    },
    matched: { title: 'Matched', description: 'The match is starting soon', actions: [] },
    rejected: { title: 'Rejected', description: 'The opponent has rejected', actions: [] },
    canceled: { title: 'Canceled', description: 'The opponent canceled the rematch request', actions: [] },
  }

  return (props.isInviter ? initiatorMap : invitedMap)[props.status]
})

const modalButtons = computed<ModalButton[]>(() =>
  modalData.value.actions.map(({ status, ...button }) => ({
    ...button,
    onClick: () => emit('reply', status),
  })),
)
</script>

<template>
  <ModalComponent :show="show" :button-list="modalButtons">
    <div class="content-wrapper">
      <p class="bungee-regular-40">{{ modalData.title }}</p>
      <p class="exo2-regular-24 description">{{ modalData.description }}</p>
    </div>
  </ModalComponent>
</template>

<style scoped>
.content-wrapper {
  width: 100%;
  height: 100%;
  text-align: center;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.description {
  height: 120px;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
</style>
