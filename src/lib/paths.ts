import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { ConfigPaths, Paths } from '../types.ts'

export function getPaths(cccDir: string): Paths
export function getPaths(cccDir: string, configName: string): ConfigPaths
export function getPaths(cccDir: string, configName?: string): Paths {
  const runtimeDir = path.join(cccDir, 'runtime')
  const p: Paths = {
    configsDir: path.join(cccDir, 'configs'),
    runtimeDir,
    stateFile: path.join(runtimeDir, 'state.json'),
    lastAppliedDir: path.join(runtimeDir, 'last-applied'),
    backupsDir: path.join(runtimeDir, 'backups'),
    logsDir: path.join(runtimeDir, 'logs'),
    dryRunDir: path.join(runtimeDir, 'dry-run'),
    dryRunSettings: path.join(runtimeDir, 'dry-run', 'settings.json'),
    claudeSettings: path.join(os.homedir(), '.claude', 'settings.json'),
    configDir: null,
    configSettings: null,
    configProxy: null,
    configProxyStart: null,
    lastAppliedSettings: null,
  }
  if (configName) {
    p.configDir = path.join(cccDir, 'configs', configName)
    p.configSettings = path.join(cccDir, 'configs', configName, 'settings.json')
    p.configProxy = path.join(cccDir, 'configs', configName, 'proxy')
    p.configProxyStart = path.join(cccDir, 'configs', configName, 'proxy', 'start.sh')
    p.lastAppliedSettings = path.join(runtimeDir, 'last-applied', configName, 'settings.json')
  }
  return Object.freeze(p)
}

/** 确保所有 runtime 子目录存在 */
export function ensureRuntimeDirs(cccDir: string): void {
  const p = getPaths(cccDir)
  for (const dir of [p.runtimeDir, p.lastAppliedDir, p.backupsDir, p.logsDir, p.dryRunDir]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}
