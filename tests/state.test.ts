import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isPidAlive } from '../src/lib/state.ts'

describe('isPidAlive', () => {
  it('当前进程存活', () => {
    assert.strictEqual(isPidAlive(process.pid), true)
  })

  it('不存在的 PID 返回 false', () => {
    assert.strictEqual(isPidAlive(999999), false)
  })
})
