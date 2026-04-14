<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  timestampToDatetime,
  datetimeToTimestamp,
  getCurrentTimestamps,
  getLocalTimezone,
  commonTimezones,
  type TimestampPrecision,
  type TimestampConvertResult,
  type DatetimeConvertResult,
  type CurrentTimestamps,
} from '../timestamp'

type ConvertMode = 'ts2dt' | 'dt2ts'
type PrecisionOption = 'auto' | TimestampPrecision

const mode = ref<ConvertMode>('ts2dt')
const inputValue = ref('')
const precision = ref<PrecisionOption>('auto')
const timezone = ref(getLocalTimezone())
const tsResult = ref<TimestampConvertResult | null>(null)
const dtResult = ref<DatetimeConvertResult | null>(null)
const currentTime = ref<CurrentTimestamps | null>(null)
const statusText = ref('就绪')

// Toast
const toastVisible = ref(false)
const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string) {
  toastMsg.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, 2000)
}

// Debounce
let debounceTimer: ReturnType<typeof setTimeout> | null = null
function onInputChange() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(doConvert, 300)
}

function doConvert() {
  if (!inputValue.value.trim()) {
    tsResult.value = null
    dtResult.value = null
    statusText.value = '就绪'
    return
  }

  if (mode.value === 'ts2dt') {
    tsResult.value = timestampToDatetime(inputValue.value, precision.value, timezone.value)
    statusText.value = tsResult.value.success ? '转换成功' : (tsResult.value.error || '转换失败')
  } else {
    dtResult.value = datetimeToTimestamp(inputValue.value, timezone.value)
    statusText.value = dtResult.value.success ? '转换成功' : (dtResult.value.error || '转换失败')
  }
}

function onModeChange(newMode: ConvertMode) {
  mode.value = newMode
  inputValue.value = ''
  tsResult.value = null
  dtResult.value = null
  statusText.value = '就绪'
}

function onPrecisionChange() {
  doConvert()
}

function onTimezoneChange() {
  doConvert()
  currentTime.value = getCurrentTimestamps(timezone.value)
}

// 复制
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制到剪贴板')
  } catch {
    showToast('复制失败')
  }
}

// 当前时间自动刷新
let currentTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  currentTime.value = getCurrentTimestamps(timezone.value)
  currentTimer = setInterval(() => {
    currentTime.value = getCurrentTimestamps(timezone.value)
  }, 1000)
})

onUnmounted(() => {
  if (currentTimer) clearInterval(currentTimer)
  if (debounceTimer) clearTimeout(debounceTimer)
})

// 输入框 placeholder
const placeholder = computed(() => {
  return mode.value === 'ts2dt'
    ? '输入时间戳，如 1705305000 或 1705305000000'
    : '输入日期时间，如 2024-01-15 14:30:00'
})

// 当前时间区域显示
const currentDisplay = computed(() => {
  if (!currentTime.value) return null
  const c = currentTime.value
  return [
    { label: '秒', value: String(c.seconds) },
    { label: '毫秒', value: String(c.milliseconds) },
    { label: '纳秒', value: c.nanoseconds },
    { label: '格式化', value: c.formatted },
  ]
})
</script>

