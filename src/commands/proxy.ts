import { execSync } from 'node:child_process'
import fs from 'node:fs'
import { ensureProxy } from '../lib/health.ts'
import { c, dim, error, info, success, warn } from '../lib/logger.ts'
import { ensureProxyDirs, getProxyPaths, listProxyNames, loadProxyDefinition } from '../lib/paths.ts'
import { ProxyStartError, startProxy, stopProxy, waitForPort } from '../lib/proxy.ts'
import { isPidAlive, readProxyState, writeProxyState } from '../lib/state.ts'
import type { CommandContext } from '../types.ts'

function resolveProxyName(name: string | undefined): string {
  const resolved = name ?? 'coco'
  const available = listProxyNames()
  if (!available.includes(resolved)) {
    error(`未知代理：${resolved}`)
    if (available.length) {
      dim(`可用代理：${available.join('、')}`)
    }
    process.exit(1)
  }
  return resolved
}

async function proxyInstall(name: string): Promise<void> {
  const p = getProxyPaths(name)

  if (!fs.existsSync(p.sourceInstallSh)) {
    error(`代理 ${name} 没有 install.sh`)
    process.exit(1)
  }

  ensureProxyDirs(name)
  info(`安装代理 ${name} 到 ${p.runtimeDir}`)

  execSync(`bash "${p.sourceInstallSh}"`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      INSTALL_DIR: p.runtimeDir,
      SOURCE_DIR: p.sourceDir,
    },
  })

  if (!fs.existsSync(p.venvDir)) {
    warn('.venv 未创建，安装可能未完成')
    return
  }

  console.log()
  success(`代理 ${name} 安装完成`)
}

async function proxyStart(name: string): Promise<void> {
  const p = getProxyPaths(name)
  const def = loadProxyDefinition(name)
  const state = readProxyState(name)

  if (state.pid !== null && isPidAlive(state.pid)) {
    success(`${name} · http://127.0.0.1:${state.port} · 代理运行中 (PID ${state.pid})`)
    return
  }

  if (!fs.existsSync(p.runtimeConfigYaml) || !fs.existsSync(p.venvDir)) {
    error(`代理 ${name} 未安装，请先执行 ccc proxy install ${name}`)
    process.exit(1)
  }

  ensureProxyDirs(name)
  const port = state.port || def.defaultPort

  try {
    const result = await startProxy(name, port)
    dim(`PID ${result.pid}  日志 ${result.logFile}`)

    process.stdout.write(`${c.CYAN}◆${c.RESET} 等待代理就绪`)
    const portResult = await waitForPort(port, 10000)
    console.log()

    if (portResult.ready) {
      console.log()
      success(`${name} · http://127.0.0.1:${port} · 代理已就绪 (PID ${result.pid})`)
    } else {
      warn(`代理 10 秒内未响应端口 ${port}`)
      dim(`查看日志：${result.logFile}`)
    }

    writeProxyState(name, { pid: result.pid, port, startedAt: new Date().toISOString() })
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
          for (const l of show) dim(l)
          if (lines.length > 20) dim(`... 省略 ${lines.length - 20} 行，完整日志: ${proxyErr.logFile}`)
          dim('────────────')
        }
      } catch {
        /* 忽略 */
      }
    }
    process.exit(1)
  }
}

async function proxyStop(name: string): Promise<void> {
  const state = readProxyState(name)

  if (state.pid === null || !isPidAlive(state.pid)) {
    dim(`${name} 未运行`)
    return
  }

  info(`停止代理 ${name} (PID ${state.pid})`)
  const result = await stopProxy(state.pid)

  if (result.stopped) {
    writeProxyState(name, { ...state, pid: null, startedAt: null })
    success(result.forced ? `已强制停止 (SIGKILL)` : '已停止')
  } else {
    warn(result.reason ?? '停止失败')
  }
}

async function proxyStatus(name: string): Promise<void> {
  const p = getProxyPaths(name)
  const state = readProxyState(name)

  if (!fs.existsSync(p.runtimeConfigYaml) || !fs.existsSync(p.venvDir)) {
    dim(`${name} · 未安装`)
    return
  }

  if (state.pid !== null && isPidAlive(state.pid)) {
    console.log(
      `${c.GREEN}✓${c.RESET} ${c.CYAN}${name}${c.RESET} ${c.DIM}·${c.RESET} ${c.DIM}http://127.0.0.1:${state.port}${c.RESET} ${c.DIM}·${c.RESET} ${c.GREEN}代理运行中${c.RESET} ${c.DIM}(PID ${state.pid})${c.RESET}`,
    )
    return
  }

  // 代理未运行，自动重启
  await ensureProxy(name)
}

export async function cmdProxy(ctx: CommandContext): Promise<void> {
  const [subcommand, proxyName] = ctx.args

  if (!subcommand) {
    error('用法：ccc proxy <start|stop|status|install> [名称]')
    process.exit(1)
  }

  const name = resolveProxyName(subcommand === 'install' ? proxyName : proxyName)

  switch (subcommand) {
    case 'start':
      return proxyStart(name)
    case 'stop':
      return proxyStop(name)
    case 'status':
      return proxyStatus(name)
    case 'install':
      return proxyInstall(name)
    default:
      error(`未知子命令：${subcommand}`)
      error('可用：start、stop、status、install')
      process.exit(1)
  }
}
