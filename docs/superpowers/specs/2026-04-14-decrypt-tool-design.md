# 解密工具设计文档

## 概述

为 JSON Tools 新增 AES 解密功能，采用浏览器原生 Web Crypto API 实现，与现有项目架构保持一致（纯前端逻辑，零 Tauri 命令）。

## 功能范围

- 仅解密，不做加密
- 算法：AES-128-CBC，PKCS7 填充
- 密文格式：`[16字符明文IV] + [Base64编码密文]`，自动识别 IV 前缀

## 技术方案

**方案 A: Web Crypto API（已选定）**

使用 `crypto.subtle.decrypt` 原生 API，零依赖。

## 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/src/crypto.ts` | 新增 | AES-CBC 解密逻辑 |
| `src/src/components/DecryptTool.vue` | 新增 | 解密工具 UI 组件 |
| `src/src/types.ts` | 修改 | tools 数组添加解密工具定义 |
| `src/src/App.vue` | 修改 | 集成 DecryptTool 组件 |

## 解密逻辑 (`crypto.ts`)

### 核心函数

```ts
decrypt(ciphertext: string, key: string): Promise<string>
```

### 预置密钥

```ts
const PRESET_KEYS = [
  { label: 'webpay', value: 'webpay24K8manger' },
  { label: 'member', value: 'member24K8manger' },
]
```

### 处理流程

1. 校验输入长度 >= 17（16 字符 IV + 至少 1 字符密文）
2. 提取 IV = `ciphertext.slice(0, 16)`
3. 密文部分 = `ciphertext.slice(16)`
4. Base64 解码密文部分
5. 调用 `crypto.subtle.decrypt({ name: 'AES-CBC', iv: ivBytes }, keyBytes, ciphertextBytes)`
6. 将解密结果转为 UTF-8 字符串返回

### 错误处理

- 输入为空 / 长度不足：提示"密文长度不足"
- Base64 解码失败：提示"密文格式无效"
- 密钥长度不合法（非 16/24/32 字节）：提示"密钥长度无效"
- 解密失败：提示"解密失败，请检查密钥和密文"

## UI 组件 (`DecryptTool.vue`)

### 布局：上下结构

**上半部分 — 输入区：**
- 密文输入框（textarea），用于粘贴完整密文
- 密钥选择：下拉框选择预置密钥（webpay / member），或切换为自定义输入模式
- "解密"按钮

**下半部分 — 输出区：**
- 解密结果展示框（textarea，只读）
- "复制"按钮
- 错误时在结果区显示红色错误信息

### 交互行为

- 点击"解密"按钮触发解密（异步）
- 密文为空时按钮置灰
- 解密成功显示 toast"解密成功"
- 解密失败在结果区显示错误信息

### 集成方式

- `types.ts` 添加 `{ id: 'decrypt', label: '解密' }`
- `App.vue` 添加 `v-else-if="activeTool === 'decrypt'"` 渲染 DecryptTool

## 与 Go 代码的对应关系

| Go (member-decrypt) | TypeScript (crypto.ts) |
|---------------------|----------------------|
| `data[:16]` 提取 IV | `ciphertext.slice(0, 16)` |
| `data[16:]` 提取密文 | `ciphertext.slice(16)` |
| `base64.StdEncoding.DecodeString` | `atob()` |
| `aes.NewCipher(k)` + `cipher.NewCBCDecrypter` | `crypto.subtle.decrypt({ name: 'AES-CBC' })` |
| `PKCS7UnPadding` | Web Crypto API 自动处理 |
| `[]byte(key)` 直接作为密钥 | `new TextEncoder().encode(key)` |
