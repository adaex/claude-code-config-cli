import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { c, success } from '../lib/logger.ts'
import type { CommandContext } from '../types.ts'

export function cmdUpdate(_ctx: CommandContext): void {
  const pkgPath = path.join(__dirname, '..', 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name: string; version: string }
  const oldVersion = pkg.version

  execSync(`npm install -g ${pkg.name}`, { stdio: 'inherit' })

  let newVersion = oldVersion
  try {
    const result = execSync(`npm list -g --depth=0 --json ${pkg.name}`, { encoding: 'utf8' })
    const info = JSON.parse(result) as { dependencies?: Record<string, { version?: string }> }
    newVersion = info.dependencies?.[pkg.name]?.version ?? oldVersion
  } catch {
    /* 忽略 */
  }

  if (newVersion === oldVersion) {
    success(`已是最新版本 ${c.GREEN}v${oldVersion}${c.RESET}`)
  } else {
    success(`已更新：${c.DIM}v${oldVersion}${c.RESET} → ${c.GREEN}v${newVersion}${c.RESET}`)
  }
}
