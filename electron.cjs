const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const DATA_DIR = path.join(__dirname, 'data')
const AVATARS_DIR = path.join(DATA_DIR, 'avatars')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
      sandbox: false,
    },
  })

  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }

  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: file: http://localhost:* https://open.bigmodel.cn https://api.siliconflow.cn https://*.siliconflow.cn;",
          "connect-src 'self' http://localhost:* https://open.bigmodel.cn https://api.siliconflow.cn https://*.siliconflow.cn ws://localhost:*;",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'unsafe-eval' http://localhost:*;",
          "style-src 'self' 'unsafe-inline' http://localhost:*;",
          "img-src 'self' data: file: blob: http://localhost:*;",
        ]
      }
    })
  })

  ipcMain.on('window-minimize', () => {
    win.minimize()
  })

  ipcMain.on('window-maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.on('window-close', () => {
    win.close()
  })

  ipcMain.on('save-messages', (event, contactId, messages) => {
    const contactDir = path.join(DATA_DIR, `${contactId}`)
    if (!fs.existsSync(contactDir)) {
      fs.mkdirSync(contactDir, { recursive: true })
    }
    const filePath = path.join(contactDir, 'messages.json')
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2))
  })

  ipcMain.on('load-messages', (event, contactId) => {
    const filePath = path.join(DATA_DIR, `${contactId}`, 'messages.json')
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      event.reply('messages-loaded', contactId, JSON.parse(data))
    } else {
      event.reply('messages-loaded', contactId, [])
    }
  })

  ipcMain.on('delete-messages', (event, contactId) => {
    const contactDir = path.join(DATA_DIR, `${contactId}`)
    if (fs.existsSync(contactDir)) {
      fs.rmSync(contactDir, { recursive: true, force: true })
    }
  })

  ipcMain.on('delete-all-messages', () => {
    if (fs.existsSync(DATA_DIR)) {
      fs.rmSync(DATA_DIR, { recursive: true, force: true })
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
  })

  const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
  const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json')

  ipcMain.on('save-config', (event, config) => {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
  })

  ipcMain.on('load-config', (event) => {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
      event.reply('config-loaded', JSON.parse(data))
    } else {
      event.reply('config-loaded', {
        apiProvider: 'zhipu',
        apiKeys: {
          zhipu: '',
          siliconflow: '',
        },
        models: {
          zhipu: 'glm-4-flash',
          siliconflow: 'deepseek-ai/DeepSeek-V3',
        },
        useCustomModels: {
          zhipu: false,
          siliconflow: false,
        },
      })
    }
  })

  ipcMain.on('save-contacts', (event, contacts) => {
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2))
  })

  ipcMain.on('load-contacts', (event) => {
    if (fs.existsSync(CONTACTS_FILE)) {
      const data = fs.readFileSync(CONTACTS_FILE, 'utf-8')
      event.reply('contacts-loaded', JSON.parse(data))
    } else {
      event.reply('contacts-loaded', [
        { id: 1, name: '通用AI助手', lastMsg: '最新消息', time: '今天', unread: 0, avatar: '', persona: '你是一个有帮助的AI助手' },
      ])
    }
  })

  ipcMain.on('save-avatar', (event, contactId, avatarPath) => {
    const destPath = path.join(AVATARS_DIR, `${contactId}${path.extname(avatarPath)}`)
    fs.copyFileSync(avatarPath, destPath)
  })

  ipcMain.on('load-avatar', (event, contactId) => {
    const exts = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    let avatarPath = null
    for (const ext of exts) {
      const p = path.join(AVATARS_DIR, `${contactId}${ext}`)
      if (fs.existsSync(p)) {
        avatarPath = p
        break
      }
    }
    if (avatarPath) {
      event.reply('avatar-loaded', contactId, avatarPath)
    } else {
      event.reply('avatar-loaded', contactId, null)
    }
  })

  ipcMain.on('delete-avatar', (event, contactId) => {
    const exts = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    for (const ext of exts) {
      const avatarPath = path.join(AVATARS_DIR, `${contactId}${ext}`)
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath)
        break
      }
    }
  })

  ipcMain.on('select-avatar-file', async (event) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
      ]
    })
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      event.reply('avatar-file-selected', filePath)
    } else {
      event.reply('avatar-file-selected', null)
    }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
