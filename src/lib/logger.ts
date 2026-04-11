const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'

export const c = { RESET, BOLD, DIM, GREEN, YELLOW, RED, CYAN } as const

export function info(msg: string): void {
  console.log(`${CYAN}◆${RESET} ${msg}`)
}

export function warn(msg: string): void {
  console.log(`${YELLOW}⚠${RESET} ${msg}`)
}

export function error(msg: string): void {
  console.error(`${RED}✗${RESET} ${msg}`)
}

export function success(msg: string): void {
  console.log(`${GREEN}✓${RESET} ${msg}`)
}

export function dim(msg: string): void {
  console.log(`  ${DIM}${msg}${RESET}`)
}

export function dryRun(msg: string): void {
  console.log(`  ${DIM}→ ${msg}${RESET}`)
}

export function dot(): void {
  process.stdout.write('.')
}

export function step(msg: string): void {
  console.log(`\n${msg}`)
}
