export type TimestampPrecision = 'seconds' | 'milliseconds' | 'nanoseconds'

export interface TimezoneOption {
  value: string
  label: string
  offset: string
}

export interface TimestampConvertResult {
  success: boolean
  formatted?: string
  iso?: string
  relative?: string
  date?: Date
  detectedPrecision?: TimestampPrecision
  error?: string
}

export interface DatetimeConvertResult {
  success: boolean
  seconds?: string
  milliseconds?: string
  nanoseconds?: string
  iso?: string
  error?: string
}

export interface CurrentTimestamps {
  seconds: number
  milliseconds: number
  nanoseconds: string
  formatted: string
  iso: string
}

/** 按字符串位数自动识别时间戳精度 */
export function detectPrecision(value: string): TimestampPrecision | null {
  const s = value.trim()
  if (!/^\d+$/.test(s)) return null
  const len = s.length
  if (len === 10) return 'seconds'
  if (len === 13) return 'milliseconds'
  if (len === 19) return 'nanoseconds'
  return null
}

/** 时间戳 → 日期时间 */
export function timestampToDatetime(
  timestamp: string,
  precision: TimestampPrecision | 'auto',
  timezone: string
): TimestampConvertResult {
  const trimmed = timestamp.trim()
  if (!trimmed) {
    return { success: false, error: '请输入时间戳' }
  }
  if (!/^\d+$/.test(trimmed)) {
    return { success: false, error: '无效的时间戳格式' }
  }

  let resolvedPrecision: TimestampPrecision = precision as TimestampPrecision
  if (precision === 'auto') {
    const detected = detectPrecision(trimmed)
    if (!detected) {
      return { success: false, error: '无法自动识别精度，请手动选择（10位=秒，13位=毫秒，19位=纳秒）' }
    }
    resolvedPrecision = detected
  }

  let ms: number
  if (resolvedPrecision === 'nanoseconds') {
    // 纳秒：取前13位作为毫秒（避免 Number 溢出）
    ms = parseInt(trimmed.slice(0, 13), 10)
  } else if (resolvedPrecision === 'seconds') {
    ms = parseInt(trimmed, 10) * 1000
  } else {
    ms = parseInt(trimmed, 10)
  }

  if (isNaN(ms)) {
    return { success: false, error: '无效的数字' }
  }

  const date = new Date(ms)
  if (isNaN(date.getTime())) {
    return { success: false, error: '无法解析为有效日期' }
  }

  const formatted = formatDateTime(date, timezone)
  const iso = date.toISOString()
  const relative = getRelativeTime(date)

  return {
    success: true,
    formatted,
    iso,
    relative,
    date,
    detectedPrecision: resolvedPrecision,
  }
}

/** 日期时间 → 时间戳 */
export function datetimeToTimestamp(
  datetimeStr: string,
  timezone: string
): DatetimeConvertResult {
  const trimmed = datetimeStr.trim()
  if (!trimmed) {
    return { success: false, error: '请输入日期时间' }
  }

  // 尝试多种格式解析
  const date = parseDatetime(trimmed, timezone)
  if (!date) {
    return { success: false, error: '无法解析日期时间，请使用格式如 2024-01-15 14:30:00' }
  }

  const ms = date.getTime()
  const seconds = String(Math.floor(ms / 1000))
  const milliseconds = String(ms)
  const nanoseconds = milliseconds + '000000'

  return {
    success: true,
    seconds,
    milliseconds,
    nanoseconds,
    iso: date.toISOString(),
  }
}

/** 获取当前时间快照 */
export function getCurrentTimestamps(timezone: string): CurrentTimestamps {
  const now = new Date()
  const ms = now.getTime()
  const seconds = Math.floor(ms / 1000)

  return {
    seconds,
    milliseconds: ms,
    nanoseconds: String(ms) + '000000',
    formatted: formatDateTime(now, timezone),
    iso: now.toISOString(),
  }
}

