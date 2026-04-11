import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { isPidAlive, readState, writeState } from '../src/lib/state.ts'

describe('readState', () => {
  it('文件不存在时返回默认值', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'))
    try {
      fs.mkdirSync(path.join(tmpDir, 'runtime'), { recursive: true })
      const state = readState(tmpDir)
      assert.strictEqual(state.active, null)
      assert.strictEqual(state.proxyPid, null)
      assert.strictEqual(state.proxyPort, null)
      assert.strictEqual(state.appliedAt, null)
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })

  it('JSON 损坏时返回默认值', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'))
    try {
      const runtimeDir = path.join(tmpDir, 'runtime')
      fs.mkdirSync(runtimeDir, { recursive: true })
      fs.writeFileSync(path.join(runtimeDir, 'state.json'), 'not json', 'utf8')
      const state = readState(tmpDir)
      assert.strictEqual(state.active, null)
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })

  it('正确读取已写入的状态', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'))
    try {
      const runtimeDir = path.join(tmpDir, 'runtime')
      fs.mkdirSync(runtimeDir, { recursive: true })
      const original = { active: 'test', proxyPid: 1234, proxyPort: 5678, appliedAt: '2026-01-01T00:00:00Z' }
      fs.writeFileSync(path.join(runtimeDir, 'state.json'), JSON.stringify(original), 'utf8')
      const state = readState(tmpDir)
      assert.strictEqual(state.active, 'test')
      assert.strictEqual(state.proxyPid, 1234)
      assert.strictEqual(state.proxyPort, 5678)
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })
})

describe('writeState', () => {
  it('写入后可读取', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'))
    try {
      const state = { active: 'my-config', proxyPid: 42, proxyPort: 8080, appliedAt: '2026-01-01T00:00:00Z' }
      writeState(tmpDir, state)
      const read = readState(tmpDir)
      assert.deepStrictEqual(read, state)
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })
})

describe('isPidAlive', () => {
  it('当前进程存活', () => {
    assert.strictEqual(isPidAlive(process.pid), true)
  })

  it('不存在的 PID 返回 false', () => {
    assert.strictEqual(isPidAlive(999999), false)
  })
})
