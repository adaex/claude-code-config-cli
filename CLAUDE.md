# claude-code-config-cli (ccc)

零运行时依赖的 TypeScript CLI，管理 Claude Code 本地代理生命周期。

## 项目结构

```
src/
  types.ts              所有共享类型定义
  cli.ts                入口：参数解析 + 命令分发（Map<string, CommandHandler>）
  commands/
    index.ts            命令注册表
    proxy.ts            ccc proxy start|stop|status|install [名称]
    help.ts             ccc help
  lib/
    paths.ts            getProxyPaths / listProxyNames / loadProxyDefinition / ensureProxyDirs
    state.ts            readProxyState / writeProxyState / isPidAlive
    proxy.ts            ProxyStartError / startProxy / stopProxy / waitForPort
    health.ts           ensureProxy（自动重启）
    logger.ts           颜色常量 c + info / warn / error / success / dim / dryRun
proxies/
  coco/
    proxy.json          代理元数据（名称、默认端口）
    start.sh            后台启动脚本（接受 PORT 环境变量）
    install.sh          安装脚本（创建 venv、安装依赖、复制配置）
    config.yaml         LiteLLM 代理配置
tests/
  paths.test.ts         getProxyPaths / listProxyNames
  state.test.ts         isPidAlive
dist/                   tsup 构建输出（gitignored）
  cli.js                单文件 CJS bundle，含 shebang
```

## 运行时目录

`~/.ccc/proxies/<名称>/`，结构：

```
~/.ccc/proxies/coco/
  state.json            # { pid, port, startedAt }
  config.yaml           # install 时从包内复制
  .venv/                # install 时创建的 Python 虚拟环境
  logs/
    <时间戳>.log
```

## 命令

```bash
ccc proxy install [名称]   # 安装代理依赖（默认 coco）
ccc proxy start [名称]     # 启动代理
ccc proxy stop [名称]      # 停止代理
ccc proxy status [名称]    # 查看状态（已停止则自动重启）
ccc help                   # 显示帮助信息
ccc --version              # 显示版本号
```

## 代理管理流程

### install
1. 创建 `~/.ccc/proxies/<名称>/` 和 `logs/` 目录
2. 从包内 `proxies/<名称>/` 复制 `config.yaml`
3. 执行 `install.sh`（创建 .venv、安装 litellm 等依赖）

### start
1. 检查是否已安装（.venv 和 config.yaml 存在）
2. 若已运行则显示状态并退出
3. `spawn('bash', [start.sh], { detached:true })` + `child.unref()`
4. 写入 `state.json`（PID、端口、启动时间）
5. `net.createConnection` 轮询端口，最多 10s

### stop
1. 读取 `state.json` 获取 PID
2. SIGTERM → 3×500ms 轮询 → SIGKILL → 3×200ms 轮询
3. 更新 `state.json`

### status
1. 读取 `state.json`，检查 PID 存活
2. 存活：显示状态行 `✓ coco · http://127.0.0.1:15432 · 代理运行中 (PID xxx)`
3. 死亡：自动重启（同 start 流程）

## 配置切换

配置切换通过 zsh shell 函数实现（不在 ccc 管理范围内），每个函数导出环境变量后启动 `claude`。详见 `~/.zshrc`。

## 开发说明

- TypeScript strict 模式，tsup 构建为单文件 CJS
- `npm run build` 构建到 `dist/`，`npm run dev` 监听模式
- `npm run check` 运行 typecheck + lint + test
- `npm link` 安装全局命令 `ccc`（指向 `dist/cli.js`）
- 零运行时依赖，全部使用 Node.js 内置模块
- 所有提示文案和代码注释均为中文

## 工具链

- **TypeScript** — strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
- **tsup** — esbuild 打包，CJS 输出，target node18
- **Biome** — lint + format 一体化，配置见 `biome.json`
- **node:test + node:assert** — Node 内置测试，零依赖，`node --test tests/*.test.ts`

## 发布流程

每次发布必须按顺序完成以下步骤：

1. 更新 `CHANGELOG.md`（在顶部新增版本条目）
2. 更新 `package.json` 中的 `version` 字段
3. 提交所有变更（代码 + changelog + version）
4. `git push origin main`
5. `npm publish`