/** 获取用户本地时区 */
export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/** 常用时区列表 */
export const commonTimezones: TimezoneOption[] = [
  { value: 'UTC', label: 'UTC', offset: '+00:00' },
  { value: 'Asia/Shanghai', label: '上海', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: '东京', offset: '+09:00' },
  { value: 'Asia/Kolkata', label: '孟买', offset: '+05:30' },
  { value: 'Asia/Dubai', label: '迪拜', offset: '+04:00' },
  { value: 'Europe/London', label: '伦敦', offset: '+00:00' },
  { value: 'Europe/Berlin', label: '柏林', offset: '+01:00' },
  { value: 'Europe/Moscow', label: '莫斯科', offset: '+03:00' },
  { value: 'America/New_York', label: '纽约', offset: '-05:00' },
  { value: 'America/Chicago', label: '芝加哥', offset: '-06:00' },
  { value: 'America/Los_Angeles', label: '洛杉矶', offset: '-08:00' },
  { value: 'Australia/Sydney', label: '悉尼', offset: '+10:00' },
]

/** 相对时间描述 */
export function getRelativeTime(date: Date): string {
  const now = Date.now()
  const target = date.getTime()
  const diffMs = now - target
  const absDiff = Math.abs(diffMs)
  const isFuture = diffMs < 0

  const seconds = Math.floor(absDiff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  let text: string
  if (seconds < 60) {
    text = '刚刚'
  } else if (minutes < 60) {
    text = `${minutes} 分钟${isFuture ? '后' : '前'}`
  } else if (hours < 24) {
    text = `${hours} 小时${isFuture ? '后' : '前'}`
  } else if (days < 30) {
    text = `${days} 天${isFuture ? '后' : '前'}`
  } else if (months < 12) {
    text = `${months} 个月${isFuture ? '后' : '前'}`
  } else {
    text = `${years} 年${isFuture ? '后' : '前'}`
  }

  return text
}

// ── 内部辅助函数 ──

/** 格式化日期时间 */
function formatDateTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: timezone,
    hour12: false,
  }).format(date).replace(/\//g, '-')
}

/** 尝试解析多种日期时间格式 */
function parseDatetime(input: string, timezone: string): Date | null {
  // 格式: 2024-01-15 14:30:00 或 2024-01-15T14:30:00
  let match = input.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/)
  if (match) {
    const [, y, mo, d, h, mi, s] = match
    return createDateInTimezone(
      +y, +mo, +d, +h, +mi, +s, timezone
    )
  }

  // 格式: 2024-01-15 14:30
  match = input.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/)
  if (match) {
    const [, y, mo, d, h, mi] = match
    return createDateInTimezone(
      +y, +mo, +d, +h, +mi, 0, timezone
    )
  }

  // 格式: 2024-01-15
  match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    const [, y, mo, d] = match
    return createDateInTimezone(+y, +mo, +d, 0, 0, 0, timezone)
  }

  // Fallback: 让浏览器原生解析
  const date = new Date(input)
  return isNaN(date.getTime()) ? null : date
}

/** 在指定时区创建 Date 对象 */
function createDateInTimezone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: string
): Date | null {
  if (timezone === 'UTC') {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  }

  // 对于非 UTC 时区，通过格式化差值计算偏移
  // 先创建一个 UTC 时间，然后用 Intl 计算该时区的偏移
  try {
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(utcDate)
    const get = (type: string) => parts.find(p => p.type === type)?.value || ''
    const ny = +get('year')
    const nmo = +get('month')
    const nd = +get('day')
    const nh = +get('hour')
    const nmi = +get('minute')
    const ns = +get('second')

    // 目标时区中这个 UTC 时刻的本地时间
    // 我们需要找到"目标时区显示为 year-month-day hour:minute:second 的 UTC 时间"
    // 方法：用 UTC 构造 → 看时区偏移 → 反推
    const utcMs = Date.UTC(ny, nmo - 1, nd, nh, nmi, ns)
    // utcDate 的 UTC ms
    const diff = utcMs - utcDate.getTime()
    // offset: 时区相对于 UTC 的偏移 ms
    const offset = diff

    // 我们想要的是：在 timezone 中显示为 (year, month, day, hour, minute, second) 的时间
    // 即 UTC = 目标时区的本地时间 - offset
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - offset)
  } catch {
    return new Date(year, month - 1, day, hour, minute, second)
  }
}
