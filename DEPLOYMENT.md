# 《周庸诗集》数字诗馆 - 部署与域名配置指南

本文档指导如何将《周庸诗集》以 **100% 纯静态、零服务器费用、国内免翻墙极速直连、泰国及全球秒开** 的标准进行双通道托管部署。

---

## 🚀 架构总览

- **代码仓库**：GitHub（建议使用与个人实名信息隔离的专用/非实名账号）
- **国内+全球加速主机**：**Cloudflare Pages**（全球 Anycast CDN 边缘加速节点，中国大陆与泰国直连友好）
- **独立免费匿名域名**：Cloudflare 官方免费分配的 `https://<自定义英文名>.pages.dev`（**强烈推荐**：免去域名购买与 Whois 注册实名风险，完全与个人现有域名隔离）
- **备用静态通道**：**GitHub Pages**（如 `https://<账号名>.github.io/zhouyong-poetry/`）
- **运行维护费用**：**￥0 / 永久免费**

---

## 🔒 政治与隐私安全隔离原则（重要）

鉴于周庸先生部分诗作触及敏感现实与锐利针砭：
1. **切勿使用个人已实名、已备案或包含个人姓名/工作室特征的主域名**（如包含个人公司或品牌的顶级域），避免域名实名 Whois 记录或 DNS 被反向关联到真实身份。
2. **首选方案：直接使用 Cloudflare Pages 免费分配的 `.pages.dev` 二级域名**（例如 `https://zy-poetry.pages.dev` 或 `https://shiguan-zy.pages.dev`）：
   - 全程由 Cloudflare Anycast CDN 代理，隐藏源站与个人信息；
   - 自带免费全球 HTTPS 证书；
   - 零注册成本、无个人实名信息泄漏风险。

---

## 🛠️ 第一步：推送到 GitHub 仓库

1. 建议使用一个与工作/实名脱钩的 GitHub 账号，新建仓库 `zhouyong-poetry`。
2. 在本地项目根目录下提交并推送：
   ```bash
   cd "g:\My Drive\OneDrive\Kelvin_Documents\Antigravity_V2\zhouyong-poetry"
   git init
   git add .
   git commit -m "feat: 发布《周庸诗集》数字诗馆"
   git branch -M main
   git remote add origin https://github.com/<您的GitHub账号>/zhouyong-poetry.git
   git push -u origin main
   ```

---

## 🌐 第二步：配置 Cloudflare Pages（极速匿名通道）

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)；
2. 在左侧菜单点击 **Workers & Pages** -> **Create application** -> 选择 **Pages** -> **Connect to Git**；
3. 授权连接 GitHub 并选择 `zhouyong-poetry` 仓库；
4. **项目命名（Project Name）**：可自定一个清雅且不含个人隐私的名字，例如 `zy-anthology` 或 `shiguan-zy`；
5. **构建设置（Build Settings）**：
   - **Framework preset**：选择 **None**
   - **Build command（构建命令）**：留空
   - **Build output directory（输出目录）**：留空或填写 `/`
6. 点击 **Save and Deploy**，系统自动完成部署，生成 `https://<项目名>.pages.dev` 访问链接。

---

## 🏷️ 第三步：访问域名方案（推荐直接使用官方 pages.dev，无需买域名）

1. **方案 A（最安全、零风险，强烈推荐）**：
   - 直接使用 Cloudflare 免费生成的 `https://<项目名>.pages.dev`（如 `https://zy-poetry.pages.dev`）。
   - **核心优势**：无需实名注册任何域名，没有 Whois 隐私泄漏风险，自带全球 HTTPS 证书，全球（含泰国和中国大陆大部分网络）均可直开。

2. **方案 B（若需要独立个性化域名）**：
   - 建议在境外注册商（如 Cloudflare Registrar、Namecheap 等开启 Whois 隐私保护）单独新购一个全新、不含任何个人姓名或既往品牌信息的独立中性域名（例如 `shiyun-xian.xyz` 等）。
   - 在 Cloudflare Pages 项目仪表盘的 **Custom domains** 绑定该独立域名。
   - ⚠️ **绝对不要** 绑定与国内有任何备案或实名绑定的原有主域名。

---

## 📦 第四步：启用 GitHub Pages（双保险备用通道）

1. 进入 GitHub 仓库页面的 **Settings** -> **Pages**；
2. 在 **Build and deployment** 下：
   - **Source**：选择 `Deploy from a branch`
   - **Branch**：选择 `main` 分支，目录选择 `/ (root)`
3. 点击 **Save**，即可获得备用访问地址：`https://<用户名>.github.io/zhouyong-poetry/`。

---

## ✍️ 日常诗作内容维护说明

后续周庸先生提供新的诗稿后，您有以下两种极其轻便的维护路径：

### 途径 A：让 AI 助手直接录入
将诗篇文字直接发给 AI 助手，它会自动规范格式并写入 `data/poems.json`。

### 途径 B：运行本地 Python 批量导入脚本
1. 将老先生的诗稿粘贴到 `data/sample_input_poems.txt`（或任意 `.txt` 文本中）；
2. 打开终端运行：
   ```bash
   python scripts/import_poems.py
   ```
3. 脚本会自动给新诗分配编号（如 `zy-012`、`zy-013`）并合并至 `poems.json`；
4. 运行 `git commit -am "add: 新增诗作"` 和 `git push`，Cloudflare Pages 会在 10 秒内全自动拉取更新并全球生效。
