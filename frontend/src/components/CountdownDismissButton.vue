<template>
  <button type="button" class="dismiss-button" :aria-label="label" @click="$emit('dismiss')">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle v-if="durationMs !== null" class="track" cx="12" cy="12" r="10" />
      <circle
        v-if="durationMs !== null"
        :key="resetKey"
        class="progress-ring"
        cx="12"
        cy="12"
        r="10"
        pathLength="100"
        transform="rotate(-90 12 12)"
        :style="{ animationDuration: `${durationMs}ms` }"
      />
      <g stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="8" y1="8" x2="16" y2="16" />
        <line x1="16" y1="8" x2="8" y2="16" />
      </g>
    </svg>
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  durationMs?: number | null
  label: string
  resetKey: number
}>(), {
  durationMs: 5000,
})

defineEmits<{
  dismiss: []
}>()
</script>

<style scoped>
.dismiss-button {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.dismiss-button:hover,
.dismiss-button:focus-visible {
  box-shadow: inset 0 0 0 1px currentColor;
}

svg {
  width: 24px;
  height: 24px;
}

circle {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.track {
  opacity: 0.2;
}

.progress-ring {
  stroke-dasharray: 100;
  animation: countdown linear forwards;
}

@keyframes countdown {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: 100; }
}

@media (prefers-reduced-motion: reduce) {
  .progress-ring {
    animation-timing-function: steps(5, end);
  }
}
</style>
