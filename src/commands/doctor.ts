import fs from 'node:fs'
import { c, dim, error, info, proxyStatus, showLogTail, success, warn } from '../lib/logger.ts'
import { checkMihomo, extractHostPort, getSystemProxy, httpRequest, tcpConnect, tcpConnectViaProxy } from '../lib/network.ts'
import { getProxyPaths, isLiteLLMInstalled, listProxyNames } from '../lib/paths.ts'
import { ProxyStartError, startProxy, stopProxy, waitForPort } from '../lib/proxy.ts'
import { isPidAlive, readProxyState, resolvePort, writeProxyState } from '../lib/state.ts'
import { parseModelList } from '../lib/yaml.ts'
import type { CommandContext, ProxyState } from '../types.ts'

type ConnectivityResult = { status: 'direct' } | { status: 'via-proxy'; proxyUrl: string } | { status: 'unreachable' }

export async function cmdDoctor(ctx: CommandContext): Promise<void> {
  const names = listProxyNames()
  if (names.length === 0) {
    error('未找到已配置的代理')
    dim('请在 ~/.ccc/proxies/ 下创建代理目录')
    return
  }

  const testAll = ctx.args.includes('--all') || ctx.args.includes('-a')
  const explicit = ctx.args.find((a) => !a.startsWith('-'))
  if (explicit) {
    if (!names.includes(explicit)) {
      error(`未知代理：${explicit}`)
      dim(`可用代理：${names.join(', ')}`)
      return
    }
    await diagnoseProxy(explicit, testAll)
    return
  }

  const states = new Map(names.map((n) => [n, readProxyState(n)] as const))
  const byPort = (n: string) => states.get(n)!.port ?? Number.MAX_SAFE_INTEGER

  const running = names
    .filter((n) => {
      const s = states.get(n)!
      return s.pid !== null && isPidAlive(s.pid)
    })
    .sort((a, b) => byPort(a) - byPort(b))

  if (running.length > 0) {
    for (const name of running) {
      await diagnoseProxy(name, testAll)
      if (name !== running[running.length - 1]) console.log()
    }
    return
  }

  const fallback = names.map((n) => ({ name: n, port: byPort(n) })).sort((a, b) => a.port - b.port)[0]!.name
  await diagnoseProxy(fallback, testAll)
}

async function diagnoseProxy(proxyName: string, testAll: boolean): Promise<void> {
  info(`诊断代理：${c.CYAN}${proxyName}${c.RESET}`)
  console.log()

  const paths = getProxyPaths(proxyName)
  let configContent: string
  try {
    configContent = fs.readFileSync(paths.configYaml, 'utf8')
  } catch {
    error(`无法读取配置文件：${paths.configYaml}`)
    return
  }

  const models = parseModelList(configContent)
  if (models.length === 0) {
    error('配置文件中未找到模型定义')
    return
  }

  const uniqueBases = [...new Set(models.map((m) => m.apiBase))]

  let proxyUrl: string | null = null
  for (const apiBase of uniqueBases) {
    const result = await checkUpstreamConnectivity(apiBase)
    if (result.status === 'unreachable') {
      await diagnoseMihomoAndReport()
      return
    }
    if (result.status === 'via-proxy') proxyUrl = result.proxyUrl
  }

  console.log()
  const proc = await checkProxyProcess(proxyName)
  if (!proc.alive || proc.port === null) {
    info(`正在启动代理 ${c.CYAN}${proxyName}${c.RESET}…`)
    const started = await withProxyEnv(proxyUrl, () => restartProxy(proxyName, proc.state))
    if (!started) return

    console.log()
    await testModels(started.port, models, testAll)
    return
  }

  console.log()
  await testModels(proc.port, models, testAll)
}

async function withProxyEnv<T>(proxyUrl: string | null, fn: () => Promise<T>): Promise<T> {
  if (proxyUrl) {
    process.env.HTTPS_PROXY = proxyUrl
    process.env.HTTP_PROXY = proxyUrl
    dim(`设置代理环境变量：${proxyUrl}`)
  }
  try {
    return await fn()
  } finally {
    if (proxyUrl) {
      delete process.env.HTTPS_PROXY
      delete process.env.HTTP_PROXY
    }
  }
}

