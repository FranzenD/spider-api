<template>
  <div v-if="visible" class="dismissible-message">
    <span :role="role">{{ text }}</span>
    <CountdownDismissButton
      :duration-ms="durationMs ?? null"
      :reset-key="animationKey"
      :label="dismissLabel"
      @dismiss="dismiss"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import CountdownDismissButton from './CountdownDismissButton.vue'

const props = withDefaults(defineProps<{
  text: string
  role?: 'status' | 'alert'
  durationMs?: number
  resetKey?: number | string
  dismissLabel?: string
}>(), {
  role: 'status',
  dismissLabel: 'Stäng meddelandet',
})

const emit = defineEmits<{ dismiss: [] }>()
const visible = ref(true)
const animationKey = ref(0)
let timer: ReturnType<typeof setTimeout> | undefined

const dismiss = () => {
  clearTimeout(timer)
  visible.value = false
  emit('dismiss')
}

watch(
  () => [props.text, props.resetKey, props.durationMs] as const,
  (_message, _previous, onCleanup) => {
    visible.value = true
    animationKey.value += 1
    if (props.durationMs === undefined || typeof window === 'undefined') return

    timer = setTimeout(dismiss, props.durationMs)
    onCleanup(() => clearTimeout(timer))
  },
  { immediate: true }
)
</script>

<style scoped>
.dismissible-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dismissible-message > span {
  flex: 1;
  min-width: 0;
}
</style>
