# 汇聊 (HuiLiao)

<div align="center">
  <img src="assets/icons/icon-128.png" alt="汇聊图标" width="128" height="128">
  
  <p><strong>AI 聊天记录管理助手</strong></p>
  <p>一款强大的浏览器插件，为DeepSeek、豆包、Kimi等提供聊天记录管理功能；可设置文件夹、智能搜索等功能</p>

[![Chrome](https://img.shields.io/badge/Chrome-支持-brightgreen?logo=google-chrome)](https://www.google.com/chrome/)
[![Firefox](https://img.shields.io/badge/Firefox-支持-brightgreen?logo=firefox)](https://www.mozilla.org/firefox/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## ✨ 功能特性

### 📁 文件夹管理

- 创建、重命名、删除文件夹
- 支持多级嵌套文件夹结构
- 自定义文件夹颜色
- 文件夹折叠/展开

### 💬 对话管理

- 拖拽对话到文件夹进行归类
- 对话置顶功能
- 快速跳转到对话页面
- 右键菜单快速操作

### 🔍 搜索功能

- 全平台对话搜索
- 按平台筛选搜索结果
- 实时搜索响应

### 🌐 多平台支持

- **豆包** (doubao.com)
- **Kimi** (kimi.com / kimi.ai / kimi.moonshot.cn)
- **DeepSeek** (chat.deepseek.com)

### 🔒 平台隔离

- 各平台的文件夹和对话历史相互独立
- 在一个平台创建的文件夹不会影响其他平台

### 🎨 主题支持

- 跟随平台主题自动切换
- 浅色主题
- 深色主题

### 💾 数据管理

- 数据本地存储（IndexedDB）
- 导出数据为 JSON 备份
- 导入数据恢复

---

## 📦 安装

### Chrome / Edge

1. 下载最新的 [Release](../../releases) 或克隆本项目
2. 运行构建命令：
   ```bash
   cd ai-chat-folders
   npm install
   node scripts/build.js
   ```
3. 打开浏览器扩展管理页面：`chrome://extensions/`
4. 开启右上角的「开发者模式」
5. 点击「加载已解压的扩展程序」
6. 选择 `dist/chrome` 文件夹

### Firefox

1. 运行构建命令：
   ```bash
   node scripts/build.js
   node scripts/pack-firefox.js
   ```
2. 打开 Firefox 的 `about:debugging#/runtime/this-firefox`
3. 点击「临时载入附加组件」
4. 选择 `dist/firefox/manifest.firefox.json`

---

## 🚀 使用方法

1. 打开支持的 AI 平台页面（豆包、Kimi 或 DeepSeek）
2. 插件会自动注入到平台的侧边栏中
3. 使用文件夹整理你的对话记录

### 操作说明

| 操作         | 方法                       |
| ------------ | -------------------------- |
| 创建文件夹   | 点击头部的文件夹+按钮      |
| 重命名文件夹 | 双击文件夹名称，或右键菜单 |
| 移动对话     | 拖拽对话到目标文件夹       |
| 置顶对话     | 右键点击对话，选择「置顶」 |
| 搜索对话     | 在搜索框输入关键词         |
| 折叠面板     | 点击头部左侧的箭头按钮     |

---

## 🛠️ 开发

### 项目结构

```
ai-chat-folders/
├── assets/
│   └── icons/          # 插件图标
├── _locales/           # 国际化文件
│   ├── en/
│   └── zh_CN/
├── src/
│   ├── background/     # Service Worker
│   ├── content/        # 内容脚本
│   │   ├── adapters/   # 平台适配器
│   │   └── observers/  # DOM 监听器
│   ├── core/           # 核心模块
│   │   ├── db.js           # IndexedDB 封装
│   │   ├── folder-manager.js
│   │   ├── conversation-manager.js
│   │   ├── search-engine.js
│   │   └── settings-manager.js
│   ├── popup/          # 弹窗页面
│   ├── ui/             # UI 组件
│   │   ├── components/
│   │   ├── icons/
│   │   ├── sidebar/
│   │   └── themes/
│   └── utils/          # 工具函数
├── manifest.json       # Chrome 扩展配置
└── manifest.firefox.json  # Firefox 扩展配置
```

### 构建命令

```bash
# 构建 Chrome 版本
node scripts/build.js

# 打包 Chrome 扩展
node scripts/pack-chrome.js

# 打包 Firefox 扩展
node scripts/pack-firefox.js

# 重新生成图标
node scripts/generate-icons.js
```

### 添加新平台支持

1. 在 `src/content/adapters/` 创建新的适配器文件
2. 继承 `BaseAdapter` 类并实现必要方法
3. 在 `src/content/main.js` 中注册适配器
4. 在 `manifest.json` 中添加对应的 host_permissions

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证。

---

## 🙏 致谢

- 感谢所有支持的 AI 平台
- 感谢开源社区的支持

---

<div align="center">
  <p>如果这个项目对你有帮助，请给一个 ⭐️ 支持一下！</p>
</div>
