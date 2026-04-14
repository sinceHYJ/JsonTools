export interface ToolDef {
  id: string
  label: string
}

export const tools: ToolDef[] = [
  { id: 'json', label: 'JSON' },
  { id: 'timestamp', label: '时间戳' },
  { id: 'decrypt', label: '解密' },
]
