import fs from 'node:fs'
import { c, dim, error, success, warn } from './logger.ts'
import { ensureProxyDirs } from './paths.ts'
import { ProxyStartError, startProxy, waitForPort } from './proxy.ts'
import { isPidAlive, readProxyState, writeProxyState } from './state.ts'

export interface EnsureProxyResult {
  restarted: boolean
  pid: number
  port: number
}

/**
 * 检查代理是否存活，若已停止则自动重启。
 * 返回 null 表示无需操作或重启失败。
 */
export async function ensureProxy(proxyName: string): Promise<EnsureProxyResult | null> {
  const state = readProxyState(proxyName)
  if (state.pid !== null && isPidAlive(state.pid)) return null

  const port = state.port
  ensureProxyDirs(proxyName)

  console.log()
  warn('代理已停止，正在自动重启…')

  try {
    const result = await startProxy(proxyName, port)
    dim(`PID ${result.pid}  日志 ${result.logFile}`)

    process.stdout.write(`${c.CYAN}◆${c.RESET} 等待代理就绪`)
    const portResult = await waitForPort(port, 10000)
    console.log()

    if (portResult.ready) {
      success(`代理已就绪，端口 ${port}`)
    } else {
      warn(`代理 10 秒内未响应端口 ${port}`)
      dim(`查看日志：${result.logFile}`)
    }

    writeProxyState(proxyName, { pid: result.pid, port, startedAt: new Date().toISOString() })
    return { restarted: true, pid: result.pid, port }
  } catch (e: unknown) {
    const proxyErr = e instanceof ProxyStartError ? e : null
    error(e instanceof Error ? e.message : String(e))
    if (proxyErr?.logFile) {
      try {
        const logContent = fs.readFileSync(proxyErr.logFile, 'utf8')
        const lines = logContent.split('\n').filter((l) => l.length > 0)
        const show = lines.slice(0, 20)
        if (show.length) {
          dim('─── 日志输出 ───')
          for (const l of show) {
            dim(l)
          }
          if (lines.length > 20) dim(`... 省略 ${lines.length - 20} 行，完整日志: ${proxyErr.logFile}`)
          dim('────────────')
        }
      } catch {
        /* 日志文件不可读，忽略 */
      }
    }
    return null
  }
}
