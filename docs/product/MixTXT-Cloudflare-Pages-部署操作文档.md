# MixTXT 部署到 Cloudflare Pages 操作文档

## 一、文档目标

这份文档面向当前仓库 `mixtxt`，说明如何把现有项目部署到 Cloudflare Pages，并完成首发、域名绑定、上线验证和日常发布。

当前仓库的部署方式已经比较明确：

- 前端框架：Astro
- 输出模式：静态站点
- 构建命令：`npm run build`
- 构建产物目录：`dist`
- 搜索索引：构建后自动执行 `pagefind --site dist`
- 推荐部署平台：Cloudflare Pages

这意味着当前项目不需要先接 Cloudflare Workers，也不需要额外的服务端适配器，直接按静态站方式部署即可。

## 二、当前仓库的部署关键信息

在开始前，先确认这几个文件中的关键信息：

### 2.1 `package.json`

当前构建脚本是：

```json
{
  "scripts": {
    "build": "npm run validate:content && astro build && pagefind --site dist"
  }
}
```

含义是：

1. 先执行内容校验。
2. 再由 Astro 生成静态页面。
3. 最后由 Pagefind 为 `dist/` 生成站内搜索索引。

只要 Cloudflare Pages 成功执行 `npm run build`，最终发布目录就会是 `dist/`。

### 2.2 `astro.config.mjs`

当前配置：

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://mixtxt.example.com",
  output: "static"
});
```

这里的 `site` 现在还是示例地址。正式上线前，必须改成你的真实线上域名。

### 2.3 `src/data/site.json`

当前配置：

```json
{
  "title": "MixTXT",
  "description": "用 AI 改编经典小说的个人创作站。",
  "author": "matrix",
  "defaultLanguage": "zh-CN",
  "baseUrl": "https://mixtxt.example.com",
  "github": "https://github.com/a1pha3/mixtxt",
  "copyright": "本站只公开公版作品或已获得授权的改编内容。"
}
```

这里的 `baseUrl` 也还是示例地址。它要和 `astro.config.mjs` 里的 `site` 保持一致，否则 canonical、RSS、sitemap 链接会指向错误域名。

## 三、部署前准备

正式接入 Cloudflare Pages 前，先完成下面几个准备项。

### 3.1 准备账号

你需要有这几个账号或权限：

- GitHub 账号
- Cloudflare 账号
- 仓库管理员权限
- 如果要绑定自定义域名，还需要域名的 DNS 管理权限

### 3.2 确保代码已推送到 GitHub

Cloudflare Pages 最常见的工作流是直接连接 Git 仓库自动构建。因此部署前要先确认：

- 当前仓库已经在 GitHub 上
- 默认分支已经准备好，例如 `main`
- 你本地构建通过后再推送

建议先在本地执行：

```bash
npm install
npm run build
```

当前仓库我已经按现状验证过，`npm run build` 可以成功执行。

### 3.3 先改正式域名配置

如果你已经确定线上域名，例如：

```text
https://mixtxt.com
```

或者：

```text
https://www.mixtxt.com
```

那就先同步修改下面两个地方：

1. `astro.config.mjs` 的 `site`
2. `src/data/site.json` 的 `baseUrl`

示例：

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://mixtxt.com",
  output: "static"
});
```

```json
{
  "title": "MixTXT",
  "description": "用 AI 改编经典小说的个人创作站。",
  "author": "matrix",
  "defaultLanguage": "zh-CN",
  "baseUrl": "https://mixtxt.com",
  "github": "https://github.com/你的账号/mixtxt",
  "copyright": "本站只公开公版作品或已获得授权的改编内容。"
}
```

如果你暂时还没有自定义域名，也可以先保留示例值完成测试部署，等 Cloudflare 分配了 `*.pages.dev` 域名后，再把这两个字段改成正式域名并重新部署一次。

## 四、首次部署到 Cloudflare Pages

下面是最稳妥的首发流程。

### 4.1 登录 Cloudflare

打开 Cloudflare 控制台：

```text
https://dash.cloudflare.com/
```

然后进入：

```text
Workers & Pages
```

接着点击：

```text
Create application
```

再选择：

```text
Pages
```

### 4.2 连接 GitHub 仓库

在创建 Pages 项目时，选择：

```text
Connect to Git
```

然后：

1. 授权 Cloudflare 访问你的 GitHub。
2. 选择当前仓库 `mixtxt`。
3. 选择要自动部署的分支，通常是 `main`。

建议：

- 生产环境绑定 `main`
- 如果后续你想保留预览环境，可以让其他分支自动生成 Preview 部署

### 4.3 填写构建参数

当前仓库建议直接使用下面的配置：

```text
Framework preset: Astro
Build command: npm run build
Build output directory: dist
Root directory: /
Node.js version: 当前 LTS
```

如果 Cloudflare 界面里没有自动识别到 Astro，也没关系，手动填写上面这组值即可。

#### 推荐填写说明

