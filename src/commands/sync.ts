import { autoCloneIfNeeded, getGitStatus, gitAutoCommit, gitPull, gitPush } from '../lib/git.ts'
import { c, dim, dryRun as dryRunLog, error, info, step, success, warn } from '../lib/logger.ts'
import type { CommandContext } from '../types.ts'

export function cmdSync(ctx: CommandContext): void {
  const pullOnly = ctx.args.includes('--pull')
  const pushOnly = ctx.args.includes('--push')

  if (pullOnly && pushOnly) {
    error('--pull 和 --push 不能同时使用')
    process.exit(1)
  }

  // 在 ctx.cccDir() 之前尝试自动 clone
  const cloned = autoCloneIfNeeded()
  if (cloned) {
    success(`已自动克隆配置仓库到 ${c.CYAN}${cloned}${c.RESET}`)
  }

  const cccDir = ctx.cccDir()

  if (ctx.isDryRun) {
    info(`${c.YELLOW}[ dry-run 演练模式 ]${c.RESET}  不执行任何 git 操作`)
  }

  // 检查仓库状态
  step('检查仓库状态')
  const status = getGitStatus(cccDir)
  info(`分支：${c.CYAN}${status.branch}${c.RESET}`)

  if (status.dirty) {
    warn('工作区有未提交的变更')
  }
  if (status.behind > 0) {
    info(`落后远程 ${c.YELLOW}${status.behind}${c.RESET} 个提交`)
  }
  if (status.ahead > 0) {
    info(`领先远程 ${c.GREEN}${status.ahead}${c.RESET} 个提交`)
  }

  // Pull
  if (!pushOnly) {
    step('拉取远程变更')
    if (ctx.isDryRun) {
      dryRunLog('git pull --rebase')
    } else {
      gitPull(cccDir)
      success('拉取完成')
    }
  }

  // Push
  if (!pullOnly) {
    step('提交并推送本地变更')
    if (ctx.isDryRun) {
      dryRunLog('git add -A')
      dryRunLog('git commit -m "sync: update configs (<timestamp>)"')
      dryRunLog('git push')
    } else {
      const committed = gitAutoCommit(cccDir)
      if (committed) {
        success('已自动提交变更')
      } else {
        dim('无变更需要提交')
      }
      gitPush(cccDir)
      success('推送完成')
    }
  }

  console.log()
  success('同步完成')
}
