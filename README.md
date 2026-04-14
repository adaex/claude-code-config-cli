# ccc — Claude Code Config CLI

Claude Code 本地代理生命周期管理工具。

## 安装

```bash
npm install -g claude-code-config-cli
```

或从源码安装：

```bash
git clone git@github.com:adaex/claude-code-config-cli.git
cd claude-code-config-cli
npm link
```

## 使用

```bash
# 安装代理依赖（首次使用需执行）
ccc proxy install coco

# 启动代理
ccc proxy start coco

# 查看代理状态（已停止则自动重启）
ccc proxy status coco

# 停止代理
ccc proxy stop coco

# 显示帮助
ccc help

# 显示版本
ccc --version
```

代理名称可省略，默认为 `coco`。

## 配置切换

配置切换通过 zsh shell 函数实现，每个函数导出对应的环境变量后启动 `claude`：

```zsh
cc-seed() {
  export ANTHROPIC_AUTH_TOKEN="..."
  export ANTHROPIC_BASE_URL="https://..."
  export ANTHROPIC_MODEL="doubao-seed-2.0-code"
  # ...
  command claude --permission-mode acceptEdits "$@"
}

cc-new() {
  export ANTHROPIC_BASE_URL="http://127.0.0.1:15432"
  # ...
  ccc proxy status coco  # 自动检查/重启代理
  command claude --model opus --permission-mode acceptEdits "$@"
}

claude() {
  [[ "$PWD" = "$HOME" ]] && cd ~/space || true
  cc-new "$@"
}
```

这种方式的优势：
- **Per-session 生效**：环境变量只在当前 shell 生效，多个 claude 进程互不干扰
- **不修改全局配置**：`~/.claude/settings.json` 保持最简，只含通用设置
- **即时切换**：不同终端窗口可同时使用不同配置

## 运行时目录

```
~/.ccc/proxies/coco/
  state.json       # 代理状态（PID、端口、启动时间）
  config.yaml      # LiteLLM 配置（install 时复制）
  .venv/           # Python 虚拟环境（install 时创建）
  logs/            # 代理日志
```

## 开发

```bash
npm run check     # typecheck + lint + test
npm run build     # 构建到 dist/
npm run dev       # 监听模式
```

## License

MIT
