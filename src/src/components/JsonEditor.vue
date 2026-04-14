<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import {
  formatJson,
  minifyJson,
  escapeJson,
  unescapeJson,
  byteSize,
  formatSize,
  highlightJson,
  type JsonResult,
} from '../json'
import JsonTreeNode from './JsonTreeNode.vue'

type Action = 'format' | 'minify' | 'escape' | 'unescape'

const inputText = ref('')
const outputHtml = ref('')
const outputText = ref('')
const currentAction = ref<Action>('format')
const indentSize = ref<string>('2')
const statusClass = ref('status-idle')
const statusText = ref('就绪')
const outputInfo = ref('')
const isDragging = ref(false)

// 树形视图状态
const parsedData = ref<unknown>(null)
const collapsedPaths = ref(new Set<string>())
const collapseAllToken = ref(0)
const expandAllToken = ref(0)
provide('collapsedPaths', collapsedPaths)
provide('collapseAllToken', collapseAllToken)
provide('expandAllToken', expandAllToken)

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

// 状态栏信息
const stats = computed(() => {
  const s = inputText.value
  const chars = s.length
  const bytes = byteSize(s)
  const lines = s ? s.split('\n').length : 0
  return {
    chars,
    size: formatSize(bytes),
    lines,
  }
})

// 执行操作
function execute(action: Action) {
  currentAction.value = action
  let result: JsonResult

  switch (action) {
    case 'format':
      result = formatJson(inputText.value, indentSize.value)
      break
    case 'minify':
      result = minifyJson(inputText.value)
      break
    case 'escape':
      result = escapeJson(inputText.value)
      break
    case 'unescape':
      result = unescapeJson(inputText.value)
      break
  }

  if (result.success) {
    outputText.value = result.data
    outputHtml.value = highlightJson(result.data)
    statusClass.value = 'status-valid'
    statusText.value = '合法 JSON'

    // 计算输出信息
    const inSize = formatSize(byteSize(inputText.value))
    const outSize = formatSize(byteSize(result.data))
    outputInfo.value = `${inSize} → ${outSize}`

    // format 模式下存储解析结果用于树形渲染
    if (action === 'format') {
      parsedData.value = JSON.parse(result.data)
      collapsedPaths.value.clear()
    } else {
      parsedData.value = null
    }
  } else {
    outputText.value = ''
    outputHtml.value = `<span class="error">${escapeForHtml(result.error || '未知错误')}</span>`
    statusClass.value = 'status-invalid'
    statusText.value = '非法 JSON'
    outputInfo.value = ''
    parsedData.value = null
  }
}

function escapeForHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 复制结果
async function copyOutput() {
  if (!outputText.value) return
  try {
    await navigator.clipboard.writeText(outputText.value)
    showToast('已复制到剪贴板')
  } catch {
    showToast('复制失败')
  }
}

// 从剪贴板粘贴
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    inputText.value = text
    showToast('已从剪贴板粘贴')
  } catch {
    showToast('粘贴失败')
  }
}

// 清空
function clearAll() {
  inputText.value = ''
  outputText.value = ''
  outputHtml.value = ''
  statusClass.value = 'status-idle'
  statusText.value = '就绪'
  outputInfo.value = ''
  parsedData.value = null
  collapsedPaths.value.clear()
}

// 全部展开/折叠
function collapseAll() {
  collapseAllToken.value++
}

function expandAll() {
  expandAllToken.value++
}

// 拖拽文件导入
function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      inputText.value = reader.result as string
      showToast(`已导入: ${file.name}`)
    }
    reader.readAsText(file)
  }
}

// 键盘快捷键
function handleKeydown(e: KeyboardEvent) {
  const ctrl = e.ctrlKey || e.metaKey
  if (ctrl && e.key === 'Enter') {
    e.preventDefault()
    execute('format')
  } else if (ctrl && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
    e.preventDefault()
    execute('minify')
  } else if (ctrl && e.shiftKey && (e.key === 'e' || e.key === 'E')) {
    e.preventDefault()
    execute('escape')
  } else if (ctrl && e.shiftKey && (e.key === 'u' || e.key === 'U')) {
    e.preventDefault()
    execute('unescape')
  } else if (ctrl && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
    e.preventDefault()
    copyOutput()
  }
}

// 面板拖拽调整宽度
const inputPanel = ref<HTMLElement | null>(null)
const outputPanel = ref<HTMLElement | null>(null)
const resizer = ref<HTMLElement | null>(null)
let isResizing = false

