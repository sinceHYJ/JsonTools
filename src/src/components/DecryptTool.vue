<script setup lang="ts">
import { ref, computed } from 'vue'
import { decrypt, PRESET_KEYS } from '../crypto'

const ciphertext = ref('')
const selectedPreset = ref(PRESET_KEYS[0].value)
const useCustomKey = ref(false)
const customKey = ref('')
const result = ref('')
const error = ref('')
const isDecrypting = ref(false)

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

const currentKey = computed(() => useCustomKey.value ? customKey.value : selectedPreset.value)
const canDecrypt = computed(() => ciphertext.value.trim().length > 0 && currentKey.value.length > 0)

async function onDecrypt() {
  error.value = ''
  result.value = ''
  isDecrypting.value = true
  try {
    result.value = await decrypt(ciphertext.value, currentKey.value)
    showToast('解密成功')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '解密失败'
  } finally {
    isDecrypting.value = false
  }
}

async function copyResult() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value)
    showToast('已复制到剪贴板')
  } catch {
    showToast('复制失败')
  }
}

function onKeyModeChange(custom: boolean) {
  useCustomKey.value = custom
  if (!custom) {
    customKey.value = ''
  }
}
</script>

<template>
  <nav class="toolbar">
    <div class="toolbar-left">
      <span style="font-size: 12px; color: var(--text-secondary);">密钥:</span>
      <select
        v-if="!useCustomKey"
        class="ts-timezone-select"
        :value="selectedPreset"
        @change="selectedPreset = ($event.target as HTMLSelectElement).value"
      >
        <option v-for="k in PRESET_KEYS" :key="k.value" :value="k.value">
          {{ k.label }} ({{ k.value }})
        </option>
      </select>
      <input
        v-else
        class="decrypt-custom-key"
        :value="customKey"
        @input="customKey = ($event.target as HTMLInputElement).value"
        placeholder="输入自定义密钥"
        spellcheck="false"
      />
      <button
        class="tool-btn"
        :class="{ active: useCustomKey }"
        @click="onKeyModeChange(!useCustomKey)"
      >{{ useCustomKey ? '预设密钥' : '自定义' }}</button>
    </div>
  </nav>

  <div class="decrypt-content">
    <!-- 输入区 -->
    <div class="decrypt-section">
      <div class="decrypt-section-header">
        <span>密文</span>
        <span class="decrypt-hint">格式：[16字符IV] + [Base64密文]</span>
      </div>
      <textarea
        class="input-area decrypt-textarea"
        v-model="ciphertext"
        placeholder="粘贴完整密文（包含 16 字符 IV 前缀）"
        spellcheck="false"
      ></textarea>
    </div>

    <!-- 解密按钮 -->
    <div class="decrypt-action">
      <button
        class="decrypt-btn"
        :disabled="!canDecrypt || isDecrypting"
        @click="onDecrypt"
      >{{ isDecrypting ? '解密中...' : '解密' }}</button>
    </div>

    <!-- 输出区 -->
    <div class="decrypt-section">
      <div class="decrypt-section-header">
        <span>解密结果</span>
        <button v-if="result" class="small-btn" @click="copyResult">复制</button>
      </div>
      <textarea
        class="input-area decrypt-textarea"
        :value="result"
        readonly
        placeholder="解密结果将显示在这里"
      ></textarea>
      <div v-if="error" class="decrypt-error">{{ error }}</div>
    </div>
  </div>

  <div v-if="toastVisible" class="toast">{{ toastMsg }}</div>
</template>
