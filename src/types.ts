/** 运行时状态，持久化到 runtime/state.json */
export interface State {
  active: string | null
  proxyPid: number | null
  proxyPort: number | null
  appliedAt: string | null
}

/** 所有计算路径（configName 未提供时 config 相关字段为 null） */
export interface Paths {
  configsDir: string
  runtimeDir: string
  stateFile: string
  lastAppliedDir: string
  backupsDir: string
  logsDir: string
  dryRunDir: string
  dryRunSettings: string
  claudeSettings: string
  configDir: string | null
  configSettings: string | null
  configProxy: string | null
  configProxyStart: string | null
  lastAppliedSettings: string | null
}

/** 提供了 configName 时的路径，config 相关字段保证非 null */
export interface ConfigPaths extends Paths {
  configDir: string
  configSettings: string
  configProxy: string
  configProxyStart: string
  lastAppliedSettings: string
}

/** Claude Code settings.json 中与 ccc 相关的字段 */
export interface ClaudeSettings {
  env?: {
    ANTHROPIC_BASE_URL?: string
    ANTHROPIC_DEFAULT_SONNET_MODEL?: string
    [key: string]: string | undefined
  }
  model?: string
  [key: string]: unknown
}

/** 从配置中提取的摘要 */
export interface ConfigSummary {
  url: string
  model: string
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
  isDryRun: boolean
  cccDir: () => string
}
