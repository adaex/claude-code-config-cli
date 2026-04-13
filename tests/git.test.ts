import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { getGitStatus, gitAutoCommit, gitExec } from '../src/lib/git.ts'

/** 创建临时 git 仓库，返回路径 */
function makeTempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-git-test-'))
  execSync('git init', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.name "test"', { cwd: dir, stdio: 'pipe' })
  // 初始提交
  fs.writeFileSync(path.join(dir, 'README.md'), '# test\n')
  execSync('git add -A && git commit -m "init"', { cwd: dir, stdio: 'pipe' })
  return dir
}

describe('gitExec', () => {
  let dir: string

  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true })
  })

  it('在指定目录执行 git 命令', () => {
    dir = makeTempRepo()
    const result = gitExec(dir, 'rev-parse --is-inside-work-tree')
    assert.strictEqual(result, 'true')
  })

  it('非 git 目录时抛出异常', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccc-git-test-'))
    assert.throws(() => gitExec(dir, 'status'))
  })
})

describe('getGitStatus', () => {
  let dir: string

  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true })
  })

  it('干净仓库返回 dirty=false', () => {
    dir = makeTempRepo()
    const status = getGitStatus(dir)
    assert.strictEqual(status.dirty, false)
    assert.strictEqual(status.ahead, 0)
    assert.strictEqual(status.behind, 0)
  })

  it('有未提交文件时 dirty=true', () => {
    dir = makeTempRepo()
    fs.writeFileSync(path.join(dir, 'new.txt'), 'hello\n')
    const status = getGitStatus(dir)
    assert.strictEqual(status.dirty, true)
  })

  it('返回正确的分支名', () => {
    dir = makeTempRepo()
    const status = getGitStatus(dir)
    assert.match(status.branch, /^(main|master)$/)
  })
})

describe('gitAutoCommit', () => {
  let dir: string

  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true })
  })

  it('有变更时自动提交并返回 true', () => {
    dir = makeTempRepo()
    fs.writeFileSync(path.join(dir, 'new.txt'), 'hello\n')
    const committed = gitAutoCommit(dir)
    assert.strictEqual(committed, true)
    // 验证提交存在
    const log = execSync('git log --oneline -1', { cwd: dir, encoding: 'utf8' })
    assert.match(log, /sync: update configs/)
  })

  it('无变更时返回 false', () => {
    dir = makeTempRepo()
    const committed = gitAutoCommit(dir)
    assert.strictEqual(committed, false)
  })
})
