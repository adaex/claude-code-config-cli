/** 代理运行时状态，持久化到 ~/.ccc/proxies/<name>/state.json */
export interface ProxyState {
  pid: number | null
  port: number
  startedAt: string | null
}

/** 代理的所有计算路径 */
export interface ProxyPaths {
  /** 包内源目录：<package-root>/proxies/<name>/ */
  sourceDir: string
  sourceStartSh: string
  sourceInstallSh: string
  sourceConfigYaml: string
  /** 运行时目录：~/.ccc/proxies/<name>/ */
  runtimeDir: string
  stateFile: string
  logsDir: string
  venvDir: string
  runtimeConfigYaml: string
}

/** 代理元数据（来自 proxy.json） */
export interface ProxyDefinition {
  name: string
  defaultPort: number
}

/** startProxy 返回值 */
export interface ProxyStartResult {
  pid: number
  port: number
  logFile: string
}

/** stopProxy 返回值 */
export interface StopResult {
  stopped: boolean
  reason?: string
  forced?: boolean
}

/** waitForPort 返回值 */
export interface PortResult {
  ready: boolean
  attempts: number
}

/** 命令处理函数签名 */
export type CommandHandler = (ctx: CommandContext) => Promise<void> | void

/** 传递给每个命令的共享上下文 */
export interface CommandContext {
  args: string[]
}
