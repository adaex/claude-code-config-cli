import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { stableStringify } from '../src/lib/backup.ts'

describe('stableStringify', () => {
  it('排序顶层 key', () => {
    assert.strictEqual(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}')
  })

  it('递归排序嵌套 key', () => {
    assert.strictEqual(stableStringify({ z: { b: 1, a: 2 }, a: 3 }), '{"a":3,"z":{"a":2,"b":1}}')
  })

  it('处理数组（保持顺序）', () => {
    assert.strictEqual(stableStringify([3, 1, 2]), '[3,1,2]')
  })

  it('处理 null', () => {
    assert.strictEqual(stableStringify(null), 'null')
  })

  it('处理字符串', () => {
    assert.strictEqual(stableStringify('hello'), '"hello"')
  })

  it('处理数字', () => {
    assert.strictEqual(stableStringify(42), '42')
  })

  it('处理布尔', () => {
    assert.strictEqual(stableStringify(true), 'true')
  })

  it('处理空对象', () => {
    assert.strictEqual(stableStringify({}), '{}')
  })

  it('处理空数组', () => {
    assert.strictEqual(stableStringify([]), '[]')
  })

  it('不同 key 顺序产生相同结果', () => {
    const a = stableStringify({ env: { B: '2', A: '1' }, model: 'x' })
    const b = stableStringify({ model: 'x', env: { A: '1', B: '2' } })
    assert.strictEqual(a, b)
  })
})
