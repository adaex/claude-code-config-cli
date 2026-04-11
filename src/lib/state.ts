import fs from 'node:fs'
import path from 'node:path'
import type { State } from '../types.ts'
import { getPaths } from './paths.ts'

const DEFAULT_STATE: Readonly<State> = Object.freeze({ active: null, proxyPid: null, proxyPort: null, appliedAt: null })

/** 读取运行时状态，文件不存在或解析失败时返回默认值 */
export function readState(cccDir: string): State {
  const stateFile = getPaths(cccDir).stateFile
  if (!fs.existsSync(stateFile)) return { ...DEFAULT_STATE }
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as State
  } catch {
    return { ...DEFAULT_STATE }
  }
}

export function writeState(cccDir: string, state: State): void {
  const stateFile = getPaths(cccDir).stateFile
  fs.mkdirSync(path.dirname(stateFile), { recursive: true })
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`)
}

/** 通过发送信号 0 检测进程是否存活 */
export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
