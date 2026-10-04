<script setup lang="ts">
import ButtonComponent, {
  type ButtonComponentProps,
} from '@/components/ui-components/ButtonComponent.vue'
import { NModal } from 'naive-ui'
import { toRefs } from 'vue'

export interface ModalButton extends ButtonComponentProps {
  text: string
}

interface ModalComponentProps {
  show: boolean
  buttonList: ModalButton[]
}

const props = defineProps<ModalComponentProps>()

const { show, buttonList } = toRefs(props)

defineEmits<{
  (e: 'update:show', value: boolean): void
}>()
</script>

<template>
  <n-modal
    v-model:show="show"
    :closable="false"
    :mask-closable="false"
    :bordered="true"
    :show-icon="false"
  >
    <div class="modal-wrapper">
      <div class="modal-content">
        <slot />
      </div>

      <div class="modal-actions">
        <ButtonComponent
          v-for="(button, index) in buttonList"
          :key="index"
          class="quantico-regular-22"
          :color-theme="button.colorTheme"
          :width="button.width"
          @click="button.onClick"
        >
          {{ button.text }}
        </ButtonComponent>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.modal-wrapper {
  width: 400px;
  max-width: 400px;
  height: fit-content;
  background-color: var(--color-neutral-0);
  padding: 24px 20px;
  border: 2px solid var(--color-neutral-900);
  border-radius: 20px;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-content {
  flex: 1 1 0;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}
</style>
