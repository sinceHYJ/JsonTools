<script setup lang="ts">
import { inject, ref, computed, watch, type Ref } from 'vue'

defineOptions({ name: 'JsonTreeNode' })

const props = withDefaults(defineProps<{
  data: unknown
  keyName?: string
  depth?: number
  isLast?: boolean
  path?: string
}>(), {
  keyName: '',
  depth: 0,
  isLast: true,
  path: '',
})

const collapsedPaths: Ref<Set<string>> | undefined = inject('collapsedPaths')
const collapseAllToken: Ref<number> | undefined = inject('collapseAllToken')
const expandAllToken: Ref<number> | undefined = inject('expandAllToken')

// 本节点路径
const nodePath = computed(() => props.path)

// 监听全局折叠/展开指令
if (collapseAllToken) {
  const prevToken = ref(collapseAllToken.value)
  watch(collapseAllToken, () => {
    if (collapseAllToken.value !== prevToken.value) {
      prevToken.value = collapseAllToken.value
      collectCollapsiblePaths(props.data, nodePath.value, collapsedPaths!.value)
    }
  })
}

if (expandAllToken) {
  const prevToken = ref(expandAllToken.value)
  watch(expandAllToken, () => {
    if (expandAllToken.value !== prevToken.value) {
      prevToken.value = expandAllToken.value
      collapsedPaths!.value.clear()
    }
  })
}

function collectCollapsiblePaths(data: unknown, basePath: string, set: Set<string>) {
  if (data !== null && typeof data === 'object') {
    set.add(basePath)
    const entries = Array.isArray(data) ? data.map((v, i) => [i, v] as const) : Object.entries(data)
    for (const [k, v] of entries) {
      collectCollapsiblePaths(v, `${basePath}/${k}`, set)
    }
  }
}

function toggle() {
  if (!collapsedPaths) return
  const s = collapsedPaths.value
  if (s.has(nodePath.value)) {
    s.delete(nodePath.value)
  } else {
    s.add(nodePath.value)
  }
}

const isCollapsed = computed(() => collapsedPaths?.value.has(nodePath.value) ?? false)

const isObject = computed(() => props.data !== null && typeof props.data === 'object')
const isArray = computed(() => Array.isArray(props.data))

const entries = computed(() => {
  if (!isObject.value) return []
  const src = props.data as Record<string, unknown> | unknown[]
  if (isArray.value) {
    return (src as unknown[]).map((v, i) => ({ key: String(i), value: v }))
  }
  return Object.entries(src as Record<string, unknown>).map(([k, v]) => ({ key: k, value: v }))
})

const collapsedPreview = computed(() => {
  if (isArray.value) {
    return `[${entries.value.length} items]`
  }
  return `{${entries.value.length} keys}`
})

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const leafValueHtml = computed(() => {
  const d = props.data
  let cls = ''
  let display = ''
  if (d === null) {
    cls = 'json-null'
    display = 'null'
  } else if (typeof d === 'boolean') {
    cls = 'json-boolean'
    display = String(d)
  } else if (typeof d === 'number') {
    cls = 'json-number'
    display = String(d)
  } else if (typeof d === 'string') {
    cls = 'json-string'
    display = `"${escapeHtml(d)}"`
  }
  return cls ? `<span class="${cls}">${display}</span>` : escapeHtml(String(d))
})

const indentPx = 20
</script>

<template>
  <div class="json-node" :style="{ paddingLeft: depth * indentPx + 'px' }">
    <!-- 对象/数组节点 -->
    <div v-if="isObject" class="json-node-row">
      <span class="json-toggle" @click="toggle">
        <svg v-if="isCollapsed" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M6 3l5 5-5 5z"/>
        </svg>
        <svg v-else viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M3 6l5 5 5-5z"/>
        </svg>
      </span>
      <span v-if="keyName" class="json-key">"{{ escapeHtml(keyName) }}"</span>
      <span v-if="keyName" class="json-colon">: </span>
      <span v-if="isCollapsed" class="json-bracket">{{ isArray ? '[' : '{' }}</span>
      <span v-if="isCollapsed" class="json-collapsed-preview">{{ collapsedPreview }}</span>
      <span v-if="isCollapsed" class="json-bracket">{{ isArray ? ']' : '}' }}</span>
      <span v-if="!isCollapsed" class="json-bracket">{{ isArray ? '[' : '{' }}</span>
      <span v-if="!isCollapsed && !isLast" class="json-comma">,</span>
    </div>

    <!-- 子节点（展开时渲染） -->
    <template v-if="isObject && !isCollapsed">
      <JsonTreeNode
        v-for="(entry, index) in entries"
        :key="entry.key"
        :data="entry.value"
        :key-name="isArray ? undefined : entry.key"
        :depth="depth + 1"
        :is-last="index === entries.length - 1"
        :path="`${nodePath}/${entry.key}`"
      />
      <div class="json-node-row json-closing-bracket">
        <span class="json-bracket">{{ isArray ? ']' : '}' }}</span>
        <span v-if="!isLast" class="json-comma">,</span>
      </div>
    </template>

    <!-- 叶子节点 -->
    <div v-else-if="!isObject" class="json-node-row">
      <span v-if="keyName" class="json-key">"{{ escapeHtml(keyName) }}"</span>
      <span v-if="keyName" class="json-colon">: </span>
      <span class="json-leaf" v-html="leafValueHtml"></span>
      <span v-if="!isLast" class="json-comma">,</span>
    </div>
  </div>
</template>
