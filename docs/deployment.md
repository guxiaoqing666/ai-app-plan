# Cloudflare Pages 发布步骤

## 方案 A：连接 GitHub 仓库

1. 把项目推到 GitHub。
2. 打开 Cloudflare Dashboard。
3. 进入 `Workers & Pages`。
4. 选择 `Create application` -> `Pages` -> `Connect to Git`。
5. 选择仓库。
6. 构建设置：
   - Framework preset: `None`
   - Build command: 留空
   - Build output directory: `/`
7. 点击部署。
8. 部署完成后，会得到一个 `*.pages.dev` 免费域名。

## 方案 B：直接上传

1. 打开 Cloudflare Pages。
2. 选择 `Upload assets`。
3. 上传项目根目录里的静态文件和文件夹。
4. 确认能访问 `index.html`。

## 正式上线前检查

- 手机访问首页和路线详情。
- 微信内置浏览器访问。
- iPhone Safari 访问。
- 安卓 Chrome 访问。
- 点击复制路线、复制小红书文案、反馈表单。
- 测试断网后刷新，确认 PWA 缓存可用。

## 反馈表单替换建议

当前静态版会把反馈保存在用户自己的浏览器里。正式发流量前，建议替换成外部表单：

- 飞书表单：适合国内团队管理。
- 腾讯文档表单：适合微信生态。
- Google Form：适合海外用户。

替换方式：

1. 创建外部表单。
2. 在页面里把反馈按钮改成跳转外部表单。
3. 或者保留当前表单，同时增加一个“打开反馈表单”按钮。

## 后端升级路径

验证有用户后再升级，不要一开始就接 AI：

1. Cloudflare Workers：接收用户输入，调用 AI API，返回 JSON。
2. Supabase：保存生成记录、反馈、等待名单。
3. 简单限流：按 IP 或设备指纹限制每日生成次数。
4. 付费测试：先做次数包，不先做订阅。