function onResizerMouseDown(e: MouseEvent) {
  e.preventDefault()
  isResizing = true
  resizer.value?.classList.add('dragging')
  document.addEventListener('mousemove', onResizerMouseMove)
  document.addEventListener('mouseup', onResizerMouseUp)
}

function onResizerMouseMove(e: MouseEvent) {
  if (!isResizing) return
  const container = document.querySelector('.main-content') as HTMLElement
  if (!container) return
  const rect = container.getBoundingClientRect()
  const ratio = ((e.clientX - rect.left) / rect.width) * 100
  const clamped = Math.min(Math.max(ratio, 20), 80)
  if (inputPanel.value) inputPanel.value.style.flex = `0 0 ${clamped}%`
  if (outputPanel.value) outputPanel.value.style.flex = `0 0 ${100 - clamped}%`
}

function onResizerMouseUp() {
  isResizing = false
  resizer.value?.classList.remove('dragging')
  document.removeEventListener('mousemove', onResizerMouseMove)
  document.removeEventListener('mouseup', onResizerMouseUp)
}

// 跟随系统主题
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <nav class="toolbar">
    <div class="toolbar-left">
      <button
        class="tool-btn"
        :class="{ active: currentAction === 'format' }"
        @click="execute('format')"
        title="格式化 (Ctrl+Enter)"
      >格式化</button>
      <button
        class="tool-btn"
        :class="{ active: currentAction === 'minify' }"
        @click="execute('minify')"
        title="压缩 (Ctrl+Shift+M)"
      >压缩</button>
      <div class="toolbar-divider"></div>
      <button
        class="tool-btn"
        :class="{ active: currentAction === 'escape' }"
        @click="execute('escape')"
        title="转义 (Ctrl+Shift+E)"
      >转义</button>
      <button
        class="tool-btn"
        :class="{ active: currentAction === 'unescape' }"
        @click="execute('unescape')"
        title="去除转义 (Ctrl+Shift+U)"
      >去转义</button>
      <div class="toolbar-divider"></div>
      <div class="indent-selector">
        <label for="indent-size">缩进:</label>
        <select id="indent-size" v-model="indentSize">
          <option value="2">2 空格</option>
          <option value="4">4 空格</option>
          <option value="tab">Tab</option>
        </select>
      </div>
    </div>
    <div class="toolbar-right">
      <button class="tool-btn" @click="copyOutput" title="复制结果 (Ctrl+Shift+C)">复制结果</button>
      <button class="tool-btn" @click="clearAll" title="清空">清空</button>
    </div>
  </nav>

  <main
    class="main-content"
    :class="{ 'drag-over': isDragging }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div ref="inputPanel" class="panel input-panel">
      <div class="panel-header">
        <span>输入</span>
        <button class="small-btn" @click="pasteFromClipboard">粘贴</button>
      </div>
      <textarea
        class="input-area"
        v-model="inputText"
        placeholder="在此输入或粘贴 JSON 字符串...&#10;&#10;支持拖拽 .json 文件导入"
        spellcheck="false"
      ></textarea>
    </div>

    <div
      ref="resizer"
      class="panel-resizer"
      @mousedown="onResizerMouseDown"
    ></div>

    <div ref="outputPanel" class="panel output-panel">
      <div class="panel-header">
        <span>输出</span>
        <div class="output-header-actions">
          <template v-if="parsedData !== null">
            <button class="small-btn" @click="expandAll" title="全部展开">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M3 6l5 5 5-5z"/></svg>
              展开
            </button>
            <button class="small-btn" @click="collapseAll" title="全部折叠">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M6 3l5 5-5 5z"/></svg>
              折叠
            </button>
          </template>
          <span class="output-info">{{ outputInfo }}</span>
        </div>
      </div>
      <div class="output-area">
        <JsonTreeNode
          v-if="parsedData !== null"
          :data="parsedData"
          :depth="0"
          :is-last="true"
          path="/"
        />
        <pre v-else><code v-html="outputHtml"></code></pre>
      </div>
    </div>
  </main>

  <footer class="status-bar">
    <div class="status-left">
      <span>字符: {{ stats.chars }}</span>
      <span class="status-divider">|</span>
      <span>大小: {{ stats.size }}</span>
      <span class="status-divider">|</span>
      <span>行数: {{ stats.lines }}</span>
    </div>
    <div class="status-right">
      <span :class="statusClass">{{ statusText }}</span>
    </div>
  </footer>

  <!-- Toast -->
  <div v-if="toastVisible" class="toast">{{ toastMsg }}</div>
</template>
