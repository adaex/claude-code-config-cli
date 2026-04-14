import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { getProxyPaths, listProxyNames } from '../src/lib/paths.ts'

describe('getProxyPaths', () => {
  it('返回正确的源目录路径', () => {
    const p = getProxyPaths('coco')
    assert.ok(p.sourceDir.endsWith(path.join('proxies', 'coco')))
    assert.ok(p.sourceStartSh.endsWith(path.join('proxies', 'coco', 'start.sh')))
    assert.ok(p.sourceInstallSh.endsWith(path.join('proxies', 'coco', 'install.sh')))
    assert.ok(p.sourceConfigYaml.endsWith(path.join('proxies', 'coco', 'config.yaml')))
  })

  it('返回正确的运行时目录路径', () => {
    const p = getProxyPaths('coco')
    const home = os.homedir()
    assert.strictEqual(p.runtimeDir, path.join(home, '.ccc', 'proxies', 'coco'))
    assert.strictEqual(p.stateFile, path.join(home, '.ccc', 'proxies', 'coco', 'state.json'))
    assert.strictEqual(p.logsDir, path.join(home, '.ccc', 'proxies', 'coco', 'logs'))
    assert.strictEqual(p.venvDir, path.join(home, '.ccc', 'proxies', 'coco', '.venv'))
    assert.strictEqual(p.runtimeConfigYaml, path.join(home, '.ccc', 'proxies', 'coco', 'config.yaml'))
  })

  it('返回冻结对象', () => {
    const p = getProxyPaths('coco')
    assert.strictEqual(Object.isFrozen(p), true)
  })
})

describe('listProxyNames', () => {
  it('返回包含 coco 的数组', () => {
    const names = listProxyNames()
    assert.ok(names.includes('coco'))
  })
})
