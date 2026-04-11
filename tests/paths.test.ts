import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { ensureRuntimeDirs, getPaths } from '../src/lib/paths.ts'

describe('getPaths', () => {
  const cccDir = '/fake/ccc'

  it('返回基础路径', () => {
    const p = getPaths(cccDir)
    assert.strictEqual(p.configsDir, '/fake/ccc/configs')
    assert.strictEqual(p.runtimeDir, '/fake/ccc/runtime')
    assert.strictEqual(p.stateFile, '/fake/ccc/runtime/state.json')
    assert.strictEqual(p.claudeSettings, path.join(os.homedir(), '.claude', 'settings.json'))
  })

  it('无 configName 时 config 字段为 null', () => {
    const p = getPaths(cccDir)
    assert.strictEqual(p.configDir, null)
    assert.strictEqual(p.configSettings, null)
    assert.strictEqual(p.configProxy, null)
    assert.strictEqual(p.configProxyStart, null)
    assert.strictEqual(p.lastAppliedSettings, null)
  })

  it('有 configName 时 config 字段非 null', () => {
    const p = getPaths(cccDir, 'test-config')
    assert.strictEqual(p.configDir, '/fake/ccc/configs/test-config')
    assert.strictEqual(p.configSettings, '/fake/ccc/configs/test-config/settings.json')
    assert.strictEqual(p.configProxy, '/fake/ccc/configs/test-config/proxy')
    assert.strictEqual(p.configProxyStart, '/fake/ccc/configs/test-config/proxy/start.sh')
    assert.strictEqual(p.lastAppliedSettings, '/fake/ccc/runtime/last-applied/test-config/settings.json')
  })

  it('返回冻结对象', () => {
    const p = getPaths(cccDir)
    assert.strictEqual(Object.isFrozen(p), true)
  })
})

describe('ensureRuntimeDirs', () => {
  it('创建所有 runtime 子目录', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-test-'))
    try {
      ensureRuntimeDirs(tmpDir)
      assert.strictEqual(fs.existsSync(path.join(tmpDir, 'runtime')), true)
      assert.strictEqual(fs.existsSync(path.join(tmpDir, 'runtime', 'last-applied')), true)
      assert.strictEqual(fs.existsSync(path.join(tmpDir, 'runtime', 'backups')), true)
      assert.strictEqual(fs.existsSync(path.join(tmpDir, 'runtime', 'logs')), true)
      assert.strictEqual(fs.existsSync(path.join(tmpDir, 'runtime', 'dry-run')), true)
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })
})