<template>
  <nav class="toolbar">
    <div class="toolbar-left">
      <button
        class="tool-btn"
        :class="{ active: mode === 'ts2dt' }"
        @click="onModeChange('ts2dt')"
      >时间戳 → 日期</button>
      <button
        class="tool-btn"
        :class="{ active: mode === 'dt2ts' }"
        @click="onModeChange('dt2ts')"
      >日期 → 时间戳</button>
      <div class="toolbar-divider"></div>
      <div class="indent-selector">
        <label for="ts-timezone">时区:</label>
        <select id="ts-timezone" class="ts-timezone-select" :value="timezone" @change="timezone = ($event.target as HTMLSelectElement).value; onTimezoneChange()">
          <option v-for="tz in commonTimezones" :key="tz.value" :value="tz.value">
            {{ tz.label }} ({{ tz.offset }})
          </option>
        </select>
      </div>
    </div>
  </nav>

  <div class="ts-content">
    <!-- 输入区 -->
    <input
      class="ts-input"
      :value="inputValue"
      @input="inputValue = ($event.target as HTMLInputElement).value; onInputChange()"
      :placeholder="placeholder"
      spellcheck="false"
      autofocus
    />

    <!-- 精度选择（仅 ts→dt 模式） -->
    <div v-if="mode === 'ts2dt'" class="ts-precision-group">
      <span style="font-size: 12px; color: var(--text-secondary); line-height: 28px;">精度:</span>
      <button
        v-for="opt in ([
          { value: 'auto', label: '自动' },
          { value: 'seconds', label: '秒 (10位)' },
          { value: 'milliseconds', label: '毫秒 (13位)' },
          { value: 'nanoseconds', label: '纳秒 (19位)' },
        ] as const)"
        :key="opt.value"
        class="tool-btn"
        :class="{ active: precision === opt.value }"
        @click="precision = opt.value; onPrecisionChange()"
      >{{ opt.label }}</button>
    </div>

    <!-- 转换结果 -->
    <template v-if="mode === 'ts2dt' && tsResult">
      <div v-if="tsResult.success" class="ts-result-card">
        <div class="ts-result-row">
          <span class="ts-result-label">格式化时间</span>
          <span class="ts-result-value">{{ tsResult.formatted }}</span>
        </div>
        <div class="ts-result-row">
          <span class="ts-result-label">ISO 8601</span>
          <span class="ts-result-value">{{ tsResult.iso }}</span>
          <button class="small-btn" @click="copyText(tsResult.iso!)">复制</button>
        </div>
        <div class="ts-result-row">
          <span class="ts-result-label">相对时间</span>
          <span class="ts-result-value">{{ tsResult.relative }}</span>
        </div>
      </div>
      <div v-else class="ts-error">{{ tsResult.error }}</div>
    </template>

    <template v-if="mode === 'dt2ts' && dtResult">
      <div v-if="dtResult.success" class="ts-result-card">
        <div class="ts-result-row">
          <span class="ts-result-label">秒</span>
          <span class="ts-result-value">{{ dtResult.seconds }}</span>
          <button class="small-btn" @click="copyText(dtResult.seconds!)">复制</button>
        </div>
        <div class="ts-result-row">
          <span class="ts-result-label">毫秒</span>
          <span class="ts-result-value">{{ dtResult.milliseconds }}</span>
          <button class="small-btn" @click="copyText(dtResult.milliseconds!)">复制</button>
        </div>
        <div class="ts-result-row">
          <span class="ts-result-label">纳秒</span>
          <span class="ts-result-value">{{ dtResult.nanoseconds }}</span>
          <button class="small-btn" @click="copyText(dtResult.nanoseconds!)">复制</button>
        </div>
        <div class="ts-result-row">
          <span class="ts-result-label">ISO 8601</span>
          <span class="ts-result-value">{{ dtResult.iso }}</span>
          <button class="small-btn" @click="copyText(dtResult.iso!)">复制</button>
        </div>
      </div>
      <div v-else class="ts-error">{{ dtResult.error }}</div>
    </template>

    <!-- 当前时间 -->
    <div v-if="currentDisplay" class="ts-current-time">
      <div class="ts-section-title">当前时间</div>
      <div class="ts-result-card">
        <div v-for="row in currentDisplay" :key="row.label" class="ts-result-row">
          <span class="ts-result-label">{{ row.label }}</span>
          <span class="ts-result-value">{{ row.value }}</span>
          <button class="small-btn" @click="copyText(row.value)">复制</button>
        </div>
      </div>
    </div>
  </div>

  <footer class="status-bar">
    <div class="status-left">
      <span>当前时区: {{ timezone }}</span>
    </div>
    <div class="status-right">
      <span>{{ statusText }}</span>
    </div>
  </footer>

  <div v-if="toastVisible" class="toast">{{ toastMsg }}</div>
</template>
