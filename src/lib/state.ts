import fs from 'node:fs'
import path from 'node:path'
import type { ProxyState } from '../types.ts'
import { error } from './logger.ts'
import { getProxyPaths } from './paths.ts'

/**
 * 从代理 start.sh 解析端口，按优先级尝试：
 * 1. PORT=${PORT:-<端口>} / PORT="${PORT:-<端口>}"
 * 2. PORT=<端口>
 * 3. --port <端口>（litellm 命令行）
 */
export function resolvePort(proxyName: string): number | null {
  const { startSh } = getProxyPaths(proxyName)
  try {
    const content = fs.readFileSync(startSh, 'utf8')
    const m = content.match(/PORT="?\$\{PORT:-(\d+)\}"?/) || content.match(/^PORT=(\d+)$/m) || content.match(/^[^#]*--port\s+"?(\d+)"?/m)
    if (!m?.[1]) {
      error(`无法从 ${startSh} 解析端口`)
      return null
    }
    return Number.parseInt(m[1], 10)
  } catch {
    error(`无法读取 ${startSh}`)
    return null
  }
}

/** 从 ANTHROPIC_BASE_URL 环境变量解析端口，用于校验 */
export function resolvePortFromEnv(): number | null {
  const url = process.env.ANTHROPIC_BASE_URL
  if (!url) return null
  try {
    const parsed = new URL(url)
    const isLocal = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
    if (!isLocal) return null
    const port = Number.parseInt(parsed.port, 10)
    if (Number.isNaN(port)) return null
    return port
  } catch {
    return null
  }
}

/** 读取代理运行时状态，文件不存在或解析失败时返回默认值 */
export function readProxyState(proxyName: string): ProxyState {
  const { stateFile } = getProxyPaths(proxyName)
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as ProxyState
  } catch {
    return { pid: null, port: null, startedAt: null }
  }
}

/** 写入代理运行时状态 */
export function writeProxyState(proxyName: string, state: ProxyState): void {
  const { stateFile } = getProxyPaths(proxyName)
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
