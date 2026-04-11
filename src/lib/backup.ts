import fs from 'node:fs'
import path from 'node:path'
import type { ClaudeSettings } from '../types.ts'
import { getPaths } from './paths.ts'

/** 递归排序 key 后序列化，消除 key 顺序差异 */
export function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`
  const record = obj as Record<string, unknown>
  const keys = Object.keys(record).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(',')}}`
}

/** 检测 ~/.claude/settings.json 是否与上次应用的配置快照不一致 */
export function hasDrift(cccDir: string, prevConfigName: string): boolean {
  const p = getPaths(cccDir, prevConfigName)
  if (!fs.existsSync(p.claudeSettings)) return false
  if (!fs.existsSync(p.lastAppliedSettings)) return false
  try {
    const current = JSON.parse(fs.readFileSync(p.claudeSettings, 'utf8')) as ClaudeSettings
    const lastApplied = JSON.parse(fs.readFileSync(p.lastAppliedSettings, 'utf8')) as ClaudeSettings
    return stableStringify(current) !== stableStringify(lastApplied)
  } catch {
    return false
  }
}

/** 将当前 ~/.claude/settings.json 备份到 runtime/backups/ */
export function createBackup(cccDir: string, prevConfigName: string, timestamp: string): string | null {
  const p = getPaths(cccDir, prevConfigName)
  if (!fs.existsSync(p.claudeSettings)) return null
  const backupFile = path.join(p.backupsDir, `${timestamp}-${prevConfigName}.json`)
  fs.mkdirSync(path.dirname(backupFile), { recursive: true })
  fs.copyFileSync(p.claudeSettings, backupFile)
  return backupFile
}
