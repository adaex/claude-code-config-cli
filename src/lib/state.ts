import fs from 'node:fs'
import path from 'node:path'
import type { ProxyState } from '../types.ts'
import { getProxyPaths, loadProxyDefinition } from './paths.ts'

/** 读取代理运行时状态，文件不存在或解析失败时返回默认值 */
export function readProxyState(proxyName: string): ProxyState {
  const { stateFile } = getProxyPaths(proxyName)
  if (!fs.existsSync(stateFile)) {
    const def = loadProxyDefinition(proxyName)
    return { pid: null, port: def.defaultPort, startedAt: null }
  }
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as ProxyState
  } catch {
    const def = loadProxyDefinition(proxyName)
    return { pid: null, port: def.defaultPort, startedAt: null }
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
