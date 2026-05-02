import type { CommandHandler } from '../types.ts'
import { cmdBackup } from './backup.ts'
import { cmdDoctor } from './doctor.ts'
import { cmdHelp } from './help.ts'
import { cmdOpen } from './open.ts'
import { cmdProxy, proxyStopAll } from './proxy.ts'
import { cmdUpdate } from './update.ts'

export const commands = new Map<string, CommandHandler>([
  ['proxy', cmdProxy],
  ['stop', proxyStopAll],
  ['doctor', cmdDoctor],
  ['backup', cmdBackup],
  ['open', cmdOpen],
  ['update', cmdUpdate],
  ['help', cmdHelp],
  ['--help', cmdHelp],
  ['-h', cmdHelp],
])
