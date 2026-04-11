import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { filterConfigs, fuzzyMatch } from '../src/lib/fuzzy.ts'

describe('fuzzyMatch', () => {
  it('匹配子序列', () => {
    assert.strictEqual(fuzzyMatch('s2c', 'seed-2-0-code'), true)
  })

  it('匹配精确', () => {
    assert.strictEqual(fuzzyMatch('proxy', 'proxy'), true)
  })

  it('大小写不敏感', () => {
    assert.strictEqual(fuzzyMatch('ABC', 'a-b-c'), true)
  })

  it('不匹配非子序列', () => {
    assert.strictEqual(fuzzyMatch('xyz', 'seed-2-0-code'), false)
  })

  it('空 query 匹配任何字符串', () => {
    assert.strictEqual(fuzzyMatch('', 'anything'), true)
  })

  it('query 长于 candidate 不匹配', () => {
    assert.strictEqual(fuzzyMatch('abcdef', 'abc'), false)
  })

  it('匹配单字符', () => {
    assert.strictEqual(fuzzyMatch('s', 'seed'), true)
  })

  it('匹配首尾字符', () => {
    assert.strictEqual(fuzzyMatch('se', 'seed-2-0-code'), true)
  })
})

describe('filterConfigs', () => {
  const configs = ['seed-2-0-code', 'seed-dogfooding', 'proxy-config']

  it('返回所有匹配', () => {
    assert.deepStrictEqual(filterConfigs('seed', configs), ['seed-2-0-code', 'seed-dogfooding'])
  })

  it('无匹配返回空数组', () => {
    assert.deepStrictEqual(filterConfigs('zzz', configs), [])
  })

  it('精确匹配单个', () => {
    assert.deepStrictEqual(filterConfigs('proxy-config', configs), ['proxy-config'])
  })

  it('子序列匹配', () => {
    assert.deepStrictEqual(filterConfigs('s2c', configs), ['seed-2-0-code'])
  })
})
