# 测试站部署记录 · wzsjtest.gor.dpdns.org

- **部署时间**：2026-10-21 13:25 UTC（21:25 本地）
- **访问地址**：<https://wzsjtest.gor.dpdns.org>
- **Worker 名称**：`wzsj-atlas-test`
- **账号 ID**：`61c7ef5eb1a2fac96a35494899b20481`
- **自定义域名**：`wzsjtest.gor.dpdns.org`（zone `gor.dpdns.org`，ID `82bb3f8a56bb446e82e3d62f62b7c401`）
- **证书**：已由 Cloudflare 自动签发（`cert_id` `c0839219-0b39-4c3f-947c-0906efa22b00`）
- **部署方式**：Cloudflare MCP（`cloudflare.execute`）

## 为什么不是完整资源上传

Cloudflare MCP 的 `cloudflare.execute` 有两项硬限制：

1. 静态资源上传接口 `POST /accounts/{id}/workers/assets/upload` 必须携带 `assets-upload-session` 返回的 `cfwau_...` JWT 作为 `Authorization` 头，但 `cloudflare.request()` 不支持自定义请求头；
2. 执行沙箱的 `fetch` 被限制访问 `api.workers.cloudflare.com`（返回 `Forbidden: requests to api.workers.cloudflare.com are not allowed`），无法绕过。

因此 MCP 无法上传 26.5 MB 的资源。本次采用**代理式测试部署**：

- `wzsj-atlas-test` 不含静态资源；
- 通过 **service binding** `PROD -> wzsj-atlas` 复用生产 Worker 的资源；
- 仅把本次改动的两个文件内联覆盖：
  - `/sw.js`（新缓存版本 `wz-guide-v5.11.19-20261021-cleanup`）
  - `/images/manifest.json`（清理后的 727 条预缓存清单）

这样测试站能验证清理后的 Service Worker 行为与预缓存清单，同时不触碰生产域名
`wzsj.gor.dpdns.org`（已验证生产的 `sw.js` 仍是 `...-desktop-thumb`，manifest 仍是 1364 条）。

## 验证结果

| 检查项 | 结果 |
|---|---|
| 首页 | 200，1646 B，`text/html` |
| `/sw.js` | 200，缓存版本为 `...-cleanup` |
| `/images/manifest.json` | 200，727 条 |
| 生产 `/sw.js` 与 manifest | 未变化（旧版本 / 1364 条） |
| 全站资源遍历 | 861 个 URL，首轮 858 个 200；3 个瞬时错误重试后全部 200 |
| 图片示例 | `tacz_rpg7.png`、`textures/atlas.png`、`bg_npcs.jpg` 等均 200 |
| 未匹配路径 | 500 `error code: 1101`，与生产环境行为一致（原有问题，非本次引入） |

## 已知差异

- 被清理的 646 张图片仍存在于生产 Worker 的资源库中，直接访问 URL 仍会 200；
  只是新的 `images/manifest.json` 不再引用它们，前端也不会请求。
- `/assets/` 目录（760 个文件、21.31 MB 的构建产物副本，无任何代码引用）仍在
  生产资源中，本次未处理。
- 测试站所有非覆盖请求都经 service binding 转发到生产 Worker，因此资源内容与
  生产完全一致。

## 重新部署

本次内联的是 `wzsj-20261021/sw.js` 和 `wzsj-20261021/images/manifest.json` 的当前内容。
修改这两个文件后，执行：

```bash
python -I .deploy/deploy_proxy.py
```

脚本会重新读取这两个文件并覆盖 Worker 版本；域名绑定已存在，无需重复创建。

## 移除测试站

```bash
# 先解绑域名
curl -X DELETE "https://api.cloudflare.com/client/v4/accounts/<account_id>/workers/domains/<domain_id>" \
  -H "Authorization: Bearer <api_token>"
# 再删除 Worker
curl -X DELETE "https://api.cloudflare.com/client/v4/accounts/<account_id>/workers/scripts/wzsj-atlas-test" \
  -H "Authorization: Bearer <api_token>"
```

域名记录 ID：`86f2a2a07a0cd2e8d57d9e884f108c9c074120cc`。

## 相关文件

- `.deploy/deploy_proxy.py` —— 本次部署脚本
- `.deploy/mcp_client.py` —— 直连 code-gateway MCP 的客户端（用于避免大段内容经模型转录）
- `.deploy/manifest.json` —— 完整静态资源清单（含 hash，未上传）