async function checkUpstreamConnectivity(apiBase: string): Promise<ConnectivityResult> {
  const { host, port } = extractHostPort(apiBase)
  info(`检查上游连通性：${host}:${port}`)

  const directOk = await tcpConnect(host, port, 3000)
  if (directOk) {
    success('直连可达')
    return { status: 'direct' }
  }
  warn('直连不可达')

  const sysProxy = getSystemProxy()
  if (sysProxy) {
    dim(`尝试通过系统代理连接：${sysProxy}`)
    const proxyOk = await tcpConnectViaProxy(sysProxy, host, port, 5000)
    if (proxyOk) {
      success('通过系统代理可达')
      return { status: 'via-proxy', proxyUrl: sysProxy }
    }
    warn('通过系统代理也不可达')
  }

  const defaultProxies = ['http://127.0.0.1:7890', 'http://127.0.0.1:7891']
  for (const mp of defaultProxies) {
    dim(`尝试通过默认代理连接：${mp}`)
    const ok = await tcpConnectViaProxy(mp, host, port, 5000)
    if (ok) {
      success('通过默认代理可达')
      return { status: 'via-proxy', proxyUrl: mp }
    }
  }

  return { status: 'unreachable' }
}

async function diagnoseMihomoAndReport(): Promise<void> {
  console.log()
  info('检查 mihomo 状态…')
  const status = await checkMihomo()

  if (!status.running) {
    error('mihomo 未运行')
    dim('请启动 mihomo 或检查网络/VPN 连接')
    return
  }

  if (!status.hasNodes) {
    warn('mihomo 运行中但无可用节点')
    dim('请在 mihomo 中启用代理节点')
    return
  }

  warn('mihomo 运行中且有节点，但代理端口无法连通上游')
  dim('请检查节点是否可用，或尝试切换到其他节点')
}

async function checkProxyProcess(proxyName: string): Promise<{ alive: boolean; port: number | null; state: ProxyState }> {
  const state = readProxyState(proxyName)

  if (state.pid === null || !isPidAlive(state.pid)) {
    error('代理进程未运行')
    return { alive: false, port: null, state }
  }

  if (state.port === null) {
    error('代理端口未知')
    return { alive: false, port: null, state }
  }

  const portOpen = await tcpConnect('127.0.0.1', state.port, 400)
  if (!portOpen) {
    warn(`代理进程存活 (PID ${state.pid}) 但端口 ${state.port} 无响应`)
    return { alive: false, port: null, state }
  }

  proxyStatus(proxyName, state.port, state.pid, '代理运行中')
  return { alive: true, port: state.port, state }
}

type ApiPath = '/v1/messages' | '/v1/chat/completions' | '/v1/responses'
type FormatResult = { path: ApiPath; ok: true; input: number | string; output: number | string; text: string } | { path: ApiPath; ok: false; err: string }

const TEST_KEY = 'sk-doctor-test'
const chatBody = (model: string) => JSON.stringify({ model, max_tokens: 50, messages: [{ role: 'user', content: 'hi' }] })

const API_FORMATS: ReadonlyArray<{
  path: ApiPath
  headers: Record<string, string>
  buildBody: (model: string) => string
  parse: (data: Record<string, unknown>) => { input: number | string; output: number | string; text: string }
}> = [
  {
    path: '/v1/messages',
    headers: { 'Content-Type': 'application/json', 'x-api-key': TEST_KEY, 'anthropic-version': '2023-06-01' },
    buildBody: chatBody,
    parse: (d) => {
      const usage = d.usage as { input_tokens?: number; output_tokens?: number } | undefined
      const content = d.content as Array<{ text?: string }> | undefined
      return { input: usage?.input_tokens ?? '?', output: usage?.output_tokens ?? '?', text: content?.[0]?.text ?? '' }
    },
  },
  {
    path: '/v1/chat/completions',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TEST_KEY}` },
    buildBody: chatBody,
    parse: (d) => {
      const usage = d.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined
      const choices = d.choices as Array<{ message?: { content?: string } }> | undefined
      return { input: usage?.prompt_tokens ?? '?', output: usage?.completion_tokens ?? '?', text: choices?.[0]?.message?.content ?? '' }
    },
  },
  {
    path: '/v1/responses',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TEST_KEY}` },
    buildBody: (model) => JSON.stringify({ model, input: 'hi', max_output_tokens: 50 }),
    parse: (d) => {
      const usage = d.usage as { input_tokens?: number; output_tokens?: number } | undefined
      const outputText = d.output_text as string | undefined
      const output = d.output as Array<{ content?: Array<{ text?: string }> }> | undefined
      const text = outputText ?? output?.[0]?.content?.[0]?.text ?? ''
      return { input: usage?.input_tokens ?? '?', output: usage?.output_tokens ?? '?', text }
    },
  },
]

