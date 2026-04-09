export type IndentSize = 2 | 4 | 'tab'

export interface JsonResult {
  success: boolean
  data: string
  error?: string
}

/** JSON 格式化 */
export function formatJson(input: string, indent: string): JsonResult {
  if (!input.trim()) {
    return { success: false, data: '', error: '输入为空' }
  }
  try {
    const obj = JSON.parse(input)
    const space = indent === 'tab' ? '\t' : Number(indent)
    const data = JSON.stringify(obj, null, space)
    return { success: true, data }
  } catch (e) {
    return { success: false, data: '', error: (e as Error).message }
  }
}

/** JSON 压缩 */
export function minifyJson(input: string): JsonResult {
  if (!input.trim()) {
    return { success: false, data: '', error: '输入为空' }
  }
  try {
    const obj = JSON.parse(input)
    const data = JSON.stringify(obj)
    return { success: true, data }
  } catch (e) {
    return { success: false, data: '', error: (e as Error).message }
  }
}

/** JSON 转义 */
export function escapeJson(input: string): JsonResult {
  if (!input.trim()) {
    return { success: false, data: '', error: '输入为空' }
  }
  try {
    // 先校验是否为合法 JSON
    JSON.parse(input)
    const data = JSON.stringify(input)
    return { success: true, data }
  } catch (e) {
    return { success: false, data: '', error: `不是合法的 JSON: ${(e as Error).message}` }
  }
}

/** 去除 JSON 转义 */
export function unescapeJson(input: string): JsonResult {
  if (!input.trim()) {
    return { success: false, data: '', error: '输入为空' }
  }
  try {
    // 尝试解析为已转义的字符串
    const str = input.trim()
    let data: string
    try {
      data = JSON.parse(str)
    } catch {
      // 如果直接 parse 失败，尝试手动去除一层转义
      data = str
        .replace(/^["']/, '')
        .replace(/["']$/, '')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    }

    // 校验结果是否为合法 JSON
    if (typeof data === 'string') {
      try {
        JSON.parse(data)
      } catch {
        return { success: false, data, error: `去除转义后不是合法的 JSON` }
      }
    }

    return { success: true, data: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }
  } catch (e) {
    return { success: false, data: '', error: (e as Error).message }
  }
}

/** 计算 byte 大小 */
export function byteSize(str: string): number {
  return new Blob([str]).size
}

/** 格式化文件大小 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

/** 简单的 JSON 语法高亮 */
export function highlightJson(json: string): string {
  return json.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number'
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string'
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean'
      } else if (/null/.test(match)) {
        cls = 'json-null'
      }
      return `<span class="${cls}">${escapeHtml(match)}</span>`
    }
  )
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
