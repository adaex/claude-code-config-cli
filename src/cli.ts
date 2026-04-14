import fs from 'node:fs'
import path from 'node:path'
import { cmdHelp } from './commands/help.js'
import { commands } from './commands/index.js'
import { error } from './lib/logger.js'

function getVersion(): string {
  const pkgPath = path.join(__dirname, '..', 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version: string }
  return pkg.version
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.includes('--version') || args.includes('-V')) {
    console.log(getVersion())
    return
  }

  const [command, ...rest] = args

  if (command === 'version') {
    console.log(getVersion())
    return
  }

  if (!command) {
    cmdHelp({ args: [] })
    return
  }

  const handler = commands.get(command)
  if (!handler) {
    error(`未知命令：${command}`)
    cmdHelp({ args: [] })
    process.exit(1)
  }

  await handler({ args: rest })
}

main().catch((e: unknown) => {
  error(e instanceof Error ? e.message : String(e))
  process.exit(1)
})
