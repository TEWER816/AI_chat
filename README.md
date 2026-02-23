# AI Chat - 智能聊天桌面应用

一个基于 Electron + React 开发的桌面聊天应用，支持与多种 AI 模型对话。

## 功能特性

- 💬 **多会话管理** - 支持添加、编辑、删除联系人/会话
- 🤖 **多 AI 提供商支持** - 支持智谱 AI (Zhipu) 和 SiliconFlow
- 🎨 **自定义模型** - 可选择不同的 AI 模型进行对话
- 💾 **数据持久化** - 本地存储聊天记录和设置
- 🖼️ **头像支持** - 支持自定义联系人头像
- 🖥️ **桌面级体验** - 无边框窗口，支持最小化、最大化、关闭

## 技术栈

- **前端框架**: React 19
- **构建工具**: Vite 8
- **桌面框架**: Electron 40
- **编程语言**: JavaScript

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 方式1: 只启动前端开发服务器
npm run dev

# 方式2: 启动 Electron 开发模式
npm run electron:dev
```

### 构建生产版本

```bash
npm run electron:build
```

构建完成后，可执行文件位于：
- `release/AI Chat 0.0.0.exe` - 便携版
- `release/win-unpacked/AI Chat.exe` - 解压版

## 配置说明

首次使用需要配置 API Key：

1. 点击界面右上角设置按钮
2. 选择 AI 提供商（智谱 AI 或 SiliconFlow）
3. 输入对应的 API Key
4. 选择要使用的模型
5. 保存设置

### 智谱 AI

- 注册地址: https://open.bigmodel.cn
- 免费额度: 送 Token

### SiliconFlow

- 注册地址: https://siliconflow.cn
- 提供多种开源模型

## 项目结构

```
wechat/
├── src/                    # React 源代码
│   ├── App.jsx            # 主应用组件
│   ├── App.css           # 样式文件
│   ├── main.jsx          # 入口文件
│   └── index.css         # 全局样式
├── electron.cjs           # Electron 主进程
├── preload.cjs           # 预加载脚本
├── package.json          # 项目配置
└── vite.config.js        # Vite 配置
```

## 数据存储

聊天记录和设置保存在 `data/` 目录：
- `data/contacts.json` - 联系人列表
- `data/config.json` - 用户配置
- `data/avatars/` - 头像文件

## 许可证

MIT