- `Framework preset`：选 Astro，主要是为了使用 Cloudflare 预设的常见构建环境。
- `Build command`：必须是 `npm run build`，因为你这个仓库不只是 `astro build`，还要跑内容校验和 Pagefind。
- `Build output directory`：必须是 `dist`，这是 Astro 的静态产物目录，也是 Pagefind 最终写索引的目录。
- `Root directory`：当前仓库就是站点根目录，所以填 `/`。
- `Node.js version`：建议选择当前 LTS，避免平台默认版本过旧。

### 4.4 环境变量建议

这个仓库当前不是强依赖环境变量的项目，所以首次部署时可以先不配业务变量。

如果 Cloudflare 面板支持设置构建环境变量，建议至少补一个：

```text
NODE_VERSION=22
```

如果你后续确认 Cloudflare 当前默认 Node 版本已经满足要求，也可以不显式设置。

注意：

- 当前项目没有必须配置的 API Key。
- 这是静态站，不依赖数据库连接串。
- 站内搜索是构建期生成，不需要在线服务。

### 4.5 发起首次构建

点击保存并部署后，Cloudflare 会执行大致类似下面的流程：

```bash
npm install
npm run build
```

只要你在日志里看到这些关键点，就说明流程正常：

```text
Content validation passed.
[build] output: "static"
[build] Complete!
Running Pagefind ...
Output: "dist/pagefind"
```

首次构建成功后，Cloudflare 会给你一个默认预览地址，通常类似：

```text
https://你的项目名.pages.dev
```

这时你就已经完成第一次上线。

## 五、部署成功后的第一轮检查

第一次部署成功后，不要立刻结束，先按下面顺序验收。

### 5.1 页面可访问性检查

至少检查这些页面：

- 首页 `/`
- 书籍列表页 `/books/`
- 书籍详情页 `/books/sanguo-scifi/`
- 章节页 `/books/sanguo-scifi/prologue/`
- 搜索页 `/search/`
- 关于页 `/about/`
- 版本页 `/releases/`
- `rss.xml`
- `sitemap.xml`

### 5.2 搜索是否正常

这个仓库用了 Pagefind，搜索依赖构建产物里的 `dist/pagefind/`。

如果部署成功但搜索没有结果，优先检查：

1. 构建日志里是否执行了 `Running Pagefind`
2. 最终站点里是否能访问 `/pagefind/` 下的资源
3. 页面里是否保留了 `data-pagefind-body` 标记

当前仓库本地构建日志显示：

- 页面构建成功
- Pagefind 成功索引 2 个页面

说明部署到 Pages 后，这部分理论上可以直接工作。

### 5.3 RSS 与 sitemap 是否使用了正确域名

如果你上线后发现：

- `rss.xml` 里的链接还是 `mixtxt.example.com`
- `sitemap.xml` 里的地址不是正式域名

那通常说明这两个字段还没改：

- `astro.config.mjs` 里的 `site`
- `src/data/site.json` 里的 `baseUrl`

改完后重新 push 一次，Cloudflare 会自动重新部署。

### 5.4 移动端检查

至少检查三个宽度：

- 桌面端
- 平板
- 手机

重点看：

- 导航是否挤压布局
- 章节页正文是否可读
- 上一章 / 下一章是否可点击
- 搜索弹层或搜索区域是否可用

## 六、绑定自定义域名

如果你不想长期使用 `pages.dev`，下一步就是绑定正式域名。

### 6.1 在 Pages 项目里添加自定义域

进入 Cloudflare Pages 项目后，找到：

```text
Custom domains
```

点击：

```text
Set up a custom domain
```

然后输入你的域名，例如：

```text
mixtxt.com
```

或者：

```text
www.mixtxt.com
```

### 6.2 如果域名就在 Cloudflare 管理

如果域名 DNS 本来就在 Cloudflare 里，流程通常最简单：

1. 选择域名
2. 确认接入
3. 等待 Cloudflare 自动写入 DNS
4. 等待证书签发

一般不需要你手动改太多。

### 6.3 如果域名不在 Cloudflare 管理

Cloudflare 会提示你需要添加的 DNS 记录。按面板提示去原域名服务商后台补上即可。

常见情况是添加一条 `CNAME` 记录，把子域名指向 Cloudflare 提供的目标地址。

### 6.4 域名生效后要做的代码同步

域名生效后，不要忘了把下面两处更新为正式地址：

- `astro.config.mjs` 的 `site`
- `src/data/site.json` 的 `baseUrl`

例如：

```text
https://mixtxt.com
```

然后重新提交并推送：

```bash
git add astro.config.mjs src/data/site.json
git commit -m "chore: update production site url"
git push origin main
```

Cloudflare Pages 会自动重新构建，这样 RSS、sitemap、canonical 才会一起切到正式域名。

## 七、推荐的日常发布流程

这个项目是典型的内容站，推荐用下面的节奏发布。

### 7.1 本地先验证

每次内容或页面改动后，先在本地执行：

```bash
npm install
npm run build
```

这样可以提前发现：

- 内容 frontmatter 不合法
- Astro 构建失败
- Pagefind 索引生成失败

### 7.2 再推送到 GitHub

本地构建通过后再 push：

```bash
git add .
git commit -m "feat: publish new content"
git push origin main
```

