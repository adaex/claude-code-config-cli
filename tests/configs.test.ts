import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractConfigSummary, extractLocalPort } from '../src/lib/configs.ts'

describe('extractLocalPort', () => {
  it('提取 localhost 端口', () => {
    assert.strictEqual(extractLocalPort({ env: { ANTHROPIC_BASE_URL: 'http://localhost:15432' } }), 15432)
  })

  it('提取 127.0.0.1 端口', () => {
    assert.strictEqual(extractLocalPort({ env: { ANTHROPIC_BASE_URL: 'http://127.0.0.1:8080' } }), 8080)
  })

  it('https 也能提取', () => {
    assert.strictEqual(extractLocalPort({ env: { ANTHROPIC_BASE_URL: 'https://localhost:3000' } }), 3000)
  })

  it('非本地地址返回 null', () => {
    assert.strictEqual(extractLocalPort({ env: { ANTHROPIC_BASE_URL: 'https://api.anthropic.com' } }), null)
  })

  it('无 env 返回 null', () => {
    assert.strictEqual(extractLocalPort({}), null)
  })

  it('null settings 返回 null', () => {
    assert.strictEqual(extractLocalPort(null), null)
  })

  it('无 ANTHROPIC_BASE_URL 返回 null', () => {
    assert.strictEqual(extractLocalPort({ env: {} }), null)
  })
})

describe('extractConfigSummary', () => {
  it('提取 url 和 model', () => {
    const result = extractConfigSummary({
      env: { ANTHROPIC_BASE_URL: 'http://localhost:15432', ANTHROPIC_DEFAULT_SONNET_MODEL: 'sonnet-4' },
    })
    assert.strictEqual(result.url, 'http://localhost:15432')
    assert.strictEqual(result.model, 'sonnet-4')
  })

  it('null settings 返回空字符串', () => {
    const result = extractConfigSummary(null)
    assert.strictEqual(result.url, '')
    assert.strictEqual(result.model, '')
  })

  it('使用 settings.model 作为回退', () => {
    const result = extractConfigSummary({ model: 'opus-4' })
    assert.strictEqual(result.model, 'opus-4')
  })

  it('env model 优先于 settings.model', () => {
    const result = extractConfigSummary({
      env: { ANTHROPIC_DEFAULT_SONNET_MODEL: 'sonnet-4' },
      model: 'opus-4',
    })
    assert.strictEqual(result.model, 'sonnet-4')
  })
})
