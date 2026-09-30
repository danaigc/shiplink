# ShipLink

ShipLink 是用于外链研究、发布和复检的 Codex 工作空间。项目通过仓库规则、两个技能和本地事件记录组织工作。

## 技能

| 技能 | 用途 |
| --- | --- |
| `crawl-backlinks` | 创建网站任务，发现和验证外链机会，评分、复检并保存证据 |
| `publish-backlinks` | 在明确调用和当前授权下发布已批准的机会，验证结果并保留证据 |

两个技能位于 `.agents/skills/`，浏览器操作依赖已配置的 Ego Lite 和 `ego-browser` 技能。支付脚本另外需要 Node.js、Playwright 和 Chromium；只在已授权的支付流程中使用。

## 使用

克隆仓库，在 Codex 中打开，并阅读 [AGENTS.md](AGENTS.md)：

```sh
git clone https://github.com/danaigc/shiplink.git
cd shiplink
```

示例指令：

```text
使用 $crawl-backlinks 为 example.com 创建外链任务，任务名为 example-com，研究英文产品目录机会。
```

审核机会后，明确指定项目、候选机会、发布内容、账号及费用范围，并要求记录完整批准快照，再调用 `publish-backlinks`。发现机会、保存账号或历史批准都不等于当前发布授权。

## 本地数据

每个网站任务使用仓库根目录下的独立文件夹。创建前必须添加精确的 `/<slug>/` 忽略规则，并验证该路径没有被 Git 跟踪或暂存。

任务包含 `PROJECT.md`、追加式 `opportunities.jsonl` 和 `publications.jsonl`、`NOTES.md` 与 `private/`。需要保存证据时才创建 `artifacts/`。

网站任务、`knowledge.local/`、`BUGS.local.md`、`*.local.*`、凭据和运行证据均保留在本地。真实 Google 账号从项目私有配置或 `knowledge.local/shared-accounts.local.json` 读取；仓库不提供默认账号。账号默认值不能替代授权。

这些本地数据可能包含明文敏感信息。Git 忽略规则不提供加密；不要将任务数据或凭据提交到公开仓库。公开仓库只包含项目规则、说明和可复用技能。
