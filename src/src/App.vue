<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { tools } from './types'
import JsonEditor from './components/JsonEditor.vue'
import TimestampConverter from './components/TimestampConverter.vue'
import DecryptTool from './components/DecryptTool.vue'

const activeTool = ref('json')
const isDark = ref(false)

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  isDark.value = mq.matches
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
})
</script>

<template>
  <div class="header">
    <div class="header-left">
      <span class="logo">{ }</span>
      <span class="app-title">JSON Tools</span>
      <nav class="tool-tabs">
        <button
          v-for="tool in tools"
          :key="tool.id"
          class="tool-tab"
          :class="{ active: activeTool === tool.id }"
          @click="activeTool = tool.id"
        >{{ tool.label }}</button>
      </nav>
    </div>
    <div class="header-right">
      <button class="icon-btn" @click="toggleTheme" title="切换主题">
        <svg v-if="isDark" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
    </div>
  </div>

  <JsonEditor v-if="activeTool === 'json'" />
  <TimestampConverter v-else-if="activeTool === 'timestamp'" />
  <DecryptTool v-else-if="activeTool === 'decrypt'" />
</template>
