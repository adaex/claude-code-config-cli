import type { CommandHandler } from '../types.ts'
import { cmdHelp } from './help.ts'
import { cmdProxy } from './proxy.ts'
import { cmdUpdate } from './update.ts'

export const commands = new Map<string, CommandHandler>([
  ['proxy', cmdProxy],
  ['update', cmdUpdate],
  ['help', cmdHelp],
  ['--help', cmdHelp],
  ['-h', cmdHelp],
])
