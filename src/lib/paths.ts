import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ProxyDefinition, ProxyPaths } from '../types.ts'

/** 当前文件所在目录 */
const __lib_dir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

/** 包根目录（src/lib/ 或 dist/ 的上两级/一级） */
function packageRoot(): string {
  // 构建后: dist/cli.js → __dirname = dist/ → 上一级
  // 开发/测试: src/lib/paths.ts → __dirname = src/lib/ → 上两级（src → 根目录）
  const up = __lib_dir.endsWith(path.join('src', 'lib')) ? path.join(__lib_dir, '..', '..') : path.join(__lib_dir, '..')
  return path.resolve(up)
}

/** ~/.ccc 基础目录 */
export function cccHome(): string {
  return path.join(os.homedir(), '.ccc')
}

/** 解析指定代理的所有路径 */
export function getProxyPaths(proxyName: string): ProxyPaths {
  const sourceDir = path.join(packageRoot(), 'proxies', proxyName)
  const runtimeDir = path.join(cccHome(), 'proxies', proxyName)
  return Object.freeze({
    sourceDir,
    sourceStartSh: path.join(sourceDir, 'start.sh'),
    sourceInstallSh: path.join(sourceDir, 'install.sh'),
    sourceConfigYaml: path.join(sourceDir, 'config.yaml'),
    runtimeDir,
    stateFile: path.join(runtimeDir, 'state.json'),
    logsDir: path.join(runtimeDir, 'logs'),
    venvDir: path.join(runtimeDir, '.venv'),
    runtimeConfigYaml: path.join(runtimeDir, 'config.yaml'),
  })
}

/** 列出包内可用的代理名称 */
export function listProxyNames(): string[] {
  const proxiesDir = path.join(packageRoot(), 'proxies')
  if (!fs.existsSync(proxiesDir)) return []
  return fs
    .readdirSync(proxiesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(proxiesDir, d.name, 'start.sh')))
    .map((d) => d.name)
    .sort()
}

/** 读取代理元数据 */
export function loadProxyDefinition(proxyName: string): ProxyDefinition {
  const p = getProxyPaths(proxyName)
  const jsonPath = path.join(p.sourceDir, 'proxy.json')
  if (!fs.existsSync(jsonPath)) {
    return { name: proxyName, defaultPort: 15432 }
  }
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as ProxyDefinition
}

/** 确保代理运行时目录存在 */
export function ensureProxyDirs(proxyName: string): void {
  const p = getProxyPaths(proxyName)
  fs.mkdirSync(p.logsDir, { recursive: true })
}