推送成功后，Cloudflare Pages 会自动开始新一轮部署。

### 7.3 上线后回归检查

每次发布后至少看三件事：

1. 首页是否正常打开
2. 新章节是否可访问
3. 搜索是否还能搜到内容

如果这是一次涉及域名、SEO、路由或阅读器样式的更新，建议再检查：

- `rss.xml`
- `sitemap.xml`
- 手机端章节页

## 八、常见部署问题与处理方法

### 8.1 构建日志提示 `Content validation` 失败

原因通常不是 Cloudflare 配置错了，而是内容数据没有通过仓库内的校验脚本。

处理步骤：

1. 在本地执行 `npm run build`
2. 看终端里具体是哪一个内容文件报错
3. 修正内容字段后重新提交

常见问题包括：

- `slug` 重复
- `chapterNo` 格式不合法
- 引用的 `book` 不存在
- `baseUrl` 不是完整 URL

### 8.2 构建成功，但搜索页没有内容

优先检查：

1. `pagefind` 是否执行成功
2. 页面里是否存在 `data-pagefind-body`
3. 你是不是只在本地 `astro dev` 下测试了搜索

要注意：

- 当前项目的完整搜索索引是在 `npm run build` 后才生成的
- 只跑开发模式时，Pagefind 资源可能不完整，这是正常现象

### 8.3 页面上线了，但链接还是示例域名

这通常是配置没同步：

- `astro.config.mjs` 的 `site`
- `src/data/site.json` 的 `baseUrl`

修正后重新部署即可。

### 8.4 Cloudflare 构建环境 Node 版本过旧

如果日志里出现依赖安装失败或 Astro 运行环境不满足，处理方式是：

1. 在 Pages 项目设置里指定 Node.js LTS
2. 必要时补充环境变量 `NODE_VERSION`

建议优先使用当前 LTS，而不是过老版本。

### 8.5 推送后没有自动部署

优先排查：

1. Pages 项目是否连对了仓库
2. 生产分支是不是 `main`
3. 这次提交是不是推到了正确分支
4. GitHub 授权是否失效

### 8.6 部署成功，但读者看到旧页面

常见原因：

- 浏览器缓存
- CDN 缓存
- HTML 没有重新构建成功

处理建议：

1. 先确认 Cloudflare 最新部署是否成功
2. 用无痕窗口访问
3. 刷新具体页面
4. 如果后续你加了 `public/_headers`，避免给 HTML 配过长缓存

## 九、回滚策略

Cloudflare Pages 的优势之一，是新构建失败时通常不会覆盖当前线上成功版本。

如果你已经发布了错误内容，推荐这样回滚：

### 9.1 用 Git 回滚代码

如果只是最近一次提交有问题，可以在本地修复后重新 push，或者回退到上一个稳定提交再推送。

例如：

```bash
git log --oneline
git revert <commit-id>
git push origin main
```

不建议直接做破坏性回退，优先使用可审计的 `git revert`。

### 9.2 用 Cloudflare 历史部署确认状态

在 Pages 项目的 Deployments 页面里，你可以看到历史部署记录。回滚时建议同时确认：

- 哪个版本最后一次是健康的
- 出问题的是哪次提交
- 回滚后线上地址是否恢复正常

## 十、推荐的上线清单

每次正式发布前，按下面这份清单过一遍最稳。

### 10.1 部署前

- `npm install` 已完成
- `npm run build` 本地通过
- `astro.config.mjs` 的 `site` 已改成正式域名
- `src/data/site.json` 的 `baseUrl` 已改成正式域名
- 代码已提交并推送到正确分支

### 10.2 Cloudflare 配置

- Pages 项目已连接正确仓库
- 生产分支为 `main`
- Build command 为 `npm run build`
- Output directory 为 `dist`
- Node.js 使用当前 LTS

### 10.3 上线后

- 首页正常
- 书页正常
- 章节页正常
- 搜索正常
- `rss.xml` 正常
- `sitemap.xml` 正常
- 自定义域名正常
- HTTPS 正常

## 十一、当前仓库可直接使用的最终配置

如果你现在就要把这份仓库接到 Cloudflare Pages，直接用下面这组参数：

```text
Platform: Cloudflare Pages
Framework preset: Astro
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: /
Node.js version: LTS
```

部署前唯一必须确认的代码项是：

```text
astro.config.mjs -> site
src/data/site.json -> baseUrl
```

这两个值要改成你的真实线上地址。

## 十二、后续可补强项

当前项目已经能正常部署，但如果你后面想把发布链路做得更稳，可以继续补这些项：

- 增加 `public/_headers`，细化 HTML、静态资源、Pagefind 资源缓存策略
- 增加 GitHub Actions，在合并到 `main` 前先自动执行 `npm run build`
- 增加 `public/robots.txt` 的正式生产配置
- 为自定义域名补充站点图标、分享图和 SEO 校验

如果你愿意，我下一步可以继续直接帮你补两项内容：

1. 把文档里提到的正式域名配置改进仓库
2. 顺手再给你生成一份 `public/_headers` 的 Cloudflare 缓存配置
