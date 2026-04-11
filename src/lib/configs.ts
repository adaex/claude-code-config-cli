import fs from 'node:fs'
import path from 'node:path'
import type { ClaudeSettings, ConfigSummary } from '../types.ts'

/** 列出 configs/ 下所有子目录名，按字母排序 */
export function listConfigs(cccDir: string): string[] {
  const configsDir = path.join(cccDir, 'configs')
  const entries = fs.readdirSync(configsDir, { withFileTypes: true })
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
}

/** 读取指定配置的 settings.json，不存在返回 null，格式错误抛异常 */
export function readConfigSettings(cccDir: string, configName: string): ClaudeSettings | null {
  const settingsPath = path.join(cccDir, 'configs', configName, 'settings.json')
  if (!fs.existsSync(settingsPath)) return null
  const raw = fs.readFileSync(settingsPath, 'utf8')
  try {
    return JSON.parse(raw) as ClaudeSettings
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`配置 "${configName}" 的 settings.json 格式错误: ${msg}\n  路径: ${settingsPath}`, { cause: e })
  }
}

/** 判断配置是否包含代理启动脚本 */
export function hasProxy(cccDir: string, configName: string): boolean {
  const startSh = path.join(cccDir, 'configs', configName, 'proxy', 'start.sh')
  return fs.existsSync(startSh)
}

/** 从 ANTHROPIC_BASE_URL 提取本地端口号；非本地地址返回 null */
export function extractLocalPort(settings: ClaudeSettings | null): number | null {
  const url = settings?.env?.ANTHROPIC_BASE_URL
  if (!url) return null
  const m = url.match(/https?:\/\/(localhost|127\.0\.0\.1):(\d+)/)
  if (m?.[2]) return parseInt(m[2], 10)
  return null
}

/** 从 settings 中提取摘要信息 */
export function extractConfigSummary(settings: ClaudeSettings | null): ConfigSummary {
  const env = settings?.env ?? {}
  const url = env.ANTHROPIC_BASE_URL ?? ''
  const model = env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? settings?.model ?? ''
  return { url, model: typeof model === 'string' ? model : '' }
}
