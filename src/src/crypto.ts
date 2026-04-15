export interface PresetKey {
  label: string
  value: string
}

export const PRESET_KEYS: PresetKey[] = [
  { label: 'member', value: 'member24K8manger' },
  { label: 'webpay', value: 'webpay24K8manger' },
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
      { name: 'AES-CBC', iv: ivBytes as Uint8Array<ArrayBuffer> },
      cryptoKey,
      cipherBytes as Uint8Array<ArrayBuffer>,
    )
  } catch {
    throw new Error('解密失败，请检查密钥和密文是否匹配')
  }

  return new TextDecoder().decode(decrypted)
}
