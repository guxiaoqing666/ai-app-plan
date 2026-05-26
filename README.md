# 走走AI Citywalk

把周末灵感变成一条能出门的路线。这个仓库是首版免费优先 MVP：纯静态 H5/PWA，不接真实 AI、不接支付，适合直接部署到 Cloudflare Pages 验证流量和反馈。

## 已实现

- 移动端首页、筛选器、路线列表、路线详情。
- 15 条预生成 Citywalk 路线，覆盖上海、杭州、成都、重庆、广州。
- 本地路线推荐逻辑：按城市、时长、预算、同行、偏好、步行强度筛选。
- 复制完整路线、复制小红书文案、系统分享。
- 反馈/高级版预约表单，静态版先保存到浏览器 `localStorage`。
- PWA manifest 和 service worker，可添加到手机桌面并缓存离线资源。
- Cloudflare Pages 静态发布文档和 30 条内容选题。

## 本地运行

```bash
npm.cmd start
```

如果不在 PowerShell 里运行，也可以用：

```bash
npm run start
```

然后打开：

```text
http://localhost:4173
```

## 检查

```bash
npm run check
```

这个命令会检查 JS 语法，并验证路线数据数量、必填字段和重复 ID。

## 部署到 Cloudflare Pages

最简单设置：

- Framework preset: `None`
- Build command: 留空
- Build output directory: `/`

详细步骤见 [docs/deployment.md](docs/deployment.md)。

## 下一步

1. 把反馈表单替换成飞书、腾讯文档或 Google Form。
2. 买域名并绑定 Cloudflare Pages。
3. 发布 30 条小红书/抖音内容，主页链接指向站点。
4. 达到数据阈值后，再接 Cloudflare Workers 或 Vercel API 调 AI 模型。
