import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const CLONE_REPO = 'git@github.com:adaex/claude-code-configs.git'
const ALLOWED_USERS = new Set(['aex', 'adaex'])

export interface GitStatus {
  branch: string
  dirty: boolean
  ahead: number
  behind: number
}

/** 在 CCC_DIR 中执行 git 命令，返回 trimmed stdout */
export function gitExec(cccDir: string, args: string): string {
  return execSync(`git ${args}`, {
    cwd: cccDir,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}

/** 获取 CCC_DIR 的 git 仓库状态 */
export function getGitStatus(cccDir: string): GitStatus {
  const branch = gitExec(cccDir, 'rev-parse --abbrev-ref HEAD')
  const dirty = gitExec(cccDir, 'status --porcelain') !== ''

  let ahead = 0
  let behind = 0
  try {
    ahead = Number.parseInt(gitExec(cccDir, 'rev-list --count @{u}..HEAD'), 10)
    behind = Number.parseInt(gitExec(cccDir, 'rev-list --count HEAD..@{u}'), 10)
  } catch {
    // 无远程跟踪分支时忽略
  }

  return { branch, dirty, ahead, behind }
}

/** git pull --rebase，输出直接展示给用户 */
export function gitPull(cccDir: string): void {
  execSync('git pull --rebase', { cwd: cccDir, stdio: 'inherit' })
}

/** git add -A → 有变更则自动提交，返回是否产生了新提交 */
export function gitAutoCommit(cccDir: string): boolean {
  gitExec(cccDir, 'add -A')
  try {
    execSync('git diff --cached --quiet', { cwd: cccDir, stdio: 'pipe' })
    return false
  } catch {
    // exit code 1 = 有暂存变更
  }
  const ts = new Date()
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '')
  gitExec(cccDir, `commit -m "sync: update configs (${ts})"`)
  return true
}

/** git push，输出直接展示给用户 */
export function gitPush(cccDir: string): void {
  execSync('git push', { cwd: cccDir, stdio: 'inherit' })
}

/**
 * 若用户名为 aex/adaex 且目标目录不存在，自动 clone 配置仓库。
 * 返回 clone 后的路径，未执行则返回 null。
 */
export function autoCloneIfNeeded(): string | null {
  const username = os.userInfo().username
  if (!ALLOWED_USERS.has(username)) return null

  const target = process.env.CCC_DIR || path.join(os.homedir(), 'space', 'claude-code-configs')
  if (fs.existsSync(target)) return null

  fs.mkdirSync(path.dirname(target), { recursive: true })
  execSync(`git clone ${CLONE_REPO} "${target}"`, { stdio: 'inherit' })
  return target
}
