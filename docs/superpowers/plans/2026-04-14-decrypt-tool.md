# 解密工具实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 JSON Tools 新增 AES-128-CBC 解密功能，支持预置密钥和自定义密钥。

**Architecture:** 纯前端实现，使用浏览器原生 Web Crypto API。新增 `crypto.ts` 封装解密逻辑，新增 `DecryptTool.vue` 作为 UI 组件，遵循现有 `json.ts` + `JsonEditor.vue` 的模块分离模式。

**Tech Stack:** TypeScript, Web Crypto API (`crypto.subtle`), Vue 3 Composition API

---

### Task 1: 创建解密逻辑模块 `crypto.ts`

**Files:**
- Create: `src/src/crypto.ts`

- [ ] **Step 1: 创建 `src/src/crypto.ts`**

```ts
export interface PresetKey {
  label: string
  value: string
}

export const PRESET_KEYS: PresetKey[] = [
  { label: 'webpay', value: 'webpay24K8manger' },
  { label: 'member', value: 'member24K8manger' },
]

export async function decrypt(ciphertext: string, key: string): Promise<string> {
  if (!ciphertext.trim()) {
    throw new Error('密文不能为空')
  }

  if (ciphertext.length < 17) {
    throw new Error('密文长度不足，至少需要 17 个字符（16 字符 IV + 密文）')
  }

  const keyBytes = new TextEncoder().encode(key)
  if (keyBytes.length !== 16 && keyBytes.length !== 24 && keyBytes.length !== 32) {
    throw new Error(`密钥长度无效（当前 ${keyBytes.length} 字节），需要 16、24 或 32 字节`)
  }

  const iv = ciphertext.slice(0, 16)
  const encoded = ciphertext.slice(16)

  let cipherBytes: Uint8Array
  try {
    const binary = atob(encoded)
    cipherBytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      cipherBytes[i] = binary.charCodeAt(i)
    }
  } catch {
    throw new Error('密文格式无效，Base64 解码失败')
  }

  const ivBytes = new TextEncoder().encode(iv)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['decrypt'],
  )

  let decrypted: ArrayBuffer
  try {
    decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: ivBytes },
      cryptoKey,
      cipherBytes,
    )
  } catch {
    throw new Error('解密失败，请检查密钥和密文是否匹配')
  }

  return new TextDecoder().decode(decrypted)
}
```

- [ ] **Step 2: 验证文件创建成功**

Run: `ls -la src/src/crypto.ts`
Expected: 文件存在

- [ ] **Step 3: Commit**

```bash
git add src/src/crypto.ts
git commit -m "feat: add AES-CBC decryption module (crypto.ts)"
```

---

### Task 2: 注册解密工具到工具列表

**Files:**
- Modify: `src/src/types.ts`

- [ ] **Step 1: 在 `types.ts` 的 tools 数组中添加解密工具**

将 `src/src/types.ts` 修改为：

```ts
export interface ToolDef {
  id: string
  label: string
}

export const tools: ToolDef[] = [
  { id: 'json', label: 'JSON' },
  { id: 'timestamp', label: '时间戳' },
  { id: 'decrypt', label: '解密' },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/src/types.ts
git commit -m "feat: register decrypt tool in tool list"
```

---

### Task 3: 创建解密工具 UI 组件 `DecryptTool.vue`

**Files:**
- Create: `src/src/components/DecryptTool.vue`

- [ ] **Step 1: 创建 `src/src/components/DecryptTool.vue`**

```vue
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
```

- [ ] **Step 2: 添加组件样式到 `src/src/style.css`**

在 `src/src/style.css` 文件末尾追加以下样式：

```css
/* Decrypt tool */
.decrypt-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px 24px;
  gap: 12px;
}

.decrypt-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.decrypt-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.decrypt-hint {
  font-weight: 400;
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
}

.decrypt-textarea {
  height: 140px;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px 16px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.6;
  background: var(--panel-bg);
  color: var(--text);
  outline: none;
  resize: vertical;
  transition: border-color 0.15s;
}

.decrypt-textarea:focus {
  border-color: var(--accent);
}

.decrypt-textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

.decrypt-custom-key {
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  color: var(--text);
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 12px;
  outline: none;
  width: 200px;
}

.decrypt-custom-key:focus {
  border-color: var(--accent);
}

.decrypt-action {
  display: flex;
  justify-content: center;
}

.decrypt-btn {
  padding: 8px 32px;
  border: none;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.decrypt-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.decrypt-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.decrypt-error {
  color: var(--error);
  font-size: 13px;
  padding: 4px 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/src/components/DecryptTool.vue src/src/style.css
git commit -m "feat: add DecryptTool component with UI and styles"
```

---

### Task 4: 集成 DecryptTool 到 App.vue

**Files:**
- Modify: `src/src/App.vue`

- [ ] **Step 1: 在 `App.vue` 中导入并渲染 DecryptTool**

将 `src/src/App.vue` 的 `<script setup>` 部分修改为：

```vue
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
```

将 `<template>` 部分修改为（在 `v-else-if="activeTool === 'timestamp'"` 之后添加解密工具的条件渲染）：

```vue
  <JsonEditor v-if="activeTool === 'json'" />
  <TimestampConverter v-else-if="activeTool === 'timestamp'" />
  <DecryptTool v-else-if="activeTool === 'decrypt'" />
```

- [ ] **Step 2: Commit**

```bash
git add src/src/App.vue
git commit -m "feat: integrate DecryptTool into app navigation"
```

---

### Task 5: 端到端验证

- [ ] **Step 1: 启动开发服务器**

Run: `npm run dev`
Expected: Vite dev server 启动在 `http://localhost:5173`，Tauri 窗口打开

- [ ] **Step 2: 验证工具标签页**

1. 点击顶部标签栏，确认出现 "解密" 标签
2. 点击 "解密" 标签，确认显示解密工具界面
3. 确认上下布局：上方密文输入区 + 解密按钮 + 下方结果区
4. 确认密钥下拉框显示 "webpay" 和 "member" 两个选项
5. 确认 "自定义" 按钮可切换到自定义密钥输入框

- [ ] **Step 3: 验证解密功能**

1. 密文输入框为空时，确认 "解密" 按钮置灰
2. 输入一个有效的加密字符串（从 member-decrypt 项目的 `encrypt` 文件复制），选择对应密钥
3. 点击 "解密"，确认解密成功并显示明文结果
4. 确认显示 toast "解密成功"
5. 点击 "复制" 按钮，确认显示 toast "已复制到剪贴板"

- [ ] **Step 4: 验证错误处理**

1. 输入短于 17 字符的密文并点击解密，确认显示 "密文长度不足" 错误
2. 输入无效 Base64 字符并点击解密，确认显示 "密文格式无效" 错误
3. 使用错误的密钥解密有效密文，确认显示 "解密失败" 错误

- [ ] **Step 5: 验证主题切换**

1. 切换到暗色主题，确认解密工具的样式正确适配
2. 切换回亮色主题，确认样式正常