async function testOneFormat(port: number, modelName: string, fmt: (typeof API_FORMATS)[number]): Promise<FormatResult> {
  try {
    const resp = await httpRequest({
      method: 'POST',
      url: `http://127.0.0.1:${port}${fmt.path}`,
      headers: fmt.headers,
      body: fmt.buildBody(modelName),
      timeoutMs: 30000,
    })
    let data: Record<string, unknown> | undefined
    try {
      data = JSON.parse(resp.body) as Record<string, unknown>
    } catch {}

    if (data?.error) {
      const err = data.error as { message?: string }
      return { path: fmt.path, ok: false, err: err.message ?? `HTTP ${resp.statusCode}` }
    }

    if (resp.statusCode >= 200 && resp.statusCode < 300 && data) {
      return { path: fmt.path, ok: true, ...fmt.parse(data) }
    }
    return { path: fmt.path, ok: false, err: `HTTP ${resp.statusCode}` }
  } catch (e: unknown) {
    return { path: fmt.path, ok: false, err: e instanceof Error ? e.message : String(e) }
  }
}

function getFormatsForModel(modelName: string, testAll: boolean) {
  if (testAll) return API_FORMATS
  if (modelName.startsWith('gpt-')) return API_FORMATS.filter((f) => f.path === '/v1/chat/completions')
  return API_FORMATS.filter((f) => f.path === '/v1/messages')
}

async function testModels(port: number, models: Array<{ modelName: string; apiBase: string }>, testAll: boolean): Promise<'all-pass' | 'all-fail' | 'partial'> {
  info('测试模型对话…')

  const modelResults = await Promise.all(
    models.map(async (model) => {
      const formats = await Promise.all(getFormatsForModel(model.modelName, testAll).map((fmt) => testOneFormat(port, model.modelName, fmt)))
      return { modelName: model.modelName, formats }
    }),
  )

  let passCount = 0
  let failCount = 0

  for (const mr of modelResults) {
    const anyPass = mr.formats.some((f) => f.ok)
    if (anyPass) {
      success(mr.modelName)
      passCount++
    } else {
      error(mr.modelName)
      failCount++
    }

    for (const f of mr.formats) {
      if (f.ok) {
        const preview = f.text.length > 80 ? `${f.text.slice(0, 80)}…` : f.text
        dim(`  ${f.path.padEnd(22)} ${c.GREEN}✓${c.RESET} (↑${f.input} ↓${f.output} tokens) "${preview}"`)
      } else {
        dim(`  ${f.path.padEnd(22)} ${c.RED}✗${c.RESET} ${f.err}`)
      }
    }
  }

  console.log()
  if (failCount === 0) {
    success(`全部 ${passCount} 个模型测试通过`)
    return 'all-pass'
  }
  if (passCount === 0) {
    error(`全部 ${failCount} 个模型测试失败`)
    return 'all-fail'
  }
  warn(`${passCount} 个通过，${failCount} 个失败`)
  return 'partial'
}

async function restartProxy(proxyName: string, state: ProxyState): Promise<{ port: number } | null> {
  if (state.pid !== null && isPidAlive(state.pid)) {
    info(`停止代理 ${proxyName} (PID ${state.pid})`)
    const stopResult = await stopProxy(state.pid)
    if (stopResult.stopped) {
      writeProxyState(proxyName, { ...state, pid: null, startedAt: null })
      success(stopResult.forced ? '已强制停止 (SIGKILL)' : '已停止')
    } else {
      error('停止代理失败')
      return null
    }
  }

  const port = resolvePort(proxyName)
  if (!port) return null

  if (!isLiteLLMInstalled()) {
    error('共享 LiteLLM 未安装，请先执行 ccc proxy install-litellm')
    return null
  }

  try {
    const result = await startProxy(proxyName, port)
    dim(`PID ${result.pid}  日志 ${result.logFile}`)

    process.stdout.write(`${c.CYAN}◆${c.RESET} 等待代理就绪`)
    const portResult = await waitForPort(port, 10000, result.pid)
    console.log()

    if (portResult.ready) {
      proxyStatus(proxyName, port, result.pid, '代理已就绪')
      writeProxyState(proxyName, { pid: result.pid, port, startedAt: new Date().toISOString() })
      return { port }
    }

    if (portResult.exited) {
      warn(`${proxyName} 进程已退出`)
    } else {
      warn(`${proxyName} 未响应端口 ${port}（等待超时 10s）`)
    }
    showLogTail(result.logFile)
    writeProxyState(proxyName, { pid: result.pid, port, startedAt: new Date().toISOString() })
    return null
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : String(e))
    if (e instanceof ProxyStartError && e.logFile) showLogTail(e.logFile)
    return null
  }
}
