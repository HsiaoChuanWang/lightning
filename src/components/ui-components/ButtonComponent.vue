<script setup lang="ts">
import { computed } from 'vue'

export type ColorKey = 'neutral' | 'mustard' | 'pink'

export interface ButtonComponentProps {
  colorTheme?: ColorKey
  isDisabled?: boolean
  onClick?: () => void | Promise<void>
  isHidden?: boolean
  width?: string
  height?: string
}

interface ColorMap {
  bg: string
  hoverBg: string
  activeBg: string
  disabledBg: string
  disabledTextColor: string
  disabledBorderColor: string
}

//父傳子，沒有要寫 default 就不用 withDefaults
const props = withDefaults(defineProps<ButtonComponentProps>(), {
  colorTheme: 'mustard',
  isDisabled: false,
  width: 'auto',
  height: '48px',
})

//子傳父，payload 是 handleClick 的 event
const emit = defineEmits<{ (event: 'click', payload: MouseEvent): void }>()

const colorMap: Record<ColorKey, ColorMap> = {
  neutral: {
    bg: 'var(--color-neutral-300)',

    hoverBg: 'var(--color-neutral-100)',

    activeBg: 'var(--color-neutral-500)',

    disabledBg: 'var(--color-neutral-300)',
    disabledTextColor: 'var(--color-neutral-600)',
    disabledBorderColor: 'var(--color-neutral-600)',
  },
  mustard: {
    bg: 'var(--color-mustard-100)',

    hoverBg: 'var(--color-mustard-300)',

    activeBg: 'var(--color-mustard-500)',

    disabledBg: 'var(--color-mustard-300)',
    disabledTextColor: 'var(--color-mustard-500)',
    disabledBorderColor: 'var(--color-mustard-500)',
  },
  pink: {
    bg: 'var(--color-pink-300)',

    hoverBg: 'var(--color-pink-500)',

    activeBg: 'var(--color-pink-700)',

    disabledBg: 'var(--color-pink-500)',
    disabledTextColor: 'var(--color-pink-700)',
    disabledBorderColor: 'var(--color-pink-700)',
  },
}

const theme = computed(() => colorMap[props.colorTheme])

function handleClick(event: MouseEvent) {
  if (!props.isDisabled) {
    emit('click', event)
  }
}
</script>

<template>
  <button class="button" :disabled="isDisabled" @click="handleClick">
    <slot />
  </button>
</template>

<style scoped>
.button {
  width: v-bind(width);
  height: v-bind(height);
  padding: 10px 20px;

  color: var(--color-neutral-900);
  background-color: v-bind('theme.bg');
  border: 1px solid var(--color-neutral-900);
  border-radius: 12px;
  box-shadow: var(--shadow-2);

  cursor: pointer;

  display: v-bind(isHidden ? 'none': 'block');
}

.button:not(:disabled):hover {
  background-color: v-bind('theme.hoverBg');
}

.button:not(:disabled):active {
  background-color: v-bind('theme.activeBg');
  box-shadow: var(--shadow-1);
}

.button:disabled {
  background-color: v-bind('theme.disabledBg');
  color: v-bind('theme.disabledTextColor');
  border-color: v-bind('theme.disabledBorderColor');
  cursor: none;
  box-shadow: none;
}
</style>
