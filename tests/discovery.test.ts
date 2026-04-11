import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { discoverCccDir } from '../src/lib/discovery.ts'

describe('discoverCccDir', () => {
  const originalCccDir = process.env.CCC_DIR

  afterEach(() => {
    if (originalCccDir === undefined) {
      delete process.env.CCC_DIR
    } else {
      process.env.CCC_DIR = originalCccDir
    }
  })

  it('通过 CCC_DIR 环境变量发现', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'))
    try {
      fs.mkdirSync(path.join(tmpDir, 'configs'), { recursive: true })
      process.env.CCC_DIR = tmpDir
      assert.strictEqual(discoverCccDir(), tmpDir)
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })

  it('CCC_DIR 优先于回退路径', () => {
    const tmpDir1 = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-1-'))
    const tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-2-'))
    try {
      fs.mkdirSync(path.join(tmpDir1, 'configs'), { recursive: true })
      fs.mkdirSync(path.join(tmpDir2, 'configs'), { recursive: true })
      process.env.CCC_DIR = tmpDir1
      assert.strictEqual(discoverCccDir(), tmpDir1)
    } finally {
      fs.rmSync(tmpDir1, { recursive: true })
      fs.rmSync(tmpDir2, { recursive: true })
    }
  })

  it('CCC_DIR 无 configs/ 子目录时不被选用', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'))
    try {
      process.env.CCC_DIR = tmpDir
      let result: string | null = null
      try {
        result = discoverCccDir()
      } catch {
        result = null
      }
      assert.notStrictEqual(result, tmpDir)
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })
})
